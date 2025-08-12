import { Module } from '@nestjs/common';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { GetProductsService } from 'src/database/get-products.service';
import { EvrazController } from './evraz.controller';
import { EvrazService } from './evraz.service';

@Module({
  controllers: [EvrazController],
  providers: [EvrazService, GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class EvrazModule {}
