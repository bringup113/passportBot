import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PassportsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { q?: string; clientId?: string; days?: number; expired?: boolean }) {
    const where: any = {};
    if (params.q) {
      where.OR = [
        { passportNo: { contains: params.q, mode: 'insensitive' } },
        { fullName: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.clientId) where.clientId = params.clientId;
    if (params.expired) {
      where.expiryDate = { lte: new Date() };
    } else if (params.days) {
      const to = new Date();
      to.setDate(to.getDate() + params.days);
      where.expiryDate = { lte: to, gt: new Date() };
    }
    return this.prisma.passport.findMany({ where, orderBy: { expiryDate: 'asc' }, include: { client: true } });
  }

  async get(passportNo: string) {
    const item = await this.prisma.passport.findUnique({ where: { passportNo }, include: { client: true, visas: true } });
    if (!item) throw new NotFoundException('Passport not found');
    return item;
  }

  async create(data: {
    passportNo: string; clientId: string; country: string; fullName: string; gender: string; dateOfBirth: string; issueDate: string; expiryDate: string; inStock?: boolean; isFollowing?: boolean; remark?: string | null;
  }) {
    const exists = await this.prisma.passport.findUnique({ where: { passportNo: data.passportNo }, include: { client: true } });
    if (exists) {
      throw new ConflictException({
        code: 'PASSPORT_EXISTS',
        passportNo: data.passportNo,
        clientName: exists.client?.name,
      });
    }
    if (data.inStock === false && !data.remark?.trim()) {
      throw new BadRequestException('remark required when inStock is false');
    }
    return this.prisma.passport.create({ data: {
      passportNo: data.passportNo,
      clientId: data.clientId,
      country: data.country,
      fullName: data.fullName,
      gender: data.gender,
      dateOfBirth: new Date(data.dateOfBirth),
      issueDate: new Date(data.issueDate),
      expiryDate: new Date(data.expiryDate),
      ...(typeof data.inStock === 'boolean' ? { inStock: data.inStock } : {}),
      ...(typeof data.isFollowing === 'boolean' ? { isFollowing: data.isFollowing } : {}),
      ...(data.remark !== undefined ? { remark: data.remark } : {}),
    }});
  }

  async update(passportNo: string, data: Partial<{ country: string; fullName: string; gender: string; dateOfBirth: string; issueDate: string; expiryDate: string; inStock: boolean; isFollowing: boolean; remark: string | null }>) {
    const existing = await this.prisma.passport.findUnique({ where: { passportNo } });
    if (!existing) throw new NotFoundException('Passport not found');
    if (data.inStock === false) {
      const incomingRemark = data.remark !== undefined ? String(data.remark).trim() : undefined;
      const currentRemark = existing.remark ? String(existing.remark).trim() : '';
      if (!incomingRemark && !currentRemark) {
        throw new BadRequestException('remark required when inStock is false');
      }
    }
    return this.prisma.passport.update({ where: { passportNo }, data: {
      ...('country' in data ? { country: data.country! } : {}),
      ...('fullName' in data ? { fullName: data.fullName! } : {}),
      ...('gender' in data ? { gender: data.gender! } : {}),
      ...('dateOfBirth' in data ? { dateOfBirth: new Date(data.dateOfBirth!) } : {}),
      ...('issueDate' in data ? { issueDate: new Date(data.issueDate!) } : {}),
      ...('expiryDate' in data ? { expiryDate: new Date(data.expiryDate!) } : {}),
      ...('inStock' in data ? { inStock: !!data.inStock } : {}),
      ...('isFollowing' in data ? { isFollowing: !!data.isFollowing } : {}),
      ...('remark' in data ? { remark: data.remark ?? null } : {}),
    }});
  }

  async remove(passportNo: string) {
    await this.get(passportNo);
    return this.prisma.passport.delete({ where: { passportNo } });
  }
}
