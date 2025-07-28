import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ctzCategories } from './ktzholding-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ktzholdingParserService {
  private readonly logger = new Logger(ktzholdingParserService.name);
  private readonly categories = ctzCategories;
  private readonly provider = 'ktzholding';
  private readonly allowedWarehouses = ['Дмитров', 'Ивантеевка'];

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  @Cron('50 18 * * *', { timeZone: 'Europe/Moscow' })
  async handleCron() {
    this.logger.log('⏰ Запуск парсера metallotorg.ru по расписанию...');
    await this.fetchAllProducts();
  }


  async fetchAllProducts(): Promise<void> {
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
        this.logger.log(`✅ Сохранено: ${validProducts.length} шт. из категории: ${category.nameRu}`);
      } catch (error) {
        this.logger.error(`❌ Ошибка парсинга категории ${category.nameRu}: ${error.message}`);
      }
    }
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
        return {
          provider: this.provider,
          category: categoryRu || '',
          name: p.name,
          size: p.size,
          mark: p.mark_of_steel,
          weight: p.weight != null ? String(p.weight) : null,
          location: priceInfo?.wh || null,
          price1: priceInfo?.price != null ? String(priceInfo.price) : null,
          units1: 'Цена FCA, т. ₽',
          image: p.image ? `https://ktzholding.com${p.image}` : null,
          link: `https://ktzholding.com/category/${categoryEn || 'unknown'}/${p.id}`,
          description: '',
          length: p.length,
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
