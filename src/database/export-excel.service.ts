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

  async exportToExcelFromDb(filePath: string, provider?: string | string[]): Promise<void> {
    let products: Product[];

    if (!provider) {
      // Если провайдер не указан — берем все товары
      products = await this.productsDb.getProducts();
    } else if (Array.isArray(provider)) {
      // Если передан массив провайдеров — получаем товары для каждого и объединяем
      const productsArrays = await Promise.all(provider.map((p) => this.productsDb.getProducts(p)));
      products = productsArrays.flat();
    } else {
      // Если передана одна строка — получаем товары для этого провайдера
      products = await this.productsDb.getProducts(provider);
    }

    if (products.length === 0) {
      this.logger.warn(
        `❌ Нет данных в базе для экспорта${provider ? ` по провайдеру(ам): ${Array.isArray(provider) ? provider.join(', ') : provider}` : ''}`,
      );
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
