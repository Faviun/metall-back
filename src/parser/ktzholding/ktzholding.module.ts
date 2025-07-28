import { Module } from '@nestjs/common';
import { ktzholdingParserController } from './ktzholding.controller';
import { ktzholdingParserService } from './ktzholding.service';
import { GetProductsService } from 'src/database/get-products.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Module({
  controllers: [ktzholdingParserController],
  providers: [ktzholdingParserService, GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class KtzParserModule {}