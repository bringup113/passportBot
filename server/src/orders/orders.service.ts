import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  async list(params: { q?: string; clientId?: string; orderStatus?: string; billStatus?: string; page?: number; pageSize?: number }) {
    const { q, clientId, orderStatus, billStatus, page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' as const } },
        { passportNumber: { contains: q, mode: 'insensitive' as const } },
        { country: { contains: q, mode: 'insensitive' as const } },
        { client: { name: { contains: q, mode: 'insensitive' as const } } }
      ];
    }
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }
    
    if (billStatus) {
      where.billStatus = billStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
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
          passport: {
            select: {
              passportNo: true,
              fullName: true,
              country: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  costPrice: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.order.count({ where })
    ]);

    // 确保 Decimal 类型正确序列化为数字
    const serializedItems = items.map(item => ({
      ...item,
      totalAmount: Number(item.totalAmount),
      totalCost: Number(item.totalCost),
      orderItems: item.orderItems.map(orderItem => ({
        ...orderItem,
        salePrice: Number(orderItem.salePrice),
        costPrice: Number(orderItem.costPrice)
      }))
    }));

    return {
      items: serializedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        passport: {
          select: {
            passportNo: true,
            fullName: true,
            country: true,
            gender: true,
            dateOfBirth: true,
            issueDate: true,
            expiryDate: true
          }
        },
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

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 确保 Decimal 类型正确序列化为数字
    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      totalCost: Number(order.totalCost),
      orderItems: order.orderItems.map(orderItem => ({
        ...orderItem,
        salePrice: Number(orderItem.salePrice),
        costPrice: Number(orderItem.costPrice)
      }))
    };
  }

  async create(data: {
    passportNo: string;
    orderItems: Array<{
      productId: string;
      salePrice: number;
      costPrice: number;
      status?: string;
      remark?: string;
    }>;
    remark?: string;
  }, userId: string) {
    // 验证护照是否存在
    const passport = await this.prisma.passport.findUnique({
      where: { passportNo: data.passportNo },
      include: { client: true }
    });

    if (!passport) {
      throw new NotFoundException('Passport not found');
    }

    if (data.orderItems.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // 验证所有产品是否存在
    const productIds = data.orderItems.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found');
    }

    // 计算总金额和总成本
    const totalAmount = data.orderItems.reduce((sum, item) => sum + item.salePrice, 0);
    const totalCost = data.orderItems.reduce((sum, item) => sum + item.costPrice, 0);

    // 创建订单和订单明细
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          passportNo: data.passportNo,
          clientId: passport.clientId,
          customerName: passport.fullName,
          passportNumber: passport.passportNo,
          country: passport.country,
          totalAmount,
          totalCost,
          remark: data.remark
        }
      });

      const orderItems = await Promise.all(
        data.orderItems.map(item =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              salePrice: item.salePrice,
              costPrice: item.costPrice,
              status: item.status || 'pending',
              remark: item.remark
            }
          })
        )
      );

      return { ...order, orderItems };
    });

    await this.audit.recordCreate({
      userId,
      entity: 'ORDER',
      entityId: `订单 - ${result.customerName} (${result.passportNumber})`,
      after: result
    });

    return result;
  }

  async update(id: string, data: {
    orderItems: Array<{
      id?: string;
      productId: string;
      salePrice: number;
      costPrice: number;
      status?: string;
      remark?: string;
    }>;
    remark?: string;
  }, userId: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    if (data.orderItems.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // 验证所有产品是否存在
    const productIds = data.orderItems.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found');
    }

    // 计算总金额和总成本
    const totalAmount = data.orderItems.reduce((sum, item) => sum + item.salePrice, 0);
    const totalCost = data.orderItems.reduce((sum, item) => sum + item.costPrice, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      // 删除现有订单明细
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });

      // 创建新的订单明细
      const orderItems = await Promise.all(
        data.orderItems.map(item =>
          tx.orderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              salePrice: item.salePrice,
              costPrice: item.costPrice,
              status: item.status || 'pending',
              remark: item.remark
            }
          })
        )
      );

      // 根据业务明细状态自动计算订单状态
      let orderStatus = 'pending';
      const itemStatuses = orderItems.map(item => item.status);
      
      if (itemStatuses.every(status => status === 'completed')) {
        orderStatus = 'completed';
      } else if (itemStatuses.some(status => status === 'processing')) {
        orderStatus = 'processing';
      } else if (itemStatuses.every(status => status === 'pending')) {
        orderStatus = 'pending';
      }

      // 更新订单
      const order = await tx.order.update({
        where: { id },
        data: {
          totalAmount,
          totalCost,
          orderStatus,
          remark: data.remark
        }
      });

      return { ...order, orderItems };
    });

    await this.audit.recordUpdate({
      userId,
      entity: 'ORDER',
      entityId: `订单 - ${result.customerName} (${result.passportNumber})`,
      before: existingOrder,
      after: result
    });

    return result;
  }

  async updateStatus(id: string, orderStatus: string, userId: string) {
    const before = await this.prisma.order.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('Order not found');
    }

    const result = await this.prisma.order.update({
      where: { id },
      data: { orderStatus }
    });

    await this.audit.recordUpdate({
      userId,
      entity: 'ORDER',
      entityId: `订单 - ${result.customerName} (${result.passportNumber})`,
      before,
      after: result
    });

    return result;
  }

  async delete(id: string, userId: string) {
    const before = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    });

    if (!before) {
      throw new NotFoundException('Order not found');
    }

    // 检查是否已生成账单
    if (before.billStatus === 'billed') {
      throw new BadRequestException('该订单已生成账单，无法删除。请先删除相关账单。');
    }

    const result = await this.prisma.order.delete({
      where: { id }
    });

    await this.audit.recordDelete({
      userId,
      entity: 'ORDER',
      entityId: `订单 - ${before.customerName} (${before.passportNumber})`,
      before
    });

    return result;
  }
}
