import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { metallotorgCategories } from './metallotorg-categories';
import { PrismaClient } from '@prisma/client';

type Product = {
  provider: string;
  category: string;
  name: string;
  size: string;
  mark: string;
  length: string;
  weight: string;
  location: string;
  price1: string;
  price2?: string;
  price3?: string;
  units1: string | null;
  units2?: string | null;
  units3: string | null;
  available?: boolean;
  image?: string;
  link: string;
};

@Injectable()
export class MetallotorgParserService {
  private readonly logger = new Logger(MetallotorgParserService.name);
  private readonly prisma = new PrismaClient();
  private readonly categories = metallotorgCategories;

  async parseCategory(): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  });

  let emptyPagesInRow = 0;
  const maxEmptyPages = 3;

for (let pageNum = 1; pageNum <= 1000; pageNum++) {
  let success = false;
  let attempt = 0;
  const maxAttempts = 3;

  while (!success && attempt < maxAttempts) {
    attempt++;
    try {
      const pageUrl = `https://www.metallotorg.ru/info/pricelists/moscow/${pageNum}`;
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const hasTable = await page.$('table tbody tr');
      if (!hasTable) {
        this.logger.log(`❌ Таблица не найдена на странице ${pageNum}, прерываем.`);
        emptyPagesInRow++;
        success = true;
        break;
      }

        const products: Product[] = await page.evaluate((categories): Product[] => {
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
                if (name.toLowerCase().trim().includes(item.name.toLowerCase().trim())) {
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
              };
            });
        }, this.categories);

        if (!products || products.length === 0) {
        this.logger.log(`Страница ${pageNum} пуста или невалидна, завершаем.`);
        emptyPagesInRow++;
        success = true;
        break;
      } else {
        emptyPagesInRow = 0; // сбрасываем, если были данные
      }

      const valid = products.filter(p => p.name && p.location);
      await this.saveToDatabase(valid);
      this.logger.log(`✅ Страница ${pageNum}: ${valid.length} товаров сохранено`);
      success = true;
    } catch (error) {
      this.logger.warn(`⚠️ Ошибка на странице ${pageNum} (попытка ${attempt}): ${error.message}`);
      if (attempt < maxAttempts) {
        this.logger.log(`⏳ Ждём 3 секунды перед повтором...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        this.logger.error(`❌ Превышено число попыток для страницы ${pageNum}, переходим к следующей.`);
        success = true;
      }
    }
  }

  if (emptyPagesInRow >= maxEmptyPages) {
    this.logger.warn(`📉 Обнаружено ${maxEmptyPages} пустых страниц подряд. Парсинг остановлен.`);
    break;
  }
}

  await browser.close();
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
  const products = await this.getFromDatabase()

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
    await this.parseCategory();
    this.logger.log('✅ Парсинг завершён и данные сохранены.');
  }

  async parseAndExport() {
  await this.exportToExcelFromDb(); // берёт из базы, не парсит заново
}

  async getFromDatabase(pagination?: { skip?: number; take?: number }) {
    return this.prisma.parser.findMany({
      where: {
        provider: 'metallotorg',
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
    },
      skip: pagination?.skip,
      take: pagination?.take,
      orderBy: { id: 'desc' },
    });
  }

  async countProducts() {
  return this.prisma.parser.count({
    where: {
      provider: 'metallotorg',
      },
    });
  }
}