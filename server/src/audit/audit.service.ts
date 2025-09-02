import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: { userId?: string; action: string; entity: string; entityId: string; diffJson?: any; ip?: string }) {
    return this.prisma.auditLog.create({ data: { ...params, diffJson: params.diffJson ?? undefined } });
  }

  private computeShallowDiff(before: any, after: any, excludeKeys: string[] = []) {
    const changes: Record<string, { from: any; to: any }> = {};
    const keys = new Set<string>([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);
    for (const key of keys) {
      if (excludeKeys.includes(key)) continue;
      const b = before ? before[key] : undefined;
      const a = after ? after[key] : undefined;
      const isDateB = b instanceof Date;
      const isDateA = a instanceof Date;
      const equal = isDateA && isDateB
        ? (b as Date).getTime() === (a as Date).getTime()
        : JSON.stringify(b) === JSON.stringify(a);
      if (!equal) changes[key] = { from: b, to: a };
    }
    return changes;
  }

  private sanitizeByEntity(entity: string, obj: any) {
    if (!obj) return obj;
    const allowMap: Record<string, string[]> = {
      USER: ['username', 'isActive'],
      CLIENT: ['name', 'remark'],
      PASSPORT: ['passportNo', 'clientId', 'country', 'fullName', 'gender', 'dateOfBirth', 'issueDate', 'expiryDate', 'inStock', 'isFollowing', 'status', 'remark'],
      VISA: ['id', 'passportNo', 'country', 'visaName', 'expiryDate', 'status'],
      NOTIFY: ['enabled', 'telegramBotToken', 'threshold15', 'threshold30', 'threshold90', 'threshold180', 'chatId', 'displayName', 'isActive'],
      SUPPLIER: ['name', 'remark'],
      PRODUCT: ['name', 'price', 'costPrice', 'supplierId', 'status', 'remark'],
      ORDER: ['passportNo', 'clientId', 'customerName', 'passportNumber', 'country', 'billStatus', 'totalAmount', 'totalCost', 'orderStatus', 'remark'],
      ORDER_ITEM: ['orderId', 'productId', 'salePrice', 'costPrice', 'status', 'remark'],
      BILL: ['orderIds', 'orderCount', 'clientId', 'totalAmount', 'paidAmount', 'remainingAmount', 'billStatus'],
      PAYMENT: ['billId', 'amount', 'paymentDate', 'remark'],
    };
    const allow = allowMap[entity];
    if (!allow) return obj;
    const filtered: any = {};
    for (const key of allow) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) filtered[key] = obj[key];
    }
    return filtered;
  }

  private generateEntityDisplayName(entity: string, obj: any): string {
    switch (entity) {
      case 'USER':
        return obj.username || obj.id;
      case 'CLIENT':
        return obj.name || obj.id;
      case 'PASSPORT':
        return `${obj.fullName || '未知'} (${obj.passportNo || obj.id})`;
      case 'VISA':
        return `${obj.visaName || '未知签证'} (${obj.country || '未知国家'})`;
      case 'NOTIFY':
        return obj.displayName || '通知设置';
      case 'SUPPLIER':
        return obj.name || obj.id;
      case 'PRODUCT':
        return obj.name || obj.id;
      case 'ORDER':
        return `订单 - ${obj.customerName || '未知客户'} (${obj.passportNumber || obj.id})`;
      case 'ORDER_ITEM':
        return `订单明细 - ${obj.productId || obj.id}`;
      case 'BILL':
        return `账单 - ${obj.orderCount || 0}个订单`;
      case 'PAYMENT':
        return `付款记录 - $${obj.amount || 0}`;
      default:
        return obj.id;
    }
  }

  recordCreate(params: { userId?: string; entity: string; entityId: string; after: any }) {
    const sanitized = this.sanitizeByEntity(params.entity, params.after);
    const displayName = this.generateEntityDisplayName(params.entity, params.after);
    return this.record({ userId: params.userId, action: 'create', entity: params.entity, entityId: displayName, diffJson: { after: sanitized } });
  }

  recordUpdate(params: { userId?: string; entity: string; entityId: string; before: any; after: any; excludeKeys?: string[] }) {
    const excludeKeys = params.excludeKeys ?? ['updatedAt', 'createdAt'];
    const beforeFiltered = this.sanitizeByEntity(params.entity, params.before);
    const afterFiltered = this.sanitizeByEntity(params.entity, params.after);
    const changes = this.computeShallowDiff(beforeFiltered, afterFiltered, excludeKeys);
    const displayName = this.generateEntityDisplayName(params.entity, params.after);
    return this.record({ userId: params.userId, action: 'update', entity: params.entity, entityId: displayName, diffJson: { changes } });
  }

  recordDelete(params: { userId?: string; entity: string; entityId: string; before: any }) {
    const sanitized = this.sanitizeByEntity(params.entity, params.before);
    const displayName = this.generateEntityDisplayName(params.entity, params.before);
    return this.record({ userId: params.userId, action: 'delete', entity: params.entity, entityId: displayName, diffJson: { before: sanitized } });
  }

  list(params: { entity?: string; entityId?: string; from?: Date; to?: Date; take?: number; skip?: number }) {
    const where: any = {
      ...(params.entity ? { entity: params.entity } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.from || params.to ? { createdAt: { gte: params.from, lte: params.to } } : {}),
    };
    return this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.take ?? 200, 500),
      skip: params.skip ?? 0,
    });
  }

  async cleanupOlderThan(before: Date) {
    const res = await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: before } } });
    return { deleted: res.count };
  }
}
