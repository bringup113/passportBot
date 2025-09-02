import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  async list(params: { q?: string; clientId?: string; billStatus?: string; page?: number; pageSize?: number }) {
    const { q, clientId, billStatus, page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    
    if (q) {
      where.client = {
        name: { contains: q, mode: 'insensitive' as const }
      };
    }
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    if (billStatus) {
      where.billStatus = billStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          client: {
            select: {
              id: true,
              name: true
            }
          },
          orders: {
            select: {
              id: true,
              customerName: true,
              passportNumber: true,
              totalAmount: true,
              totalCost: true
            }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.bill.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async get(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    // 通过 orderIds 获取关联的订单
    const orders = await this.prisma.order.findMany({
      where: {
        id: {
          in: bill.orderIds
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                costPrice: true,
                supplier: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return {
      ...bill,
      orders
    };
  }

  async create(data: { orderIds: string[] }, userId: string) {
    if (data.orderIds.length === 0) {
      throw new BadRequestException('Bill must have at least one order');
    }

    // 验证所有订单是否存在且属于同一客户
    const orders = await this.prisma.order.findMany({
      where: { id: { in: data.orderIds } },
      include: { client: true }
    });

    if (orders.length !== data.orderIds.length) {
      throw new BadRequestException('Some orders not found');
    }

    // 检查是否所有订单都属于同一客户
    const clientIds = [...new Set(orders.map(order => order.clientId))];
    if (clientIds.length > 1) {
      throw new BadRequestException('All orders must belong to the same client');
    }

    // 检查订单是否已经生成账单
    const billedOrders = orders.filter(order => order.billStatus === 'billed');
    if (billedOrders.length > 0) {
      throw new BadRequestException('Some orders have already been billed');
    }

    const clientId = clientIds[0];
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const result = await this.prisma.$transaction(async (tx) => {
      // 创建账单
      const bill = await tx.bill.create({
        data: {
          orderIds: data.orderIds,
          orderCount: data.orderIds.length,
          clientId,
          totalAmount,
          remainingAmount: totalAmount
        }
      });

      // 更新订单的账单状态
      await tx.order.updateMany({
        where: { id: { in: data.orderIds } },
        data: { billStatus: 'billed' }
      });

      return bill;
    });

    await this.audit.recordCreate({
      userId,
      entity: 'BILL',
      entityId: `账单 - ${result.orderCount}个订单`,
      after: result
    });

    return result;
  }

  async addPayment(billId: string, data: { amount: number; paymentDate: string; remark?: string }, userId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    if (data.amount > Number(bill.remainingAmount)) {
      throw new BadRequestException('Payment amount cannot exceed remaining amount');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 创建付款记录
      const payment = await tx.payment.create({
        data: {
          billId,
          amount: data.amount,
          paymentDate: new Date(data.paymentDate),
          remark: data.remark
        }
      });

      // 更新账单的已付金额和剩余金额
      const newPaidAmount = Number(bill.paidAmount) + data.amount;
      const newRemainingAmount = Number(bill.totalAmount) - newPaidAmount;
      const newBillStatus = newRemainingAmount === 0 ? 'paid' : 'partial';

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          billStatus: newBillStatus
        }
      });

      return { payment, bill: updatedBill };
    });

    await this.audit.recordCreate({
      userId,
      entity: 'PAYMENT',
      entityId: `付款记录 - $${result.payment.amount}`,
      after: result.payment
    });

    return result;
  }

  async delete(billId: string, userId: string) {
    const before = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { payments: true }
    });

    if (!before) {
      throw new NotFoundException('Bill not found');
    }

    // 检查是否有付款记录
    if (before.payments.length > 0) {
      throw new BadRequestException('该账单已有付款记录，无法删除。请先删除相关付款记录。');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 更新订单的账单状态
      await tx.order.updateMany({
        where: { id: { in: before.orderIds } },
        data: { billStatus: 'unbilled' }
      });

      // 删除账单
      return tx.bill.delete({
        where: { id: billId }
      });
    });

    await this.audit.recordDelete({
      userId,
      entity: 'BILL',
      entityId: `账单 - ${before.orderCount}个订单`,
      before
    });

    return result;
  }

  async deletePayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 删除付款记录
      await tx.payment.delete({
        where: { id: paymentId }
      });

      // 重新计算账单状态
      const remainingPayments = await tx.payment.findMany({
        where: { billId: payment.billId }
      });

      const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingAmount = Number(payment.bill.totalAmount) - totalPaid;
      const billStatus = remainingAmount === 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');

      const updatedBill = await tx.bill.update({
        where: { id: payment.billId },
        data: {
          paidAmount: totalPaid,
          remainingAmount,
          billStatus
        }
      });

      return updatedBill;
    });

    await this.audit.recordDelete({
      userId,
      entity: 'PAYMENT',
      entityId: `付款记录 - $${payment.amount}`,
      before: payment
    });

    return result;
  }
}
