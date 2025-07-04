import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

type Product = {
  provider: string;
  name: string;
  mark: string;
  length: string;
  location: string;
  stock: string;
  price: string;
  image: string;
  link: string;
};

@Injectable()
export class McParserService {
  private readonly url = 'https://mc.ru/metalloprokat/armatura_riflenaya_a3';
  private readonly logger = new Logger(McParserService.name);

  async parseArmatura() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(this.url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('tr.parent');

    const totalPages = await page.evaluate(() => {
      const pagination = document.querySelectorAll('.pagination li a');
      const numbers = Array.from(pagination)
        .map((a) => parseInt(a.textContent || '', 10))
        .filter((n) => !isNaN(n));
      return Math.max(...numbers, 1);
    });

    this.logger.log(`Всего страниц: ${totalPages}`);

    const allProducts: Product[] = [];

   const seenFirstItems = new Set<string>();

for (let pageNum = 1; pageNum <= 50; pageNum++) {
  const url = pageNum === 1
    ? 'https://mc.ru/metalloprokat/armatura_riflenaya_a3'
    : `https://mc.ru/metalloprokat/armatura_riflenaya_a3/PageN/${pageNum}`;

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('tr[data-nm]', { timeout: 10000 });

    const products = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[data-nm]'));

      return rows.map((row) => {
        const provider = 'МЕТАЛЛ СЕРВИС';
        const name = row.getAttribute('data-nm')?.trim() || '';
        const mark = row.querySelector('td._mark')?.textContent?.trim() || '';
        const length = row.querySelector('td._dlina')?.textContent?.trim() || '';
        const location = row.querySelector('td._fact')?.textContent?.trim() || '';
        const stock = row.querySelector('td._ost')?.textContent?.replace(/\s+/g, '') || '';
        const price = row.querySelector('meta[itemprop="price"]')?.getAttribute('content') || '';
        const imgRelative = row.querySelector('img.Picture')?.getAttribute('src') || '';
        const image = imgRelative ? `https://mc.ru${imgRelative}` : '';
        const href = row.querySelector('a')?.getAttribute('href') || '';
        const link = href ? `https://mc.ru${href}` : '';

        return {
            provider,
          name,
          mark,
          length,
          location,
          stock,
          price,
          image,
          link
        };
      });
    });

    if (products.length === 0) {
    console.log(`Страница ${pageNum} пуста, останавливаемся.`);
    break;
  }

  if (products.length === 0) {
    console.log(`Страница ${pageNum} пуста, завершаем.`);
    break;
  }

  const firstKey = `${products[0].name}|${products[0].mark}|${products[0].length}`;
  if (seenFirstItems.has(firstKey)) {
    console.log(`Страница ${pageNum} дублирует предыдущую, завершаем.`);
    break;
  }

  seenFirstItems.add(firstKey);
  allProducts.push(...products);
  console.log(`✅ Страница ${pageNum}: ${products.length} товаров`);
}

    await browser.close();

    const totalCount = allProducts.length;

    const validProducts = allProducts.filter(
      (p) =>
        p.name &&
        p.price &&
        !isNaN(parseFloat(p.price)) 
    );

    const invalidProducts = allProducts.filter(
      (p) =>
        !p.name ||
        !p.price ||
        isNaN(parseFloat(p.price)) 
    );

    this.logger.log(`Найдено товаров: ${totalCount}`);
    this.logger.log(`Прошли валидацию: ${validProducts.length}`);

    if (validProducts.length === 0) {
      this.logger.warn('❌ Все товары невалидны — возможно, сайт изменился.');
      this.logger.warn('Пример невалидных данных:', invalidProducts.slice(0, 3));
      throw new Error('Парсинг неудачен: нет валидных товаров.');
    }

    if (validProducts.length < totalCount * 0.5) {
      this.logger.warn('⚠️ Меньше половины товаров валидны — проверь структуру сайта.');
      this.logger.warn('Первые невалидные записи:', JSON.stringify(invalidProducts.slice(0, 3), null, 2));
    }

    return {
      total: totalCount,
      valid: validProducts.length,
      products: validProducts,
    };
  }
}


