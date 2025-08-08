import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PassportsService } from './passports.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

@Controller('passports')
@UseGuards(JwtAuthGuard)
export class PassportsController {
  constructor(private readonly passports: PassportsService, private readonly audit: AuditService) {}

  @Get()
  list(@Query('q') q?: string, @Query('clientId') clientId?: string, @Query('days') days?: string, @Query('expired') expired?: string) {
    return this.passports.list({ q, clientId, days: days ? Number(days) : undefined, expired: expired === 'true' });
  }

  @Get(':passportNo')
  get(@Param('passportNo') passportNo: string) {
    return this.passports.get(passportNo);
  }

  @Post()
  async create(@Body() dto: any, @CurrentUser() user?: JwtUserPayload) {
    if (!dto?.passportNo || !dto?.clientId) throw new BadRequestException('passportNo & clientId required');
    const created = await this.passports.create(dto);
    await this.audit.recordCreate({ userId: user?.userId, entity: 'PASSPORT', entityId: created.passportNo, after: created });
    return created;
  }

  @Patch(':passportNo')
  async update(@Param('passportNo') passportNo: string, @Body() dto: any, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.passports.get(passportNo);
    const updated = await this.passports.update(passportNo, dto);
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'PASSPORT', entityId: passportNo, before, after: updated });
    return updated;
  }

  @Delete(':passportNo')
  async remove(@Param('passportNo') passportNo: string, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.passports.get(passportNo);
    const deleted = await this.passports.remove(passportNo);
    await this.audit.recordDelete({ userId: user?.userId, entity: 'PASSPORT', entityId: passportNo, before });
    return deleted;
  }
}
