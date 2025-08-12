import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ctzCategories } from './ktzholding-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import { nameUnific } from 'src/utils/name-unific';
import { getExcelStreamFromDb } from 'src/utils/excel.helper';

@Injectable()
export class ktzholdingParserService {
  private readonly logger = new Logger(ktzholdingParserService.name);
  private readonly categories = ctzCategories;
  private readonly PROVIDER = 'ktzholding';
  private readonly allowedWarehouses = ['Дмитров', 'Ивантеевка'];
  private isRunning = false;
  private cancelRequested = false;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  // @Cron('50 18 * * *', { timeZone: 'Europe/Moscow' })
  // async handleCron() {
  //   this.logger.log('⏰ Запуск парсера metallotorg.ru по расписанию...');
  //   await this.fetchAllProducts();
  // }

  async fetchAllProducts(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('⚠️ Парсер уже запущен, новый запуск невозможен.');
      return;
    }

    this.isRunning = true;
    this.cancelRequested = false;

    for (const category of this.categories) {
      try {
        const products = await this.fetchCategoryProducts(category.url);

        if (!products?.length) {
          this.logger.warn(`📭 Нет товаров в категории: ${category.nameRu}`);
          continue;
        }

        const mapped = this.mapProducts(products, category.nameRu, category.nameEn);
        const validProducts = mapped.filter((p) => p.name && p.location);

        if (!validProducts.length) {
          this.logger.warn(`⚠️ Нет валидных товаров в категории: ${category.nameRu}`);
          continue;
        }

        await this.saveToDatabase(validProducts);
        this.logger.log(
          `✅ Сохранено: ${validProducts.length} шт. из категории: ${category.nameRu}`,
        );
      } catch (error) {
        this.logger.error(`❌ Ошибка парсинга категории ${category.nameRu}: ${error.message}`);
      }
    }

    this.isRunning = false;

    if (this.cancelRequested) {
      this.logger.warn('⛔ Парсер был отменён пользователем.');
    }
  }

  /** Метод для запроса отмены парсера */
  cancelParsing(): void {
    if (!this.isRunning) {
      this.logger.warn('Парсер не запущен — отменять нечего.');
      return;
    }
    this.cancelRequested = true;
    this.logger.warn('Отмена парсинга запрошена.');
  }

  private async fetchCategoryProducts(url: string): Promise<any[]> {
    const res = await axios.get(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data?.products || [];
  }

  private mapProducts(products: any[], categoryRu: string, categoryEn: string): Product[] {
    return products
      .filter((p) => this.allowedWarehouses.includes(p.prices?.[0]?.wh))
      .map((p) => {
        const priceInfo = p.prices?.[0];

        const name = p.name;
        const uName = nameUnific(name);
        const size = p.size;
        const mark = p.mark_of_steel;
        const weight = p.weight != null ? String(p.weight) : '';
        const location = priceInfo?.wh || '';
        const price1 = priceInfo.price || null;
        const link = `https://ktzholding.com/category/${categoryEn || 'unknown'}/${p.id}`;

        const today = new Date().toISOString().split('T')[0];
        const uniqueString = name + mark + price1 + link + today;

        return {
          provider: this.PROVIDER,
          category: categoryRu || '',
          name: uName.raw,
          size,
          mark,
          weight,
          location,
          price1,
          units1: 'Цена FCA, т. ₽',
          image: p.image ? `https://ktzholding.com${p.image}` : '',
          link: `https://ktzholding.com/category/${categoryEn || 'unknown'}/${p.id}`,
          description: name,
          length: p.length,
          price2: null,
          units2: '',
          price3: null,
          units3: '',
          available: true,
          uniqueString,
        };
      });
  }

  private async saveToDatabase(products: Product[]): Promise<void> {
    try {
      await this.saveProducts.saveMany(products);
    } catch (err) {
      this.logger.error(`❌ Ошибка при сохранении данных: ${err.message}`);
    }
  }

  async exportToExcelFromDb(
    provider = this.PROVIDER,
    fileName = `${provider}.xlsx`,
  ): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }

  async getExcelStream(provider: string): Promise<fs.ReadStream> {
    return getExcelStreamFromDb(this.exportToExcelFromDb.bind(this), provider);
  }
}
