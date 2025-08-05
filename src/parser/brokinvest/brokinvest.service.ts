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
    let pageNum = 1;
    let totalSaved = 0;

    while (true) {
      try {
        const raw = await this.fetchCategoryProducts(pageNum);

        if (!raw.length) {
          this.logger.log(`🛑 Парсинг завершён. Страница ${pageNum} пуста.`);
          break;
        }

        const products = this.mapProducts(raw)
          // ✅ фильтруем товары без цены или категорий
          .filter(
            (p) =>
              p.price1 && !isNaN(Number(p.price1)) && Number(p.price1) > 0 && p.category !== '',
          );

        if (products.length === 0) {
          this.logger.warn(`⚠️ Страница ${pageNum} — все товары без цены или категории.`);
        } else {
          await this.saveToDatabase(products);
          this.logger.log(`✅ Сохранено: ${products.length} шт. со страницы №: ${pageNum}`);
          totalSaved += products.length;
        }

        pageNum++;
      } catch (error) {
        this.logger.error(`❌ Ошибка парсинга страницы ${pageNum}: ${error.message}`);
        break; // можно продолжать или выйти — зависит от задачи
      }
    }

    this.logger.log(`🏁 Всего сохранено товаров: ${totalSaved}`);
  }

  private async fetchCategoryProducts(pageNum: number): Promise<any[]> {
    const res = await axios.get(`${this.BASE_URL}?page=${pageNum}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    return res.data?.data || [];
  }

  private mapProducts(products: any[]): Product[] {
    return products.map((p) => {
      const name = p.title || '';
      const mark = p.gost || '';
      const price1 = p.price || null;
      const location = String(p.stockId) || ''; // 5 - СК Октябрьский 24 - Воронеж

      const today = new Date().toISOString().split('T')[0];
      const uniqueString = name + mark + price1 + today;

      return {
        provider: this.provider,
        category: p.admin_sub_categories?.[0]?.title || '',
        name,
        size: p.size || '',
        mark,
        weight: String(p.width),
        location,
        price1,
        units1: p.unit,
        image: p.files?.[0]?.file
          ? `https://back.brokinvest.ru/api/v1/files/${p.files?.[0]?.file}`
          : '',
        link: p.staticPath ? `https://www.brokinvest.ru/product/${p.staticPath}` : '',
        description: '',
        length: String(p.height),
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

  async exportToExcelFromDb(fileName = 'ktzholding.xlsx', provider = this.provider): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }
}
