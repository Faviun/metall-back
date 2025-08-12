import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

export interface EvrazProduct {
  name: string;
  price: string;
  stock: string;
}

@Injectable()
export class EvrazService {
  async parseProductPage(url: string): Promise<EvrazProduct[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    );

    await page.goto(url, { waitUntil: 'networkidle2' });

    const products = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.product-item'));
      return items.map((item) => ({
        name: item.querySelector('.product-title')?.textContent?.trim() || '',
        price: item.querySelector('.product-price')?.textContent?.trim() || '',
        stock: item.querySelector('.product-stock')?.textContent?.trim() || '',
      }));
    });

    await browser.close();

    return products;
  }
}
