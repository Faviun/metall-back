import { Module } from '@nestjs/common';
import { GetProductsService } from './get-products.service';
import { SaveProductsService } from './save-products.service';
import { ExportExcelProductsService } from './export-excel.service';

@Module({
  providers: [GetProductsService, SaveProductsService, ExportExcelProductsService],
  exports: [GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class DatabaseModule  {}