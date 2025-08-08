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
    };
    const allow = allowMap[entity];
    if (!allow) return obj;
    const filtered: any = {};
    for (const key of allow) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) filtered[key] = obj[key];
    }
    return filtered;
  }

  recordCreate(params: { userId?: string; entity: string; entityId: string; after: any }) {
    const sanitized = this.sanitizeByEntity(params.entity, params.after);
    return this.record({ userId: params.userId, action: 'create', entity: params.entity, entityId: params.entityId, diffJson: { after: sanitized } });
  }

  recordUpdate(params: { userId?: string; entity: string; entityId: string; before: any; after: any; excludeKeys?: string[] }) {
    const excludeKeys = params.excludeKeys ?? ['updatedAt', 'createdAt'];
    const beforeFiltered = this.sanitizeByEntity(params.entity, params.before);
    const afterFiltered = this.sanitizeByEntity(params.entity, params.after);
    const changes = this.computeShallowDiff(beforeFiltered, afterFiltered, excludeKeys);
    return this.record({ userId: params.userId, action: 'update', entity: params.entity, entityId: params.entityId, diffJson: { changes } });
  }

  recordDelete(params: { userId?: string; entity: string; entityId: string; before: any }) {
    const sanitized = this.sanitizeByEntity(params.entity, params.before);
    return this.record({ userId: params.userId, action: 'delete', entity: params.entity, entityId: params.entityId, diffJson: { before: sanitized } });
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
