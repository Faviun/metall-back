import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';

@Injectable()
export class BrokinvestParserService {
  private readonly logger = new Logger(BrokinvestParserService.name);
  private readonly BASE_URL = 'https://back.brokinvest.ru/api/v1/catalog/export/items';
  private readonly PAGE_SIZE = 100; // если нужно
  private readonly provider = 'brokinvest';

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  // @Cron('18,23 18 * * *', { timeZone: 'Europe/Moscow' })
  //   async parse() {
  //     try {
  //       this.logger.log('⏰ [DiposParser] Запуск парсинга по расписанию...');
  //       await this.fetchAndDownloadPriceList();

  //       const data = (await this.parseDownloadedFile()) || [];
  //       this.logger.log(`✅ [DiposParser] Завершено. Сохранено ${data.length} товаров.`);
  //     } catch (error) {
  //       this.logger.error(`❌ [DiposParser] Ошибка при парсинге: ${error.message}`);
  //     }
  //   }

  async fetchAllProducts(): Promise<void> {
    for (let pageNum = 1; pageNum <= 664; pageNum++) {
      try {
        const raw = await this.fetchCategoryProducts(pageNum);

        const products = this.mapProducts(raw, 'Общая категория', 'all');

        await this.saveToDatabase(products);
        this.logger.log(`✅ Сохранено: ${products.length} шт. со страницы №: ${pageNum}`);
      } catch (error) {
        this.logger.error(`❌ Ошибка парсинга страницы ${pageNum}: ${error.message}`);
      }
    }
  }

  private async fetchCategoryProducts(pageNum: number): Promise<any[]> {
    const res = await axios.get(`${this.BASE_URL}?page=${pageNum}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    return res.data?.data || [];
  }

  private mapProducts(products: any[], categoryRu: string, categoryEn: string): Product[] {
    return products.map((p) => {
      return {
        provider: this.provider,
        category: p.admin_category?.admin_sub_categories?.title || 'Другое',
        name: p.title,
        size: p.size || '12',
        mark: p.gost,
        weight: String(p.width),
        location: '',
        price1: String(p.price),
        units1: p.unit,
        image: p.image ? `https://back.brokinvest.ru/api/v1/files/>${p.files?.file}` : null,
        link: `https://www.brokinvest.ru/product/${p.staticPath}`,
        description: '',
        length: String(p.height),
        price2: '',
        units2: '',
        price3: '',
        units3: '',
        available: true,
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

  async exportToExcelFromDb(fileName = 'ktzholding.xlsx', provider = this.provider): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }
}
