import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

class CreateClientDto { name!: string; remark?: string }

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService, private readonly audit: AuditService) {}

  @Get()
  list() {
    return this.clients.list();
  }

  @Post()
  async create(@Body() dto: CreateClientDto, @CurrentUser() user?: JwtUserPayload) {
    if (!dto.name?.trim()) throw new BadRequestException('name required');
    const created = await this.clients.create({ name: dto.name.trim(), remark: dto.remark });
    await this.audit.recordCreate({ userId: user?.userId, entity: 'CLIENT', entityId: created.name, after: created });
    return created;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateClientDto>, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.clients.get(id);
    const updated = await this.clients.update(id, { name: dto.name, remark: dto.remark });
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'CLIENT', entityId: updated.name, before, after: updated });
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('cascade') cascade: string | undefined, @CurrentUser() user?: JwtUserPayload) {
    const useCascade = cascade === 'true';
    const before = await this.clients.get(id);
    const deleted = await this.clients.remove(id, useCascade);
    await this.audit.recordDelete({ userId: user?.userId, entity: 'CLIENT', entityId: before?.name || id, before: { ...before, cascade: useCascade } });
    return deleted;
  }
}
