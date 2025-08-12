import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { ExportExcelProductsService } from 'src/database/export-excel.service';
import { SaveProductsService } from 'src/database/save-products.service';
import { Product } from 'src/types/product.type';
import * as XLSX from 'xlsx';
import { allCategories } from 'src/utils/categories';
import { getExcelStreamFromDb } from 'src/utils/excel.helper';
import { nameUnific } from 'src/utils/name-unific';

@Injectable()
export class DiposParserService {
  private readonly logger = new Logger(DiposParserService.name);
  private readonly baseUrl = 'https://dipos.ru';
  private readonly PROVIDER = 'dipos';
  private readonly categories = allCategories;

  private isRunning = false;
  private cancelRequested = false;

  constructor(
    private readonly saveProducts: SaveProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  /** Запуск парсинга */
  async parse(): Promise<void> {
    try {
      this.logger.log('⏰ [DiposParser] Запуск парсинга...');
      const filePath = await this.fetchAndDownloadPriceList();

      if (!filePath) {
        this.logger.error('❌ Файл не был загружен, парсинг отменён.');
        return;
      }

      const data = (await this.parseDownloadedFile(filePath)) || [];
      this.logger.log(`✅ [DiposParser] Завершено. Сохранено ${data.length} товаров.`);
    } catch (error) {
      this.logger.error(`❌ [DiposParser] Ошибка при парсинге: ${error.message}`);
    }
  }

  /** Скачивает прайс и возвращает путь к нему */
  async fetchAndDownloadPriceList(): Promise<string | null> {
    if (this.isRunning) {
      this.logger.warn('⚠️ Парсер уже запущен, новый запуск невозможен.');
      return null;
    }

    this.isRunning = true;
    this.cancelRequested = false;

    try {
      const downloadsDir = path.resolve(__dirname, '..', '..', 'downloads');
      fs.mkdirSync(downloadsDir, { recursive: true });

      const filePath = path.join(downloadsDir, 'price.xls');

      // Удаляем старый файл
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log('🗑 Старый прайс удалён.');
      }

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

      this.logger.log(`Скачиваем файл в: ${filePath}`);
      const response = await axios.get(fullUrl, { responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      this.logger.log('✅ Файл успешно загружен и сохранён!');
      return filePath;
    } catch (error) {
      this.logger.error('Ошибка при загрузке прайса:', error.message);
      return null;
    }
  }

  /** Парсит загруженный файл */
  async parseDownloadedFile(filePath: string): Promise<Product[]> {
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
      if (this.cancelRequested) break;

      const row = rows[i];
      if (!row || row.length === 0 || row.every((cell) => !cell || cell.toString().trim() === '')) {
        continue;
      }

      const name = row[0]?.toString().trim() || '';
      const mark = row[1]?.toString().trim() || '';
      const units1 = row[2]?.toString().trim() || '';
      const price1 = parsePrice(row[3]) || null;

      const uName = nameUnific(name);

      if (name && price1) {
        const foundCategory = this.categories.find((cat) => name.includes(cat)) || 'Другое';
        const today = new Date().toISOString().split('T')[0];
        const uniqueString = name + mark + price1 + today;

        result.push({
          provider: this.PROVIDER,
          category: foundCategory,
          name: uName.raw || name,
          mark,
          price1,
          units1,
          size: '',
          location: '',
          weight: '',
          image: '',
          link: '',
          description: name,
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
    this.isRunning = false;

    if (this.cancelRequested) {
      this.logger.warn('⛔ Парсер был отменён пользователем.');
    }

    return result;

    function parsePrice(priceStr: string | null): number | null {
      if (!priceStr) return null;
      const cleaned = priceStr.replace(/\s/g, '').replace(/,/g, '');
      const parsed = Number(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
  }

  /** Запрос отмены */
  cancelParsing(): void {
    if (!this.isRunning) {
      this.logger.warn('Парсер не запущен — отменять нечего.');
      return;
    }
    this.cancelRequested = true;
    this.logger.warn('Отмена парсинга запрошена.');
  }

  private async saveToDatabase(products: Product[]): Promise<void> {
    try {
      await this.saveProducts.saveMany(products);
    } catch (err) {
      this.logger.error(`❌ Ошибка при сохранении данных: ${err.message}`);
    }
  }

  async exportToExcelFromDb(
    provider = this.PROVIDER,
    fileName = `${provider}.xlsx`,
  ): Promise<void> {
    await this.exportService.exportToExcelFromDb(fileName, provider);
  }

  async getExcelStream(provider: string): Promise<fs.ReadStream> {
    return getExcelStreamFromDb(this.exportToExcelFromDb.bind(this), provider);
  }
}
