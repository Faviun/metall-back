import { Module } from '@nestjs/common';
import { MetallotorgParserService } from './metallotorg.service';
import { MetallotorgParserController } from './metallotorg.controller';
import { GetProductsService } from 'src/database/get-products.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Module({
  controllers: [MetallotorgParserController],
  providers: [MetallotorgParserService, GetProductsService, SaveProductsService, ExportExcelProductsService],
})
export class MetallotorgModule {}
