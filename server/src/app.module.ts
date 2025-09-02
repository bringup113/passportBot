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
import { DashboardModule } from './dashboard/dashboard.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { BillsModule } from './bills/bills.module';

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
    DashboardModule,
    SuppliersModule,
    ProductsModule,
    OrdersModule,
    BillsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
