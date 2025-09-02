import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  async list(params: { q?: string; page?: number; pageSize?: number }) {
    const { q, page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where = q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { remark: { contains: q, mode: 'insensitive' as const } }
      ]
    } : {};

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.supplier.count({ where })
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
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            costPrice: true,
            status: true
          }
        }
      }
    });
  }

  async create(data: { name: string; remark?: string }, userId: string) {
    const result = await this.prisma.supplier.create({
      data: {
        name: data.name,
        remark: data.remark
      }
    });
    
    await this.audit.recordCreate({
      userId,
      entity: 'SUPPLIER',
      entityId: result.name,
      after: result
    });
    
    return result;
  }

  async update(id: string, data: { name: string; remark?: string }, userId: string) {
    const before = await this.prisma.supplier.findUnique({ where: { id } });
    if (!before) throw new Error('Supplier not found');
    
    const result = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        remark: data.remark
      }
    });
    
    await this.audit.recordUpdate({
      userId,
      entity: 'SUPPLIER',
      entityId: result.name,
      before,
      after: result
    });
    
    return result;
  }

  async delete(id: string, userId: string) {
    // 检查是否有产品关联
    const productCount = await this.prisma.product.count({
      where: { supplierId: id }
    });

    if (productCount > 0) {
      throw new BadRequestException('该供应商下还有产品，无法删除。请先删除或转移相关产品。');
    }

    const before = await this.prisma.supplier.findUnique({ where: { id } });
    if (!before) throw new Error('Supplier not found');

    const result = await this.prisma.supplier.delete({
      where: { id }
    });
    
    await this.audit.recordDelete({
      userId,
      entity: 'SUPPLIER',
      entityId: before.name,
      before
    });
    
    return result;
  }
}
