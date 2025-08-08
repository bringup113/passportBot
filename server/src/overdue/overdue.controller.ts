import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OverdueService } from './overdue.service';
import { JwtAuthGuard } from '../utils/jwt-auth.guard';

@Controller('overdue')
@UseGuards(JwtAuthGuard)
export class OverdueController {
  constructor(private readonly overdue: OverdueService) {}

  @Get('passports')
  listPassports(@Query('days') days?: string, @Query('expired') expired?: string) {
    return this.overdue.listPassports({ days: days ? Number(days) : undefined, expired: expired === 'true' });
  }

  @Get('visas')
  listVisas(@Query('days') days?: string, @Query('expired') expired?: string) {
    return this.overdue.listVisas({ days: days ? Number(days) : undefined, expired: expired === 'true' });
  }
}
