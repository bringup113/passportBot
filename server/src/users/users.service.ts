import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { username: string; passwordHash: string; isActive?: boolean }) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: { passwordHash?: string; isActive?: boolean }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
