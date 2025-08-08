import { Module } from '@nestjs/common';
import { VisasService } from './visas.service';
import { VisasController } from './visas.controller';

@Module({
  controllers: [VisasController],
  providers: [VisasService],
})
export class VisasModule {}
