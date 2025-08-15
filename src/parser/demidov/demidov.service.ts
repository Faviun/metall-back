import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import { demidovCategories } from './demidov-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { getExcelStreamFromDb } from 'src/utils/excel.helper';

@Injectable()
export class DemidovParserService {
  private readonly logger = new Logger(DemidovParserService.name);
  private readonly demidovCategories = demidovCategories;
  private readonly PROVIDER = 'demidov';
  private isRunning = false;
  private cancelRequested = false;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  cancelParsing(): void {
    if (!this.isRunning) {
      this.logger.warn('Парсер не запущен — отменять нечего.');
      return;
    }
    this.cancelRequested = true;
    this.logger.warn('Отмена парсинга запрошена.');
  }

  /** Парсинг всех категорий */
  async parse() {
    this.isRunning = true;
    this.cancelRequested = false;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      for (const categoryObj of this.demidovCategories) {
        if (this.cancelRequested) break;

        const { name, url } = categoryObj;

        // 1) собираем все карточки
        const allProducts = await this.parseCategoryListOnly(browser, name, url);
        this.logger.log(`[${name}] Всего карточек на странице: ${allProducts.length}`);

        // 2) фильтруем
        const filteredProducts = allProducts.filter(
          (p) => p.location == 'МОСКВА' && p.available === true,
        );
        this.logger.log(
          `[${name}] После фильтра (Москва + есть в наличии): ${filteredProducts.length}`,
        );

        // 3) собираем детали каждой карточки
        // const detailedProducts: Product[] = [];
        // for (const p of filteredProducts) {
        //   if (this.cancelRequested) break;

        //   let productWithDetails = { ...p };

        //   if (p.link) {
        //     let retries = 2; // сколько раз пробовать открыть страницу товара
        //     while (retries > 0) {
        //       const productPage = await browser.newPage();
        //       try {
        //         // Пробуем открыть карточку товара
        //         await this.retryPageGoto(productPage, p.link);
        //         await productPage.waitForSelector('.card__image_desctop', { timeout: 20000 });

        //         const details = await productPage.evaluate(() => {
        //           const imgDiv = document.querySelector<HTMLDivElement>('.card__image_desctop');
        //           const bgImage = imgDiv?.style.backgroundImage || '';
        //           const imageUrl = bgImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');

        //           const listItems = Array.from(
        //             document.querySelectorAll<HTMLLIElement>('.card__ul li'),
        //           );
        //           const getValue = (label: string) => {
        //             const li = listItems.find((el) =>
        //               el.innerText.toLowerCase().includes(label.toLowerCase()),
        //             );
        //             return li?.querySelector('b, span')?.textContent?.trim() || '';
        //           };

        //           return {
        //             image: imageUrl,
        //             size: getValue('Размер'),
        //             mark: getValue('Стандарт'),
        //             length: getValue('Длина'),
        //           };
        //         });

        //         productWithDetails = {
        //           ...p,
        //           image: details.image,
        //           size: details.size || p.size,
        //           mark: details.mark || p.mark,
        //           length: details.length || p.length,
        //         };

        //         this.logger.log(
        //           `✅ Детали для ${p.name} собраны: ${details.size}, ${details.mark}, ${details.length}`,
        //         );

        //         break; // если всё прошло успешно — выходим из цикла попыток
        //       } catch (err) {
        //         this.logger.warn(`⚠ Ошибка при получении деталей для ${p.link}: ${err}`);
        //         retries--;
        //         if (retries === 0) {
        //           this.logger.warn(`❌ Детали для ${p.link} так и не удалось получить`);
        //         } else {
        //           this.logger.log(`🔄 Повторная попытка для ${p.link}...`);
        //           await this.sleep(3000);
        //         }
        //       } finally {
        //         await productPage.close();
        //       }
        //     }
        //   }

        //   // Сохраняем товар сразу после обработки
        //   try {
        //     await this.saveProducts.saveMany([productWithDetails]);
        //     this.logger.log(`💾 Товар "${productWithDetails.name}" сохранён в базу`);
        //   } catch (dbErr) {
        //     this.logger.error(`❌ Ошибка сохранения товара ${productWithDetails.name}: ${dbErr}`);
        //   }

        //   // Задержка, чтобы сайт не банил
        //   await this.sleep(500 + Math.random() * 1000);
        // }

        // this.logger.log(`[${name}] Всего детализированных товаров: ${detailedProducts.length}`);

        // Сохраняем детали в базу
        // await this.saveProducts.saveMany(detailedProducts);
        await this.saveProducts.saveMany(filteredProducts);
        await this.sleep(500 + Math.random() * 1000);
        // this.logger.log(`📝 Детализированные данные сохранены: ${detailedProducts.length}`);
      }
    } finally {
      await browser.close();
      this.isRunning = false;
    }
  }

  private async parseCategoryListOnly(
    browser: Browser,
    category: string,
    url: string,
  ): Promise<Product[]> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 850 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ru-RU,ru;q=0.9' });
    await this.retryPageGoto(page, url);

    try {
      // Ждём появления товаров
      await page.waitForSelector('.element__content', { timeout: 60000 });
    } catch {
      this.logger.warn(`[${category}] ❌ Не удалось дождаться товаров на странице: ${url}`);
      await page.close();
      return [];
    }

    // Пробуем раскрыть все товары
    try {
      await this.expandAllByShowMore(page, category);
    } catch (err) {
      this.logger.warn(`[${category}] ⚠ Ошибка при раскрытии списка товаров: ${err}`);
    }

    const products: Product[] = await page.evaluate(
      (category, provider) => {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('.element__content'));
        return rows.map((row) => {
          const titleEl = row.querySelector<HTMLAnchorElement>('.element__title');
          const name = titleEl?.textContent?.trim() || '';
          const length = row.querySelector<HTMLElement>('.dlins')?.textContent?.trim() || '';
          const location =
            row.querySelector<HTMLElement>('.element__city .element__stock')?.textContent?.trim() ||
            '';
          const price1Text =
            row.querySelector<HTMLElement>('.element__price.tons .prisd')?.textContent?.trim() ||
            '';
          const price2Text =
            row.querySelector<HTMLElement>('.element__price.metres .prisd')?.textContent?.trim() ||
            '';
          const price1 = price1Text ? +price1Text.replace(/\s|₽|руб\.?/gi, '') : null;
          const price2 = price2Text ? +price2Text.replace(/\s|₽|руб\.?/gi, '') : null;
          const units1 = 'Цена за тонну';
          const units2 = 'Цена за метр';
          const availableText =
            row.querySelector<HTMLElement>('.element__top .element__stock')?.textContent?.trim() ||
            '';
          const available = Boolean(availableText) && !/нет|отсутст/i.test(availableText);
          const link = titleEl?.href || '';
          const today = new Date().toISOString().split('T')[0];
          const uniqueString = name + length + price1 + link + today;

          return {
            provider,
            category,
            name,
            length,
            location,
            price1,
            price2,
            units1,
            units2,
            available,
            link,
            uniqueString,
            description: name || '',
          } as Product;
        });
      },
      category,
      this.PROVIDER,
    );

    const expanded = await this.tryExpandProductList(page, category);
    if (!expanded) {
      return []; // Пропуск категории
    }

    await page.close();
    return products;
  }

  private async expandAllByShowMore(page: Page, category: string) {
    const BTN_SEL = '.load_more.ct__more';
    let lastCount = await page.$$eval('.element__content', (els) => els.length);
    let stagnations = 0;
    const MAX_CLICKS = 500;

    for (let clickNum = 1; clickNum <= MAX_CLICKS; clickNum++) {
      if (this.cancelRequested) break;
      const exists = await page.$(BTN_SEL);
      if (!exists) break;
      await page.$eval(BTN_SEL, (el) => (el as HTMLElement).scrollIntoView({ block: 'center' }));
      this.logger.log(`[${category}] Нажимаю «Показать ещё» #${clickNum} (карточек: ${lastCount})`);
      await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement)?.click(), BTN_SEL);

      try {
        await page.waitForFunction(
          (prev) => document.querySelectorAll('.element__content').length > prev,
          { timeout: 20000 },
          lastCount,
        );
      } catch {
        stagnations++;
        if (stagnations >= 2) break;
      }

      const newCount = await page.$$eval('.element__content', (els) => els.length);
      if (newCount <= lastCount) stagnations++;
      else {
        stagnations = 0;
        lastCount = newCount;
      }
      await this.sleep(500 + Math.random() * 1000);
    }

    this.logger.log(`[${category}] Разворачивание завершено. Карточек: ${lastCount}`);
  }

  private async retryPageGoto(page: Page, url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        return;
      } catch (err: any) {
        const errorText = err?.message || '';
        this.logger.warn(`Ошибка загрузки ${url}: ${errorText}`);
        if (errorText.includes('ERR_CONNECTION_CLOSED') || errorText.includes('ERR_TIMED_OUT')) {
          await this.sleep(10000);
        }
        if (i === retries - 1) return;
      }
    }
  }

  private async tryExpandProductList(page: Page, categoryName: string): Promise<boolean> {
    const selector = '.element__content';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        this.logger.log(`[${categoryName}] Попытка ${attempt} — жду список товаров...`);
        await page.waitForSelector(selector, { timeout: 60000 });
        return true; // Успех
      } catch (err) {
        this.logger.warn(
          `[${categoryName}] ❌ Не удалось получить список товаров на попытке ${attempt}: ${err}`,
        );
        if (attempt < 2) {
          this.logger.log(`[${categoryName}] 🔄 Перезагружаю страницу и пробую снова...`);
          await page.reload({ waitUntil: 'domcontentloaded' });
        }
      }
    }

    this.logger.warn(
      `[${categoryName}] ⚠ Пропускаю категорию — список товаров так и не загрузился`,
    );
    return false; // После двух попыток неудача
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
