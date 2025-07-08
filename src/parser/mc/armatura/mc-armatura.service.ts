import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { mcCategories } from './mc-categories';
import { PrismaClient, Parser as ParserModel } from '@prisma/client';

type Product = {
  provider: string;
  category: string;
  name: string;
  size: string;
  mark: string;
  length: string;
  location: string;
  price1: string;
  price2: string;
  image: string;
  link: string;
};

@Injectable()
export class McParserService {
  private readonly logger = new Logger(McParserService.name);
  private readonly prisma = new PrismaClient();
  private readonly categories = mcCategories;

  async parseCategory(url: string, category: string): Promise<Product[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const allProducts: Product[] = [];
    const seenFirstItems = new Set<string>();

    for (let pageNum = 1; pageNum <= 50; pageNum++) {
      const pageUrl = pageNum === 1 ? url : `${url}/PageN/${pageNum}`;
      await page.goto(pageUrl, { waitUntil: 'networkidle2' });

      try {
        await page.waitForSelector('tr[data-nm]', { timeout: 10000 });
      } catch {
        this.logger.warn(`Нет данных на странице ${pageNum} категории ${category}`);
        break;
      }

      const products = await page.evaluate((category) => {
        const rows = Array.from(document.querySelectorAll('tr[data-nm]'));
        return rows.map((row) => {
          const provider = 'МЕТАЛЛ СЕРВИС';
          const name = row.getAttribute('data-nm')?.trim() || '';
          const size = row.querySelector('td._razmer')?.textContent?.trim() || '';
          const mark = row.querySelector('td._mark')?.textContent?.trim() || '';
          const length = row.querySelector('td._dlina')?.textContent?.trim() || '';
          const location = row.querySelector('td._fact')?.textContent?.trim() || '';
          const price1 = row.querySelector('td._ost')?.textContent?.replace(/\s+/g, '') || '';
          const price2 = row.querySelector('meta[itemprop="price"]')?.getAttribute('content') || '';
          const imgRelative = row.querySelector('img.Picture')?.getAttribute('src') || '';
          const image = imgRelative ? `https://mc.ru${imgRelative}` : '';
          const href = row.querySelector('a')?.getAttribute('href') || '';
          const link = href ? `https://mc.ru${href}` : '';

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
            image,
            link,
          };
        });
      }, category);

      if (products.length === 0) {
        this.logger.log(`Страница ${pageNum} пуста, останавливаемся.`);
        break;
      }

      const firstKey = `${products[0].name}|${products[0].mark}|${products[0].length}`;
      if (seenFirstItems.has(firstKey)) {
        this.logger.log(`Страница ${pageNum} дублирует предыдущую, останавливаемся.`);
        break;
      }

      seenFirstItems.add(firstKey);
      allProducts.push(...products);
      this.logger.log(`✅ [${category}] Страница ${pageNum}: ${products.length} товаров`);
    }

    await browser.close();
    return allProducts;
  }

  async parseAll() {
    const allResults: Product[] = [];

    for (const cat of this.categories) {
      this.logger.log(`Начинаем парсинг категории: ${cat.name}`);
      const products = await this.parseCategory(cat.url, cat.name);
      const valid = products.filter((p) => p.name && p.price1 && !isNaN(parseFloat(p.price1)));

      this.logger.log(`В категории "${cat.name}" найдено товаров: ${products.length}`);
      this.logger.log(`Прошли валидацию: ${valid.length}`);

      if (valid.length === 0) {
        this.logger.warn(`❌ Все товары невалидны в категории "${cat.name}".`);
        continue;
      }

      allResults.push(...valid);
    }

    return {
      total: allResults.length,
      products: allResults,
    };
  }

  async saveToDatabase(products: Product[]) {
    for (const product of products) {
      try {
        await this.prisma.parser.upsert({
          where: { link: product.link },
          update: {
            provider: product.provider,
            category: product.category,
            name: product.name,
            size: product.size,
            mark: product.mark,
            length: product.length,
            location: product.location,
            price1: product.price1,
            price2: product.price2,
            image: product.image,
          },
          create: product,
        });
      } catch (error) {
        this.logger.warn(`⚠️ Ошибка при сохранении товара "${product.name}": ${error.message}`);
      }
    }

    this.logger.log(`✅ Сохранено в базу: ${products.length} товаров`);
  }

  async exportToExcel(products: Product[], fileName = 'products.xlsx') {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');

    const filePath = path.join(__dirname, '..', '..', 'exports', fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    XLSX.writeFile(wb, filePath);

    this.logger.log(`📁 Excel-файл сохранён: ${filePath}`);
  }

  async parseAndSave() {
    const { products } = await this.parseAll();
    await this.saveToDatabase(products);
  }

  async parseAndExport() {
    const { products } = await this.parseAll();
    await this.exportToExcel(products);
  }

  async getFromDatabase() {
  return this.prisma.parser.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
}