import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { PassportsModule } from './passports/passports.module';
import { VisasModule } from './visas/visas.module';
import { OverdueModule } from './overdue/overdue.module';
import { AuditModule } from './audit/audit.module';
import { NotifyModule } from './notify/notify.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    PassportsModule,
    VisasModule,
    OverdueModule,
    AuditModule,
    NotifyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
