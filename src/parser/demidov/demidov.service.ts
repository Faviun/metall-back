import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import * as fs from 'fs';
import { demidovCategories } from './demidov-categories';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { getExcelStreamFromDb } from 'src/utils/excel.helper';
import { allCategories } from 'src/utils/categories';
import { nameUnific } from 'src/utils/name-unific';

@Injectable()
export class DemidovParserService {
  private readonly logger = new Logger(DemidovParserService.name);
  private readonly demidovCategories = demidovCategories;
  // private readonly categories = allCategories;
  private readonly PROVIDER = 'demidov';
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

  async parse() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const category of this.demidovCategories) {
      await this.parseCategory(browser, category.name, category.url);
    }

    await browser.close();
    this.logger.log(`✅ Парсинг завершён`);
  }

  private async parseCategory(browser: Browser, category: string, url: string) {
    let pageNum = 1;
    let lastFirstProduct: string | null = null; // Запоминаем первый товар предыдущей страницы

    while (true) {
      const pageUrl = `${url}${pageNum}`;
      this.logger.log(`[${category}] Открываю страницу ${pageUrl}`);

      const page = await browser.newPage();
      await this.retryPageGoto(page, pageUrl);

      const rawProducts: Product[] = await page.evaluate(
        (category, provider) => {
          const rows = Array.from(document.querySelectorAll('.element__content'));
          return rows.map((row) => {
            const titleEl = row.querySelector<HTMLAnchorElement>('.element__title');
            const name = titleEl?.textContent?.trim() || '';
            const length = row.querySelector('.dlins')?.textContent?.trim() || '';
            const location =
              row.querySelector('.element__city .element__stock')?.textContent?.trim() || '';
            const price1 =
              +(row.querySelector('.element__price.tons .prisd')?.textContent?.trim() || 0) || null;
            const price2 =
              +(row.querySelector('.element__price.metres .prisd')?.textContent?.trim() || 0) ||
              null;
            const units1 = 'Цена за тонну';
            const units2 = 'Цена за метр';
            const available =
              !!row.querySelector('.element__top .element__stock')?.textContent?.trim() || false;
            const link = titleEl ? new URL(titleEl.href, 'https://evraz.market').href : '';
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
            };
          });
        },
        category,
        this.PROVIDER,
      );

      await page.close();

      // --- Защита от повторной страницы ---
      if (rawProducts.length > 0) {
        const currentFirstProduct = rawProducts[0].name + rawProducts[1].name + rawProducts[2].name;
        if (lastFirstProduct && currentFirstProduct === lastFirstProduct) {
          this.logger.warn('last = ' + lastFirstProduct + 'current = ' + currentFirstProduct);
          this.logger.warn(
            `♻ [${category}] Страница ${pageNum} совпадает с предыдущей. Останавливаем парсинг категории.`,
          );
          break;
        }
        lastFirstProduct = currentFirstProduct;
      }

      // Фильтруем товары по Москве и доступности
      const validProducts = rawProducts.filter(
        (p) => p.name && p.location == 'МОСКВА' && p.available === true,
      );

      if (!rawProducts.length) {
        this.logger.warn(`[${category}] Нет товаров на странице ${pageNum}`);
        break;
      }

      const detailedProducts: Product[] = [];

      for (const p of validProducts) {
        if (!p.link) {
          detailedProducts.push(p);
          continue;
        }

        const productPage = await browser.newPage();
        await this.retryPageGoto(productPage, p.link);

        try {
          const details = await productPage.evaluate(() => {
            const imgDiv = document.querySelector<HTMLDivElement>('.card__image_desctop');
            const bgImage = imgDiv?.style.backgroundImage || '';
            const imageUrl = bgImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1');

            const listItems = Array.from(document.querySelectorAll<HTMLLIElement>('.card__ul li'));

            const getValue = (label: string) => {
              const li = listItems.find((el) =>
                el.innerText.toLowerCase().includes(label.toLowerCase()),
              );
              return li?.querySelector('b, span')?.textContent?.trim() || '';
            };

            return {
              image: imageUrl,
              size: getValue('Размер'),
              mark: getValue('Стандарт'),
              length: getValue('Длина'),
            };
          });

          detailedProducts.push({
            ...p,
            image: details.image,
            size: details.size || p.size,
            mark: details.mark || p.mark,
            length: details.length || p.length,
          });
        } catch (err) {
          this.logger.warn(`Не удалось получить детали для ${p.link}: ${err}`);
          detailedProducts.push(p);
        } finally {
          await productPage.close();
        }

        await this.sleep(500 + Math.random() * 500);
      }

      if (detailedProducts.length > 0) {
        await this.saveToDatabase(detailedProducts);
        this.logger.log(
          `✅ [${category}] Сохранено товаров со страницы ${pageNum}: ${detailedProducts.length}`,
        );
      }

      pageNum++;
    }
  }

  private async saveToDatabase(products: Product[]) {
    await this.saveProducts.saveMany(products);
  }

  private async retryPageGoto(page, url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        await this.sleep(1000);
      }
    }
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
