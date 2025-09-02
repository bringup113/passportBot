import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';
import { CurrentUser } from '../utils/current-user.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async list(
    @Query('q') q?: string, 
    @Query('page', new ParseIntPipe({ optional: true })) page?: number, 
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number
  ) {
    return this.suppliersService.list({ q, page, pageSize });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.suppliersService.get(id);
  }

  @Post()
  async create(@Body() data: { name: string; remark?: string }, @CurrentUser() user: any) {
    return this.suppliersService.create(data, user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { name: string; remark?: string }, @CurrentUser() user: any) {
    return this.suppliersService.update(id, data, user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.suppliersService.delete(id, user.id);
  }
}
