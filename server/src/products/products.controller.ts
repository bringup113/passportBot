import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { CurrentUser } from '../utils/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(
    @Query('q') q?: string, 
    @Query('supplierId') supplierId?: string, 
    @Query('status') status?: string, 
    @Query('page', new ParseIntPipe({ optional: true })) page?: number, 
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number
  ) {
    return this.productsService.list({ q, supplierId, status, page, pageSize });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.productsService.get(id);
  }

  @Post()
  async create(@Body() data: { name: string; price: number; costPrice: number; supplierId: string; status?: string; remark?: string }, @CurrentUser() user: any) {
    return this.productsService.create(data, user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { name: string; price: number; costPrice: number; supplierId: string; status?: string; remark?: string }, @CurrentUser() user: any) {
    return this.productsService.update(id, data, user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.delete(id, user.id);
  }
}
