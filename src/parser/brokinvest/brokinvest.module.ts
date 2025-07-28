import { Module } from '@nestjs/common';
import { BrokinvestParserService } from './brokinvest.service';
import { BrokinvestParserController } from './brokinvest.controller';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { GetProductsService } from 'src/database/get-products.service';

@Module({
  controllers: [BrokinvestParserController],
  providers: [
    BrokinvestParserService,
    GetProductsService,
    SaveProductsService,
    ExportExcelProductsService,
  ],
})
export class BrokinvestParserModule {}
