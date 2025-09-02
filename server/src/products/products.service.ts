import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  async list(params: { q?: string; supplierId?: string; status?: string; page?: number; pageSize?: number }) {
    const { q, supplierId, status, page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' as const } },
        { remark: { contains: q, mode: 'insensitive' as const } }
      ];
    }
    
    if (supplierId) {
      where.supplierId = supplierId;
    }
    
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          supplier: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    // 确保 Decimal 类型正确序列化为数字
    const serializedItems = items.map(item => ({
      ...item,
      price: Number(item.price),
      costPrice: Number(item.costPrice)
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!product) {
      return null;
    }

    // 确保 Decimal 类型正确序列化为数字
    return {
      ...product,
      price: Number(product.price),
      costPrice: Number(product.costPrice)
    };
  }

  async create(data: { name: string; price: number; costPrice: number; supplierId: string; status?: string; remark?: string }, userId: string) {
    const result = await this.prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        costPrice: data.costPrice,
        supplierId: data.supplierId,
        status: data.status || 'active',
        remark: data.remark
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    await this.audit.recordCreate({
      userId,
      entity: 'PRODUCT',
      entityId: result.name,
      after: result
    });
    
    return result;
  }

  async update(id: string, data: { name: string; price: number; costPrice: number; supplierId: string; status?: string; remark?: string }, userId: string) {
    const before = await this.prisma.product.findUnique({ where: { id } });
    if (!before) throw new Error('Product not found');
    
    const result = await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        costPrice: data.costPrice,
        supplierId: data.supplierId,
        status: data.status || 'active',
        remark: data.remark
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    await this.audit.recordUpdate({
      userId,
      entity: 'PRODUCT',
      entityId: result.name,
      before,
      after: result
    });
    
    return result;
  }

  async delete(id: string, userId: string) {
    // 检查是否有订单明细关联
    const orderItemCount = await this.prisma.orderItem.count({
      where: { productId: id }
    });

    if (orderItemCount > 0) {
      throw new BadRequestException('该产品已被订单使用，无法删除。请先删除相关订单或修改订单中的产品。');
    }

    const before = await this.prisma.product.findUnique({ where: { id } });
    if (!before) throw new Error('Product not found');

    const result = await this.prisma.product.delete({
      where: { id }
    });
    
    await this.audit.recordDelete({
      userId,
      entity: 'PRODUCT',
      entityId: before.name,
      before
    });
    
    return result;
  }
}
