import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { GetProductsService } from './get-products.service';
import { Product } from 'src/types/product.type';

@Injectable()
export class ExportExcelProductsService {
  private readonly logger = new Logger(ExportExcelProductsService.name);

  constructor(private readonly productsDb: GetProductsService) {}

  async exportToExcelFromDb(filePath: string, provider: string): Promise<void> {
  const products: Product[] = await this.productsDb.getProducts(provider);

  if (products.length === 0) {
    this.logger.warn(`❌ Нет данных в базе для экспорта по провайдеру: ${provider}`);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(products);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  XLSX.writeFile(wb, filePath);

  this.logger.log(`📁 Excel-файл сохранён: ${filePath}`);
}
}