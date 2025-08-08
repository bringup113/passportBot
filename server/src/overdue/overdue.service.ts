import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OverdueService {
  constructor(private readonly prisma: PrismaService) {}

  listPassports(params: { days?: number; expired?: boolean }) {
    const where: any = {};
    if (params.expired) {
      where.expiryDate = { lte: new Date() };
    } else if (params.days) {
      const to = new Date();
      to.setDate(to.getDate() + params.days);
      where.expiryDate = { lte: to, gt: new Date() };
    }
    return this.prisma.passport.findMany({ where, orderBy: { expiryDate: 'asc' }, include: { client: true } });
  }

  listVisas(params: { days?: number; expired?: boolean }) {
    const where: any = {};
    if (params.expired) {
      where.expiryDate = { lte: new Date() };
    } else if (params.days) {
      const to = new Date();
      to.setDate(to.getDate() + params.days);
      where.expiryDate = { lte: to, gt: new Date() };
    }
    return this.prisma.visa.findMany({ where, orderBy: { expiryDate: 'asc' }, include: { passport: true } });
  }
}
