import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BillsService } from './bills.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { CurrentUser } from '../utils/current-user.decorator';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  async list(
    @Query('q') q?: string, 
    @Query('clientId') clientId?: string, 
    @Query('billStatus') billStatus?: string, 
    @Query('page', new ParseIntPipe({ optional: true })) page?: number, 
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number
  ) {
    return this.billsService.list({ q, clientId, billStatus, page, pageSize });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.billsService.get(id);
  }

  @Post()
  async create(@Body() data: {
    orderIds: string[];
  }, @CurrentUser() user: any) {
    return this.billsService.create(data, user.id);
  }

  @Post(':id/payment')
  async addPayment(@Param('id') id: string, @Body() data: {
    amount: number;
    paymentDate: string;
    remark?: string;
  }, @CurrentUser() user: any) {
    return this.billsService.addPayment(id, data, user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.billsService.delete(id, user.id);
  }

  @Delete('payment/:paymentId')
  async deletePayment(@Param('paymentId') paymentId: string, @CurrentUser() user: any) {
    return this.billsService.deletePayment(paymentId, user.id);
  }
}
