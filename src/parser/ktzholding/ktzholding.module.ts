import { Module } from '@nestjs/common';
import { ParserController } from './ktzholding.controller';
import { ParserService } from './ktzholding.service';
import { GetProductsService } from 'src/database/get-products.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Module({
  controllers: [ParserController],
  providers: [ParserService, GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class KtzParserModule {}