import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VisasService } from './visas.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

@Controller('visas')
@UseGuards(JwtAuthGuard)
export class VisasController {
  constructor(private readonly visas: VisasService, private readonly audit: AuditService) {}

  @Get()
  list(@Query('q') q?: string, @Query('passportNo') passportNo?: string, @Query('days') days?: string, @Query('expired') expired?: string) {
    return this.visas.list({ q, passportNo, days: days ? Number(days) : undefined, expired: expired === 'true' });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.visas.get(id);
  }

  @Post()
  async create(@Body() dto: any, @CurrentUser() user?: JwtUserPayload) {
    if (!dto?.passportNo) throw new BadRequestException('passportNo required');
    const created = await this.visas.create(dto);
    await this.audit.recordCreate({ userId: user?.userId, entity: 'VISA', entityId: created.visaName, after: created });
    return created;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.visas.get(id);
    const updated = await this.visas.update(id, dto);
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'VISA', entityId: updated.visaName, before, after: updated });
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.visas.get(id);
    const deleted = await this.visas.remove(id);
    await this.audit.recordDelete({ userId: user?.userId, entity: 'VISA', entityId: before?.visaName || id, before });
    return deleted;
  }
}
