import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { mcCategories } from './mc-categories';
import { PrismaClient } from '@prisma/client';

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
  units1?: string | null;
  units2?: string | null;
  available?: boolean;
  image: string;
  link: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class McParserService {
  private readonly logger = new Logger(McParserService.name);
  private readonly prisma = new PrismaClient();
  private readonly categories = mcCategories;

  async parseCategory(url: string, category: string): Promise<Product[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // ➕ Устанавливаем пользовательский User-Agent и заголовки
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    });

    const allProducts: Product[] = [];
    const seenFirstItems = new Set<string>();

    for (let pageNum = 1; pageNum <= 1000; pageNum++) {
      // const pageUrl = pageNum === 1 ? url : `${url}/PageN/${pageNum}`;
      const pageUrl = `${url}${pageNum}`;
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

          const unit1Element = document.querySelector('li.excludeMobile.ost a.catalogFilter');
          const unit1Label = unit1Element?.childNodes[0]?.textContent?.trim() || '';
          const unit1Range = unit1Element?.querySelector('span.categoryGroup')?.textContent?.trim() || '';
          const units1 = `${unit1Label} ${unit1Range}`.replace(/\s+/g, ' ').trim(); // "Цена, руб от 1 до 5т"

          const unit2Element = document.querySelector('li._price._center a.catalogFilter') || document.querySelector('li.excludeMobile a.catalogFilter');
          const unit2Label = unit2Element?.childNodes[0]?.textContent?.trim() || '';
          const unit2Range = unit2Element?.querySelector('span.categoryGroup')?.textContent?.trim() || '';
          const units2 = `${unit2Label} ${unit2Range}`.replace(/\s+/g, ' ').trim(); // "Цена, руб от 5 до 10т"
          const imgRelative = row.querySelector('img.Picture')?.getAttribute('src') || '';

          const image = imgRelative ? `https://mc.ru${imgRelative}` : '';
          const available = !row.querySelector('button.catIcon._phone._bas');
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
            units1, 
            units2,
            available,
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

      // ➕ Пауза между страницами
      // await sleep(500 + Math.random() * 1500);
    }

    await browser.close();
    return allProducts;
  }

  async parseAll() {
    const allResults: Product[] = [];

    for (const cat of this.categories) {
      this.logger.log(`Начинаем парсинг категории: ${cat.name}`);
      const products = await this.parseCategory(cat.url, cat.name);
      const valid = products.filter((p) => p.name && (p.price1 
        && !isNaN(parseFloat(p.price1)) 
        || (p.price2 && !isNaN(parseFloat(p.price2)))
      ));

      this.logger.log(`В категории "${cat.name}" найдено товаров: ${products.length}`);
      this.logger.log(`Прошли валидацию: ${valid.length}`);

      if (valid.length === 0) {
        this.logger.warn(`❌ Все товары невалидны в категории "${cat.name}".`);
        continue;
      }

      allResults.push(...valid);

      // ➕ Пауза между категориями
      await sleep(3000 + Math.random() * 4000);
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

  async exportToExcelFromDb(fileName = 'products.xlsx') {
  // 1. Получаем все записи из базы
  const products = await this.prisma.parser.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    this.logger.warn('❌ Нет данных в базе для экспорта.');
    return;
  }

  // 2. Преобразуем в формат Excel
  const ws = XLSX.utils.json_to_sheet(products);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');

  // 3. Сохраняем файл
  const filePath = path.join(__dirname, '..', '..', 'exports', fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  XLSX.writeFile(wb, filePath);

  this.logger.log(`📁 Excel-файл из базы сохранён: ${filePath}`);
}

  async parseAndSave() {
    const { products } = await this.parseAll();
    await this.saveToDatabase(products);
  }

  async parseAndExport() {
  await this.exportToExcelFromDb(); // берёт из базы, не парсит заново
}


  async getFromDatabase(pagination?: { skip?: number; take?: number }) {
    return this.prisma.parser.findMany({
      where: {
        provider: 'МЕТАЛЛ СЕРВИС',
      },
      select: {
        id: true,
        provider: true,
        category: true,
        name: true,
        size: true,
        length: true,
        mark: true,
        weight: true,
        units1: true,
        price1: true,
        units2: true,
        price2: true,
        units3: true,
        price3: true,
        location: true,
        link: true,
        image: true,
        available: true,
    },
      skip: pagination?.skip,
      take: pagination?.take,
      orderBy: { id: 'desc' },
    });
  }

  async countProducts() {
  return this.prisma.parser.count({
    where: {
      provider: 'МЕТАЛЛ СЕРВИС',
      },
    });
  }
}