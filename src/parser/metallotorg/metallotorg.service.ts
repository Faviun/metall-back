import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { metallotorgCategories } from './metallotorg-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { Cron } from '@nestjs/schedule';
import { allCategories } from 'src/utils/categories';

@Injectable()
export class MetallotorgParserService {
  private readonly logger = new Logger(MetallotorgParserService.name);
  // private readonly categories = metallotorgCategories;
  private readonly categories = allCategories;
  private readonly provider = 'metallotorg';

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  // @Cron('16,20 18 * * *', { timeZone: 'Europe/Moscow' })
  // async handleCron() {
  //   this.logger.log('⏰ Запуск парсера metallotorg.ru по расписанию...');
  //   await this.parseCategory();
  // }

  // Запуск браузера и подготовка страницы
  private async launchBrowser(): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page }> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    });

    return { browser, page };
  }

  // Парсинг одной страницы с товарами
  private async parsePage(page: puppeteer.Page, pageNum: number): Promise<Product[]> {
    const url = `https://www.metallotorg.ru/info/pricelists/moscow/${pageNum}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const hasTable = await page.$('table tbody tr');
    if (!hasTable) {
      this.logger.log(`❌ Таблица не найдена на странице ${pageNum}`);
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const categories = this.categories;
    const provider = this.provider;

    const products: Product[] = await page.evaluate(
      (categories, provider, todayStr) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows
          .filter((row) => row.querySelectorAll('td').length >= 10)
          .map((row) => {
            const cells = row.querySelectorAll('td');
            const nameLink = cells[0].querySelector('a');
            const href = nameLink?.getAttribute('href') || '';
            const name = nameLink?.textContent?.trim() || '';

            const size = cells[1]?.textContent?.trim() || '';
            const length = cells[2]?.textContent?.trim() || '';
            const mark = cells[3]?.textContent?.trim() || '';
            const weight = cells[4]?.textContent?.trim() || '';
            const location = cells[9]?.textContent?.trim() || '';
            const link = href ? `https://metallotorg.ru${href}` : '';

            const price1Str = cells[6]?.textContent?.trim() || '';
            const price2Str = cells[7]?.textContent?.trim() || '';
            const price3Str = cells[8]?.textContent?.trim() || '';

            const price1 = price1Str ? parseFloat(price1Str.replace(',', '.')) : null;
            const price2 = price2Str ? parseFloat(price2Str.replace(',', '.')) : null;
            const price3 = price3Str ? parseFloat(price3Str.replace(',', '.')) : null;

            const foundCategory = categories.find((cat) => name.includes(cat)) || 'Другое';
            const uniqueString = name + mark + price1 + link + todayStr;

            return {
              provider,
              category: foundCategory,
              name,
              size,
              length,
              mark,
              weight,
              price1,
              price2,
              price3,
              units1: 'Цена 1 - 5 т.',
              units2: 'Цена от 5 т. до 15 т.',
              units3: 'Цена > 15 т.',
              location,
              link,
              image: '',
              available: true,
              uniqueString,
            };
          });
      },
      categories,
      provider,
      today,
    );

    return products;
  }

  // Фильтрация валидных товаров
  private filterValid(products: Product[]): Product[] {
    return products.filter(
      (p) =>
        p.name &&
        ((p.price1 && !isNaN(p.price1)) ||
          (p.price2 && !isNaN(p.price2)) ||
          (p.price3 && !isNaN(p.price3))),
    );
  }

  // Универсальная функция для повторных попыток с задержкой
  private async retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 3000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Попытка ${i + 1} не удалась: ${error.message}`);
        if (i < attempts - 1) {
          this.logger.log(`Ждём ${delayMs} мс перед повтором...`);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    throw lastError;
  }

  // Основной метод парсинга всех страниц
  async parseCategory(): Promise<void> {
    const { browser, page } = await this.launchBrowser();
    let emptyPagesInRow = 0;
    const maxEmptyPages = 3;

    for (let pageNum = 1; pageNum <= 1000; pageNum++) {
      try {
        const products = await this.retry(() => this.parsePage(page, pageNum));
        if (!products.length) {
          emptyPagesInRow++;
          this.logger.log(`Пустая страница ${pageNum} (${emptyPagesInRow} подряд)`);

          if (emptyPagesInRow >= maxEmptyPages) {
            this.logger.warn(
              `Обнаружено ${maxEmptyPages} пустых страниц подряд. Парсинг остановлен.`,
            );
            break;
          }
          continue;
        }

        emptyPagesInRow = 0;

        const valid = this.filterValid(products);
        await this.saveToDatabase(valid);

        this.logger.log(`✅ Страница ${pageNum}: сохранено ${valid.length} товаров`);
      } catch (error) {
        this.logger.error(`Ошибка при парсинге страницы ${pageNum}: ${error.message}`);
      }
    }

    await browser.close();
  }

  async saveToDatabase(products: Product[]): Promise<void> {
    await this.saveProducts.saveMany(products);
  }

  // Экспорт в Excel — делегируем ExportExcelProductsService
  async exportToExcelFromDb(
    provider = this.provider,
    fileName = `${provider}.xlsx`,
  ): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }
}
