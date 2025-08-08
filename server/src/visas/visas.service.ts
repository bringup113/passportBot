import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisasService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { q?: string; passportNo?: string; days?: number; expired?: boolean }) {
    const where: any = {};
    if (params.q) {
      where.OR = [
        { visaName: { contains: params.q, mode: 'insensitive' } },
        { passportNo: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.passportNo) where.passportNo = params.passportNo;
    if (params.expired) {
      where.expiryDate = { lte: new Date() };
    } else if (params.days) {
      const to = new Date();
      to.setDate(to.getDate() + params.days);
      where.expiryDate = { lte: to, gt: new Date() };
    }
    return this.prisma.visa.findMany({ where, orderBy: { expiryDate: 'asc' } });
  }

  async get(id: string) {
    const item = await this.prisma.visa.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Visa not found');
    return item;
  }

  async create(data: { passportNo: string; country: string; visaName: string; expiryDate: string }) {
    const passport = await this.prisma.passport.findUnique({ where: { passportNo: data.passportNo } });
    if (!passport) throw new BadRequestException('passport not found');
    return this.prisma.visa.create({ data: {
      passportNo: data.passportNo,
      country: data.country,
      visaName: data.visaName,
      expiryDate: new Date(data.expiryDate),
    }});
  }

  async update(id: string, data: Partial<{ country: string; visaName: string; expiryDate: string }>) {
    await this.get(id);
    return this.prisma.visa.update({ where: { id }, data: {
      ...('country' in data ? { country: data.country! } : {}),
      ...('visaName' in data ? { visaName: data.visaName! } : {}),
      ...('expiryDate' in data ? { expiryDate: new Date(data.expiryDate!) } : {}),
    }});
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.visa.delete({ where: { id } });
  }
}
