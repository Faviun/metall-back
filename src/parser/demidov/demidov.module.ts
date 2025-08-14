import { Module } from '@nestjs/common';
import { DemidovParserService } from './demidov.service';
import { DemidovParserController } from './demidov.controller';
import { GetProductsService } from 'src/database/get-products.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Module({
  controllers: [DemidovParserController],
  providers: [
    DemidovParserService,
    GetProductsService,
    SaveProductsService,
    ExportExcelProductsService,
  ],
})
export class DemidovParserModule {}
