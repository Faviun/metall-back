import { parseMetall90Puppeteer } from '../parser/metall90-puppeteer';

// Тестирую парсер на puppeteer

async function run() {
  const products = await parseMetall90Puppeteer();
  console.log('📦 Найдено товаров:', products.length);
  console.log(products.slice(0, 5));
}

run();