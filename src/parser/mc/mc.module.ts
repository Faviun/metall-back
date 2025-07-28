import { Module } from '@nestjs/common';
import { McParserService } from './mc.service';
import { McParserController } from './mc.controller';
import { GetProductsService } from 'src/database/get-products.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Module({
  controllers: [McParserController],
  providers: [McParserService, GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class McParserModule {}
