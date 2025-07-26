import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { is } from 'cheerio/dist/commonjs/api/traversing';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

@Injectable()
export class DiposParserService {
  private readonly logger = new Logger(DiposParserService.name);
  private readonly baseUrl = 'https://dipos.ru';

  async fetchAndDownloadPriceList(): Promise<void> {
    try {
      this.logger.log('Запрос главной страницы...');
      const { data: html } = await axios.get(this.baseUrl);

      const $ = cheerio.load(html);
      const linkElement = $('a.price-link_header');

      if (!linkElement.length) {
        throw new Error('Не найдена ссылка на прайс-лист');
      }

      const relativeHref = linkElement.attr('href') as string;
      const fullUrl = `${this.baseUrl}${relativeHref}`;
      this.logger.log(`Ссылка на файл: ${fullUrl}`);

      const fileName = path.basename(relativeHref.split('?')[0]);
      const filePath = path.resolve(__dirname, '..', '..', 'downloads', fileName);

      this.logger.log(`Скачиваем файл в: ${filePath}`);
      const response = await axios.get(fullUrl, {
        responseType: 'stream',
      });

      // Убедись, что папка есть
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve: any, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      this.logger.log('Файл успешно загружен и сохранён!');
    } catch (error) {
      this.logger.error('Ошибка при загрузке прайса:', error.message);
    }
  }


async parseDownloadedFile(): Promise<
  { name: string; mark?: string; units1?: string; price1?: string; category?: string }[]
> {
  const filePath = path.resolve(__dirname, '..', '..', 'downloads', 'price.xls');

  if (!fs.existsSync(filePath)) {
    this.logger.error('Файл не найден: ' + filePath);
    return [];
  }

  this.logger.log('Чтение Excel-файла...');

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Читаем как массив массивов — без заголовков
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  // Массив категорий для поиска в name
  const categories = ['Арматура', 'Швеллер', 'Труба', 'Лист']; // Добавь свои категории

  const result: { name: string; mark?: string; units1?: string; price1?: string; category?: string }[] = [];

  // Пропускаем первую строку (заголовки), начинаем с i = 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row || row.length === 0 || row.every((cell) => !cell || cell.toString().trim() === '')) {
      continue; // Пропускаем пустые строки
    }

    const name = row[0]?.toString().trim() || '';
    const mark = row[1]?.toString().trim() || '';
    const units1 = row[2]?.toString().trim() || '';
    const price1 = row[3]?.toString().replace(',', '.').trim() || ''

    if (name && isNaN(parseFloat(price1)) === false) {
      // Находим первую категорию, которая встречается в name
      const foundCategory = categories.find(cat => name.includes(cat));

      result.push({
        category: foundCategory || undefined,
        name,
        mark,
        price1,
        units1,
      });
    }
  }

  this.logger.log(`Всего строк: ${rows.length}`);
  this.logger.log(`Отфильтровано строк: ${result.length}`);
  return result;
}
}