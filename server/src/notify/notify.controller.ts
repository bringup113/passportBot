import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../utils/current-user.decorator';
import type { JwtUserPayload } from '../utils/current-user.decorator';

@Controller('notify')
@UseGuards(JwtAuthGuard)
export class NotifyController {
  constructor(private readonly notify: NotifyService, private readonly audit: AuditService) {}

  @Get('setting')
  getSetting() {
    return this.notify.getSetting();
  }

  @Patch('setting')
  async updateSetting(
    @Body()
    dto: {
      enabled?: boolean;
      telegramBotToken?: string | null;
      threshold15?: boolean;
      threshold30?: boolean;
      threshold90?: boolean;
      threshold180?: boolean;
    },
    @CurrentUser() user?: JwtUserPayload,
  ) {
    const before = await this.notify.getSetting();
    const updated = await this.notify.updateSetting(dto);
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'NOTIFY', entityId: updated.id, before, after: updated });
    return updated;
  }

  @Get('whitelist')
  listWhitelist() {
    return this.notify.listWhitelist();
  }

  @Post('whitelist')
  async addWhitelist(@Body() dto: { chatId: string; displayName?: string }, @CurrentUser() user?: JwtUserPayload) {
    const created = await this.notify.addWhitelist(dto);
    await this.audit.recordCreate({ userId: user?.userId, entity: 'NOTIFY', entityId: `whitelist:${created.id}`, after: created });
    return created;
  }

  @Patch('whitelist/:id')
  async updateWhitelist(@Param('id') id: string, @Body() dto: { displayName?: string; isActive?: boolean }, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.notify.getWhitelistById(id);
    const updated = await this.notify.updateWhitelist(id, dto);
    await this.audit.recordUpdate({ userId: user?.userId, entity: 'NOTIFY', entityId: `whitelist:${id}`, before, after: updated });
    return updated;
  }

  @Delete('whitelist/:id')
  async removeWhitelist(@Param('id') id: string, @CurrentUser() user?: JwtUserPayload) {
    const before = await this.notify.getWhitelistById(id);
    const res = await this.notify.removeWhitelist(id);
    if (before) await this.audit.recordDelete({ userId: user?.userId, entity: 'NOTIFY', entityId: `whitelist:${id}`, before });
    return res;
  }

  @Post('test-bot')
  testBot(@Body() dto: { token: string }) {
    return this.notify.testTelegramBot(dto.token);
  }

  @Post('whitelist/sync')
  async syncWhitelist(@Body() dto: { token?: string }, @CurrentUser() user?: JwtUserPayload) {
    const result = await this.notify.syncWhitelistFromUpdates(dto?.token);
    await this.audit.recordCreate({ userId: user?.userId, entity: 'NOTIFY', entityId: 'whitelist:sync', after: result });
    return result;
  }

  @Post('run-now')
  runNow() {
    return this.notify.runDailyNotifications();
  }
}


