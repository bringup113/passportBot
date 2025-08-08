import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { id: user.id, username: user.username };
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    const token = await this.jwt.signAsync({ sub: user.id, username: user.username });
    return { token };
  }
}
