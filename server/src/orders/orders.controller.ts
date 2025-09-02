import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { CurrentUser } from '../utils/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(
    @Query('q') q?: string, 
    @Query('clientId') clientId?: string, 
    @Query('orderStatus') orderStatus?: string, 
    @Query('billStatus') billStatus?: string, 
    @Query('page', new ParseIntPipe({ optional: true })) page?: number, 
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number
  ) {
    return this.ordersService.list({ q, clientId, orderStatus, billStatus, page, pageSize });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.ordersService.get(id);
  }

  @Post()
  async create(@Body() data: {
    passportNo: string;
    orderItems: Array<{
      productId: string;
      salePrice: number;
      costPrice: number;
      status?: string;
      remark?: string;
    }>;
    remark?: string;
  }, @CurrentUser() user: any) {
    return this.ordersService.create(data, user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: {
    orderItems: Array<{
      id?: string;
      productId: string;
      salePrice: number;
      costPrice: number;
      status?: string;
      remark?: string;
    }>;
    remark?: string;
  }, @CurrentUser() user: any) {
    return this.ordersService.update(id, data, user.id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() data: { orderStatus: string }, @CurrentUser() user: any) {
    return this.ordersService.updateStatus(id, data.orderStatus, user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.delete(id, user.id);
  }
}
