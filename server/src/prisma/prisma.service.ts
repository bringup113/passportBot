import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    // @ts-ignore Prisma event name string type narrowing in generated client
    this.$on('beforeExit' as any, async () => {
      await app.close();
    });
  }
}
