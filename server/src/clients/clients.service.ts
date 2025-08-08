import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: { name: string; remark?: string }) {
    const exists = await this.prisma.client.findUnique({ where: { name: data.name } });
    if (exists) throw new BadRequestException('Client name already exists');
    return this.prisma.client.create({ data });
  }

  async remove(id: string, cascade: boolean) {
    if (!cascade) {
      const passports = await this.prisma.passport.count({ where: { clientId: id } });
      if (passports > 0) {
        const visas = await this.prisma.visa.count({ where: { passport: { clientId: id } } });
        throw new ConflictException({ code: 'NEED_CONFIRM', passports, visas });
      }
    }
    return this.prisma.client.delete({ where: { id } });
  }

  async update(id: string, data: { name?: string; remark?: string }) {
    if (data.name) {
      const exists = await this.prisma.client.findUnique({ where: { name: data.name } });
      if (exists && exists.id !== id) throw new BadRequestException('Client name already exists');
    }
    return this.prisma.client.update({ where: { id }, data });
  }

  get(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }
}
