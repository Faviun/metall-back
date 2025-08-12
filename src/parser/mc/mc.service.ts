import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import { mcCategories } from './mc-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { getExcelStreamFromDb } from 'src/utils/excel.helper';
import { allCategories } from 'src/utils/categories';
import { nameUnific } from 'src/utils/name-unific';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const STREAM_LIMIT = 1; // Кол-во потоков

async function retryPageGoto(
  page: puppeteer.Page,
  url: string,
  options: puppeteer.WaitForOptions = {},
  retries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', ...options });
      return;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`⏳ Попытка ${attempt} не удалась. Повтор через 3 секунды... URL: ${url}`);
        await sleep(3000 + Math.random() * 2000);
      } else {
        throw new Error(`❌ Не удалось загрузить страницу после ${retries} попыток: ${url}`);
      }
    }
  }
}

@Injectable()
export class McParserService {
  private readonly logger = new Logger(McParserService.name);
  private readonly mcCategories = mcCategories;
  private readonly categories = allCategories;
  private readonly PROVIDER = 'mc';
  private isRunning = false;
  private cancelRequested = false;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  /** Запрос отмены парсера */
  cancelParsing(): void {
    if (!this.isRunning) {
      this.logger.warn('Парсер не запущен — отменять нечего.');
      return;
    }
    this.cancelRequested = true;
    this.logger.warn('Отмена парсинга запрошена.');
  }

  /** Парсинг одной категории (исходная логика, с исправлениями отмены/закрытия браузера) */
  async parseCategory(url: string, category: string): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('⚠️ Парсер уже запущен, новый запуск невозможен.');
      return;
    }

    this.isRunning = true;
    // не трогаем cancelRequested здесь, чтобы вызов из parseAll мог задавать флаг до начала,
    // но если вызывается напрямую — очищаем
    this.cancelRequested = false;

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      );
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      });

      const seenFirstItems = new Set<string>();

      // Основной цикл по страницам (1..1000)
      for (let pageNum = 1; pageNum <= 1000; pageNum++) {
        // Проверка отмены перед загрузкой страницы
        if (this.cancelRequested) {
          this.logger.warn('⛔ Парсинг отменён пользователем перед загрузкой страницы.');
          throw new Error('Парсинг отменён');
        }

        const pageUrl = `${url}${pageNum}`;
        await retryPageGoto(page, pageUrl);

        try {
          await page.waitForSelector('tr[data-nm]', { timeout: 10000 });
        } catch {
          this.logger.warn(`Нет данных на странице ${pageNum} категории ${category}`);
          break;
        }

        const rawProducts: Product[] = await page.evaluate(
          (category, provider) => {
            const rows = Array.from(document.querySelectorAll('tr[data-nm]'));
            return rows.map((row) => {
              const name = row.getAttribute('data-nm')?.trim() || '';
              const size = row.querySelector('td._razmer')?.textContent?.trim() || '';
              const mark = row.querySelector('td._mark')?.textContent?.trim() || '';
              const length = row.querySelector('td._dlina')?.textContent?.trim() || '';
              const location = row.querySelector('td._fact')?.textContent?.trim() || '';
              const price1 =
                +(row.querySelector('td._ost')?.textContent?.replace(/\s+/g, '') || 0) || null;
              const price2 =
                +(row.querySelector('meta[itemprop="price"]')?.getAttribute('content') || 0) ||
                null;

              const unit1Element = document.querySelector('li.excludeMobile.ost a.catalogFilter');
              const unit1Label = unit1Element?.childNodes[0]?.textContent?.trim() || '';
              const unit1Range =
                unit1Element?.querySelector('span.categoryGroup')?.textContent?.trim() || '';
              const units1 = `${unit1Label} ${unit1Range}`.replace(/\s+/g, ' ').trim();

              const unit2Element =
                document.querySelector('li._price._center a.catalogFilter') ||
                document.querySelector('li.excludeMobile a.catalogFilter');
              const unit2Label = unit2Element?.childNodes[0]?.textContent?.trim() || '';
              const unit2Range =
                unit2Element?.querySelector('span.categoryGroup')?.textContent?.trim() || '';
              const units2 = `${unit2Label} ${unit2Range}`.replace(/\s+/g, ' ').trim();

              const imgRelative = row.querySelector('img.Picture')?.getAttribute('src') || '';
              const image = imgRelative ? `https://mc.ru${imgRelative}` : '';
              const available = !row.querySelector('button.catIcon._phone._bas');
              const href = row.querySelector('a')?.getAttribute('href') || '';
              const link = href ? `https://mc.ru${href}` : '';

              const today = new Date().toISOString().split('T')[0];
              const uniqueString = name + mark + price1 + link + today;

              return {
                provider,
                category,
                name,
                size,
                mark,
                length,
                location,
                price1,
                price2,
                units1,
                units2,
                available,
                image,
                link,
                weight: '',
                price3: null,
                units3: '',
                uniqueString,
                description: name || '',
              };
            });
          },
          category,
          this.PROVIDER,
        );

        // Обрабатываем унификацию уже в Node.js (как у тебя было)
        const products = rawProducts.map((p) => {
          const uName = nameUnific(p.name);
          const foundCategory = this.categories.find((cat) => p.name.includes(cat)) || 'Другое';
          return {
            ...p,
            name: uName.raw || p.name,
            category: foundCategory,
          };
        });

        if (products.length === 0) {
          this.logger.log(`Страница ${pageNum} пуста, останавливаемся.`);
          break;
        }

        const firstKey = `${products[0].name}|${products[0].mark}|${products[0].length}|${products[0].link}`;
        if (seenFirstItems.has(firstKey)) {
          this.logger.log(`Страница ${pageNum} дублирует предыдущую, останавливаемся.`);
          break;
        }

        seenFirstItems.add(firstKey);

        const valid = products.filter(
          (p) =>
            p.name &&
            ((p.price1 && !isNaN(p.price1)) || (p.price2 && !isNaN(p.price2))) &&
            p.available === true,
        );

        if (valid.length > 0) {
          await this.saveToDatabase(valid);
          this.logger.log(
            `✅ [${category}] Сохранено товаров со страницы ${pageNum}: ${valid.length}`,
          );
        } else {
          this.logger.warn(`⚠️ [${category}] Нет валидных товаров на странице ${pageNum}`);
        }

        // Проверка отмены после обработки страницы (чтобы остановиться быстрее)
        if (this.cancelRequested) {
          this.logger.warn('⛔ Парсинг отменён пользователем после обработки страницы.');
          throw new Error('Парсинг отменён');
        }

        await sleep(1000 + Math.random() * 2000);
      } // конец for pageNum
    } catch (err: any) {
      if (err && err.message === 'Парсинг отменён') {
        this.logger.warn('🚫 Парсер был остановлен пользователем.');
      } else {
        this.logger.error(`❌ Ошибка в категории ${category}: ${err?.message || err}`);
      }
    } finally {
      // всегда закрываем браузер и сбрасываем флаг isRunning
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // игнорируем ошибки при закрытии
        }
      }
      this.isRunning = false;

      if (this.cancelRequested) {
        this.logger.warn('⛔ Парсер был отменён пользователем.');
      }
    }
  }

  async parseAll(): Promise<void> {
    const queue = [...this.mcCategories];
    const active: Promise<void>[] = [];

    const runNext = async () => {
      // если отменено — не запускаем следующую
      if (this.cancelRequested) return;

      if (queue.length === 0) return;

      const cat = queue.shift();
      if (!cat) return;

      this.logger.log(`▶️ Начинаем парсинг категории: ${cat.name}`);
      try {
        await this.parseCategory(cat.url, cat.name);
        // если отмена произошла внутри parseCategory — выйдем
        if (this.cancelRequested) return;
        await sleep(2000 + Math.random() * 3000);
      } catch (e: any) {
        // если это отмена — просто прекратим дальнейшие шаги
        if (e && e.message === 'Парсинг отменён') {
          this.logger.warn(`Парсинг прерван в категории ${cat.name}`);
          return;
        }
        this.logger.error(`❌ Ошибка в категории ${cat.name}: ${e?.message || e}`);
      }

      // продолжаем с следующей в очереди (рекурсивно)
      await runNext();
    };

    for (let i = 0; i < STREAM_LIMIT; i++) {
      active.push(runNext());
    }

    await Promise.all(active);
  }

  async saveToDatabase(products: Product[]): Promise<void> {
    await this.saveProducts.saveMany(products);
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
