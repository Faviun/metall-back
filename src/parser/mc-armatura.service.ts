import puppeteer from 'puppeteer';

interface ParsedProduct {
  id: number;
  provider: string;
  category: string;
  name: string;
  size: string | null;
  mark: string | null;
  grade: string | null;
  region: string | null;
  pricePerMeter: string | null;
  pricePerTon: string | null;
  availability: string | null;
}

export async function parseMcArmatura(): Promise<ParsedProduct[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  );

  const baseUrl = 'https://mc.ru/metalloprokat/armatura_riflenaya_a3';
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  const results: ParsedProduct[] = [];
  let currentId = 1;

  let pageIndex = 1;
  while (true) {
    await page.waitForSelector('table tbody tr', { timeout: 30000 });

    const firstRowText = await page.$eval('table tbody tr td', el => el.textContent?.trim() || '');

    const pageResults = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const provider = 'МЕТАЛЛ СЕРВИС';
        const category = 'Арматура рифленая А500С А3';
        const name = row.querySelector('td:nth-child(1)')?.textContent?.trim() || '';
        const size = row.querySelector('td:nth-child(2)')?.textContent?.trim() || null;
        const mark = row.querySelector('td:nth-child(3)')?.textContent?.trim() || null;
        const grade = row.querySelector('td:nth-child(4)')?.textContent?.trim() || null;
        const region = row.querySelector('td:nth-child(5)')?.textContent?.trim() || null;
        const pricePerMeter = row.querySelector('td:nth-child(6)')?.textContent?.trim() || null;
        const pricePerTon = row.querySelector('td:nth-child(7)')?.textContent?.trim() || null;
        const availability = row.querySelector('td:nth-child(8)')?.textContent?.trim() || null;

        return name
          ? {
              provider,
              category,
              name,
              size,
              mark,
              grade,
              region,
              pricePerMeter,
              pricePerTon,
              availability,
            }
          : null;
      }).filter(Boolean);
    });

    // Добавляем id каждому товару
    for (const item of pageResults as Omit<ParsedProduct, 'id'>[]) {
      results.push({ id: currentId++, ...item });
    }

    const nextBtn = await page.$('.pagination-next:not(.disabled) a');
    if (!nextBtn) break;

    console.log(`➡️ Переход на страницу ${pageIndex + 1}`);

    await Promise.all([
      nextBtn.click(),
      page.waitForFunction(
        prev => {
          const firstCell = document.querySelector('table tbody tr td');
          return firstCell && firstCell.textContent?.trim() !== prev;
        },
        { timeout: 10000 },
        firstRowText,
      ),
    ]);

    pageIndex++;
  }

  await browser.close();
  return results;
}