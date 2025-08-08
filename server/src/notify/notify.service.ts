import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotifyService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting() {
    const setting = await this.prisma.notifySetting.findFirst();
    return setting ?? (await this.prisma.notifySetting.create({ data: {} }));
  }

  async updateSetting(dto: {
    enabled?: boolean;
    telegramBotToken?: string | null;
    threshold15?: boolean;
    threshold30?: boolean;
    threshold90?: boolean;
    threshold180?: boolean;
  }) {
    const setting = await this.getSetting();
    return this.prisma.notifySetting.update({ where: { id: setting.id }, data: dto });
  }

  listWhitelist() {
    return this.prisma.telegramWhitelist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  getWhitelistById(id: string) {
    return this.prisma.telegramWhitelist.findUnique({ where: { id } });
  }

  async addWhitelist(dto: { chatId: string; displayName?: string }) {
    return this.prisma.telegramWhitelist.create({ data: { chatId: dto.chatId, displayName: dto.displayName } });
  }

  async updateWhitelist(id: string, dto: { displayName?: string; isActive?: boolean }) {
    try {
      return await this.prisma.telegramWhitelist.update({ where: { id }, data: dto });
    } catch (e) {
      throw new NotFoundException('whitelist not found');
    }
  }

  async removeWhitelist(id: string) {
    try {
      await this.prisma.telegramWhitelist.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      throw new NotFoundException('whitelist not found');
    }
  }

  async testTelegramBot(token: string) {
    if (!token || token.length < 20) {
      return { ok: false, message: 'Token 格式看起来不正确' };
    }
    const targets = await this.prisma.telegramWhitelist.findMany({ where: { isActive: true } });
    if (!targets.length) {
      return { ok: false, message: '没有启用的白名单，无法发送测试消息' };
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const text = '测试通知：如果你看到这条消息，说明机器人可正常发送。';
    console.log(`[Notify][test-bot] start, targets=${targets.length}`);
    const results = await Promise.all(
      targets.map(async (t) => {
        try {
          const body = { chat_id: t.chatId, text };
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          const raw = await resp.text();
          let data: any = undefined;
          try { data = raw ? JSON.parse(raw) : undefined; } catch (_) { /* ignore */ }
          if (resp.ok && data?.ok) {
            console.log(`[Notify][test-bot] sent -> chatId=${t.chatId}`);
            return { chatId: t.chatId, ok: true };
          }
          const errorMsg = (data?.description || raw || `HTTP ${resp.status}`);
          console.error(`[Notify][test-bot] failed -> chatId=${t.chatId}, status=${resp.status}, body=${errorMsg}`);
          return { chatId: t.chatId, ok: false, error: errorMsg };
        } catch (e: any) {
          console.error(`[Notify][test-bot] error -> chatId=${t.chatId}`, e);
          return { chatId: t.chatId, ok: false, error: e?.message || String(e) };
        }
      }),
    );
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    console.log(`[Notify][test-bot] done, sent=${sent}, failed=${failed}`);
    return { ok: failed === 0, sent, failed, total: results.length, results };
  }

  async syncWhitelistFromUpdates(token?: string) {
    const setting = await this.getSetting();
    const botToken = token || setting.telegramBotToken;
    if (!botToken) return { ok: false, message: '未配置 Bot Token' };
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const resp = await fetch(url);
    const raw = await resp.text();
    let data: any = undefined;
    try { data = raw ? JSON.parse(raw) : undefined; } catch (_) {}
    if (!resp.ok || !data?.ok) {
      return { ok: false, message: data?.description || raw || `HTTP ${resp.status}` };
    }
    const updates: any[] = data.result || [];
    const chats: { id: string; displayName?: string }[] = [];
    for (const u of updates) {
      const chat = u?.message?.chat || u?.channel_post?.chat || u?.my_chat_member?.chat || u?.chat_member?.chat || u?.edited_message?.chat;
      if (!chat || typeof chat.id === 'undefined') continue;
      const id = String(chat.id);
      const displayName = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || (chat.username ? `@${chat.username}` : undefined);
      if (!chats.find((c) => c.id === id)) chats.push({ id, displayName });
    }
    let created = 0;
    for (const c of chats) {
      const existed = await this.prisma.telegramWhitelist.findUnique({ where: { chatId: c.id } });
      if (existed) {
        // 仅在没有显示名时补充
        if (!existed.displayName && c.displayName) {
          await this.prisma.telegramWhitelist.update({ where: { id: existed.id }, data: { displayName: c.displayName } });
        }
      } else {
        await this.prisma.telegramWhitelist.create({ data: { chatId: c.id, displayName: c.displayName, isActive: false } });
        created += 1;
      }
    }
    return { ok: true, total: chats.length, created };
  }
}


