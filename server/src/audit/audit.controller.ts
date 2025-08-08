import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.audit.list({
      entity,
      entityId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Post('cleanup')
  async cleanup(@Body() body: { days: number }, @CurrentUser() user?: JwtUserPayload) {
    const days = Number(body?.days || 0);
    if (!days || days < 0) return { deleted: 0 };
    const before = new Date();
    before.setDate(before.getDate() - days);
    const result = await this.audit.cleanupOlderThan(before);
    const op = `cleanup${days}`;
    await this.audit.recordCreate({ userId: user?.userId, entity: 'AUDIT', entityId: op, after: { days, deleted: result.deleted } });
    return result;
  }
}
