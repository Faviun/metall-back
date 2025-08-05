import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import * as XLSX from 'xlsx';
import { diposCategories } from './dipos-categories';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DiposParserService {
  private readonly logger = new Logger(DiposParserService.name);
  private readonly baseUrl = 'https://dipos.ru';
  private readonly provider = 'dipos';
  private readonly categories = diposCategories;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  @Cron('18,23 18 * * *', { timeZone: 'Europe/Moscow' })
  async parse() {
    try {
      this.logger.log('⏰ [DiposParser] Запуск парсинга по расписанию...');
      await this.fetchAndDownloadPriceList();

      const data = (await this.parseDownloadedFile()) || [];
      this.logger.log(`✅ [DiposParser] Завершено. Сохранено ${data.length} товаров.`);
    } catch (error) {
      this.logger.error(`❌ [DiposParser] Ошибка при парсинге: ${error.message}`);
    }
  }

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

  async parseDownloadedFile(): Promise<void | Product[]> {
    const filePath = path.resolve(__dirname, '..', '..', 'downloads', 'price.xls');

    try {
      if (!fs.existsSync(filePath)) {
        this.logger.error('Файл не найден: ' + filePath);
        return [];
      }

      this.logger.log('Чтение Excel-файла...');

      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      const result: Product[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (
          !row ||
          row.length === 0 ||
          row.every((cell) => !cell || cell.toString().trim() === '')
        ) {
          continue;
        }

        const name = row[0]?.toString().trim() || '';
        const mark = row[1]?.toString().trim() || '';
        const units1 = row[2]?.toString().trim() || '';
        const price1 = parsePrice(row[3]) || null;

        if (name && price1) {
          const foundCategory = this.categories.find((cat) => name.includes(cat)) || 'Другое';

          const today = new Date().toISOString().split('T')[0];
          const uniqueString = name + mark + price1 + today;

          result.push({
            provider: this.provider,
            category: foundCategory,
            name,
            mark,
            price1,
            units1,
            size: '',
            location: '',
            weight: '',
            image: '',
            link: '',
            description: '',
            length: '',
            price2: null,
            units2: '',
            price3: null,
            units3: '',
            available: true,
            uniqueString,
          });
        }
      }

      this.logger.log(`Всего строк: ${rows.length}`);
      this.logger.log(`Отфильтровано строк: ${result.length}`);

      await this.saveToDatabase(result);
      this.logger.log(`✅ Сохранено: ${result.length} шт. из прайс-листа`);
    } catch (error) {
      this.logger.error(`❌ Ошибка парсинга: ${error.message}`);
      return [];
    }

    function parsePrice(priceStr: string | null): number | null {
      if (!priceStr) return null;

      // Убираем пробелы и все запятые (для тысячных разделителей)
      const cleaned = priceStr.replace(/\s/g, '').replace(/,/g, '');

      const parsed = Number(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
  }

  private async saveToDatabase(products: Product[]): Promise<void> {
    try {
      await this.saveProducts.saveMany(products);
    } catch (err) {
      this.logger.error(`❌ Ошибка при сохранении данных: ${err.message}`);
    }
  }

  async exportToExcelFromDb(fileName = 'ktzholding.xlsx', provider = this.provider): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }
}
