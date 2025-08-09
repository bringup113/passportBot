import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ExpiryBuckets = {
  expired: number;
  le15: number;
  le30: number;
  le90: number;
  le180: number;
  gt180: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDate(date = new Date()) {
    return new Date(date);
  }

  private getBoundaries() {
    const now = this.buildDate();
    const d15 = this.buildDate(); d15.setDate(d15.getDate() + 15);
    const d30 = this.buildDate(); d30.setDate(d30.getDate() + 30);
    const d90 = this.buildDate(); d90.setDate(d90.getDate() + 90);
    const d180 = this.buildDate(); d180.setDate(d180.getDate() + 180);
    return { now, d15, d30, d90, d180 };
  }

  private async computePassportBuckets(): Promise<ExpiryBuckets> {
    const { now, d15, d30, d90, d180 } = this.getBoundaries();
    const [expired, le15, le30, le90, le180, gt180] = await Promise.all([
      this.prisma.passport.count({ where: { expiryDate: { lte: now } } }),
      this.prisma.passport.count({ where: { expiryDate: { gt: now, lte: d15 } } }),
      this.prisma.passport.count({ where: { expiryDate: { gt: d15, lte: d30 } } }),
      this.prisma.passport.count({ where: { expiryDate: { gt: d30, lte: d90 } } }),
      this.prisma.passport.count({ where: { expiryDate: { gt: d90, lte: d180 } } }),
      this.prisma.passport.count({ where: { expiryDate: { gt: d180 } } }),
    ]);
    return { expired, le15, le30, le90, le180, gt180 };
  }

  private async computeVisaBuckets(): Promise<ExpiryBuckets> {
    const { now, d15, d30, d90, d180 } = this.getBoundaries();
    const [expired, le15, le30, le90, le180, gt180] = await Promise.all([
      this.prisma.visa.count({ where: { expiryDate: { lte: now } } }),
      this.prisma.visa.count({ where: { expiryDate: { gt: now, lte: d15 } } }),
      this.prisma.visa.count({ where: { expiryDate: { gt: d15, lte: d30 } } }),
      this.prisma.visa.count({ where: { expiryDate: { gt: d30, lte: d90 } } }),
      this.prisma.visa.count({ where: { expiryDate: { gt: d90, lte: d180 } } }),
      this.prisma.visa.count({ where: { expiryDate: { gt: d180 } } }),
    ]);
    return { expired, le15, le30, le90, le180, gt180 };
  }

  async getSummary() {
    const now = new Date();
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d90 = new Date(); d90.setDate(d90.getDate() + 90);

    const [
      totalClients,
      totalPassports,
      totalVisas,
      passportsInStock,
      passportsFollowing,
      passportsExpired,
      visasExpired,
      notifySetting,
      whitelistActiveCount,
      expiryBucketsPassports,
      expiryBucketsVisas,
      // top clients in next 90 days (passport + visa due)
      topClientsPassport,
      topClientsVisa,
      // reminders (following within 30 days)
      reminderPassports,
      reminderVisas,
      // recent audits
      recentAudits,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.passport.count(),
      this.prisma.visa.count(),
      this.prisma.passport.count({ where: { inStock: true } }),
      this.prisma.passport.count({ where: { isFollowing: true } }),
      this.prisma.passport.count({ where: { expiryDate: { lte: now } } }),
      this.prisma.visa.count({ where: { expiryDate: { lte: now } } }),
      this.prisma.notifySetting.findFirst(),
      this.prisma.telegramWhitelist.count({ where: { isActive: true } }),
      this.computePassportBuckets(),
      this.computeVisaBuckets(),
      this.prisma.passport.groupBy({
        by: ['clientId'],
        where: { expiryDate: { gt: now, lte: d90 } },
        _count: { clientId: true },
        orderBy: { _count: { clientId: 'desc' } },
        take: 5,
      }),
      this.prisma.visa.groupBy({
        by: ['passportNo'],
        where: { expiryDate: { gt: now, lte: d90 } },
        _count: { passportNo: true },
      }),
      this.prisma.passport.findMany({
        where: { isFollowing: true, expiryDate: { gt: now, lte: d30 } },
        select: { passportNo: true, expiryDate: true, fullName: true, client: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
      this.prisma.visa.findMany({
        where: { expiryDate: { gt: now, lte: d30 }, passport: { isFollowing: true } },
        select: { id: true, passportNo: true, visaName: true, country: true, expiryDate: true },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
      this.prisma.auditLog.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // 合并签证 due 至各 clientId（需要由 passportNo -> clientId 映射）
    const visaDueByClientId: Record<string, number> = {};
    if (topClientsVisa.length > 0) {
      const passportNos = topClientsVisa.map((g) => g.passportNo);
      const passports = await this.prisma.passport.findMany({
        where: { passportNo: { in: passportNos } },
        select: { passportNo: true, clientId: true },
      });
      const map = new Map(passports.map((p) => [p.passportNo, p.clientId]));
      for (const g of topClientsVisa) {
        const cid = map.get(g.passportNo);
        if (!cid) continue;
        visaDueByClientId[cid] = (visaDueByClientId[cid] || 0) + g._count.passportNo;
      }
    }

    // 汇总 Top 客户（分别统计护照与签证到期数量）
    const clientIdsFromPassports = topClientsPassport.map((g) => g.clientId);
    const clientIdsFromVisas = Object.keys(visaDueByClientId);
    const allClientIds = Array.from(new Set([...clientIdsFromPassports, ...clientIdsFromVisas]));
    const clients = await this.prisma.client.findMany({
      where: { id: { in: allClientIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(clients.map((c) => [c.id, c.name]));
    const topClients90d = allClientIds
      .map((cid) => {
        const passportDue = (topClientsPassport.find((g) => g.clientId === cid)?._count.clientId) || 0;
        const visaDue = visaDueByClientId[cid] || 0;
        const totalDue = passportDue + visaDue;
        return { clientId: cid, clientName: nameById.get(cid) || cid, passportDue, visaDue, totalDue };
      })
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, 5);

    return {
      counts: {
        totalClients,
        totalPassports,
        totalVisas,
        passportsInStock,
        passportsFollowing,
        passportsExpired,
        visasExpired,
        notify: { enabled: !!notifySetting?.enabled, whitelistActiveCount },
      },
      expiryBuckets: {
        passports: expiryBucketsPassports,
        visas: expiryBucketsVisas,
      },
      topClients90d,
      reminders: {
        passports: reminderPassports.map((p) => ({ passportNo: p.passportNo, clientName: p.client?.name, fullName: p.fullName, expiryDate: p.expiryDate })),
        visas: reminderVisas,
      },
      recentAudits,
    };
  }
}


