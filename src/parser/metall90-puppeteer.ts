import puppeteer from 'puppeteer';

interface ParsedProduct {
  name: string;
  height: string | null;
  pricePerMeter: string | null;
  pricePerTon: string | null;
  category: string;
}

const categories = [
  { url: 'https://metall90.ru/armatura/', name: 'armatura' },
  { url: 'https://metall90.ru/shveller/', name: 'shveller' },
  { url: 'https://metall90.ru/balka/', name: 'balka' },
  { url: 'https://metall90.ru/profilnaj-truba/', name: 'profilnaj-truba' },
  { url: 'https://metall90.ru/ugolok/', name: 'ugolok' },
  { url: 'https://metall90.ru/truba/', name: 'truba' },
  { url: 'https://metall90.ru/list/', name: 'list' },
  { url: 'https://metall90.ru/polosa/', name: 'polosa' },
];

export async function parseMetall90Puppeteer(): Promise<ParsedProduct[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  const results: ParsedProduct[] = [];

  for (const category of categories) {
    try {
      await page.goto(category.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('div.item', { timeout: 30000 });

      const products = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div.item'));
        return items.map(item => {
          const nameEl = item.querySelector('ftd.td.title > div.text.element-text.text-block');
          const heightEl = item.querySelector('ftd.td.prc[data-item-id="1"] > div.text.element-text.text-block > p');
          const pricePerMeterEl = item.querySelector('ftd.td.prc[data-item-id="2"] > div.text.element-text.text-block > span');
          const pricePerTonEl = item.querySelector('ftd.td.prc[data-item-id="3"] > div.text.element-text.text-block > span');

          const name = nameEl?.textContent?.trim() || '';
          const height = heightEl?.textContent?.trim() || null;
          const pricePerMeter = pricePerMeterEl?.textContent?.trim() || null;
          const pricePerTon = pricePerTonEl?.textContent?.trim() || null;

          return name ? { name, height, pricePerMeter, pricePerTon } : null;
        }).filter(Boolean);
      });

      products
        .filter((p): p is ParsedProduct => p !== null)
        .forEach(p => {
          results.push({
            name: p.name,
            height: p.height ?? null,
            pricePerMeter: p.pricePerMeter ?? null,
            pricePerTon: p.pricePerTon ?? null,
            category: category.name,
          });
        });
    } catch (err: any) {
      console.warn(`⚠️ Пропущено ${category.url} из-за ошибки:`, err.message);
    }
  }

  await browser.close();
  return results;
}