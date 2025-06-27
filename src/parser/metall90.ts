import axios from 'axios';
import * as cheerio from 'cheerio';

export async function parseMetall90() {
  const res = await axios.get('https://metall90.ru/');
  const $ = cheerio.load(res.data);
  const products: {
    name: string;
    price: number;
    unit: string;
  }[] = [];

  $('table.b-table tbody tr').each((_, el) => {
    const name = $(el).find('td:nth-child(1)').text().trim();
    const priceText = $(el).find('td:nth-child(3)').text().trim();
    const price = parseFloat(priceText.replace(/\s/g, '').replace(',', '.'));
    const unitMatch = $(el).find('td:nth-child(3)').text().match(/\/(\w+)/);
    const unit = unitMatch ? unitMatch[1] : 'руб';

    if (name && !isNaN(price)) {
      products.push({ name, price, unit });
    }
  });

  return products;
}