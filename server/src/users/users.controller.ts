import { Body, Controller, Get, Patch, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

class CreateUserDto {
  username!: string;
  password!: string;
  isActive?: boolean;
}

class UpdateUserDto {
  password?: string;
  isActive?: boolean;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService, private readonly audit: AuditService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user?: JwtUserPayload) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.users.create({ username: dto.username, passwordHash, isActive: dto.isActive ?? true });
    await this.audit.recordCreate({ userId: user?.userId, entity: 'USER', entityId: created.username, after: { id: created.id, username: created.username, isActive: created.isActive } });
    return created;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user?: JwtUserPayload) {
    const update: any = {};
    if (typeof dto.isActive === 'boolean') update.isActive = dto.isActive;
    if (dto.password) update.passwordHash = await bcrypt.hash(dto.password, 10);
    const before = await this.users.findOne(id);
    const updated = await this.users.update(id, update);
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'USER', entityId: updated.username, before, after: { id: updated.id, username: updated.username, isActive: updated.isActive } });
    return updated;
  }
}
