import { Module } from '@nestjs/common';
import { ExcelService } from './dipos.service';
import { ExcelController } from './dipos.controller';

@Module({
  controllers: [ExcelController],
  providers: [ExcelService],
})
export class DiposModule {}
