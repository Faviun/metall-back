import { Module } from '@nestjs/common';
import { DiposParserController } from './dipos.controller';
import { DiposParserService } from './dipos.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { GetProductsService } from 'src/database/get-products.service';

@Module({
  controllers: [DiposParserController],
  providers: [
    DiposParserService,
    GetProductsService,
    SaveProductsService,
    ExportExcelProductsService,
  ],
})
export class DiposParserModule {}
