import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { metallotorgCategories } from './metallotorg-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';

@Injectable()
export class MetallotorgParserService {
  private readonly logger = new Logger(MetallotorgParserService.name);
  private readonly categories = metallotorgCategories;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  // Запуск браузера и подготовка страницы
  private async launchBrowser(): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page }> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
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

    const products: Product[] = await page.evaluate((categories) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows
        .filter(row => row.querySelectorAll('td').length >= 10)
        .map(row => {
          const cells = row.querySelectorAll('td');
          const nameLink = cells[0].querySelector('a');
          const href = nameLink?.getAttribute('href') || '';
          const name = nameLink?.textContent?.trim() || '';

          let category = '';
          for (const item of categories) {
            if (name.toLowerCase().includes(item.name.toLowerCase())) {
              category = item.category;
              break;
            }
          }

          return {
            provider: 'metallotorg',
            category,
            name,
            size: cells[1]?.textContent?.trim() || '',
            length: cells[2]?.textContent?.trim() || '',
            mark: cells[3]?.textContent?.trim() || '',
            weight: cells[4]?.textContent?.trim() || '',
            price1: cells[6]?.textContent?.trim() || '',
            price2: cells[7]?.textContent?.trim() || '',
            price3: cells[8]?.textContent?.trim() || '',
            units1: 'Цена 1 - 5 т.',
            units2: 'Цена от 5 т. до 15 т.',
            units3: 'Цена > 15 т.',
            location: cells[9]?.textContent?.trim() || '',
            link: href ? `https://metallotorg.ru${href}` : '',
            image: null,
            available: null,
          };
        });
    }, this.categories);

    return products;
  }

  // Фильтрация валидных товаров
  private filterValid(products: Product[]): Product[] {
    return products.filter(p =>
      p.name &&
      (
        (p.price1 && !isNaN(parseFloat(p.price1))) ||
        (p.price2 && !isNaN(parseFloat(p.price2))) ||
        (p.price3 && !isNaN(parseFloat(p.price3)))
      )
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
          await new Promise(r => setTimeout(r, delayMs));
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
            this.logger.warn(`Обнаружено ${maxEmptyPages} пустых страниц подряд. Парсинг остановлен.`);
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
  async exportToExcelFromDb(fileName = 'metallotorg.xlsx', provider = 'metallotorg'): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }
}