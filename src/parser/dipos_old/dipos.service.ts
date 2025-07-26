import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExcelService {
  private readonly downloadDir = path.join(__dirname, '..', '..', 'downloads');
  private readonly exportDir = path.join(__dirname, '..', '..', 'exports');

  constructor() {
    fs.mkdirSync(this.downloadDir, { recursive: true });
    fs.mkdirSync(this.exportDir, { recursive: true });
  }

  async downloadFileDirect(url: string): Promise<string> {
    const ext = url.includes('.xlsx') ? '.xlsx' : '.xls'; // определим расширение
    const filePath = path.join(this.downloadDir, `remote-${Date.now()}${ext}`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0', // иногда нужен для обхода блокировки
      },
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }

  parseExcel(filePath: string): any[] {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Преобразование в нужный формат (при необходимости адаптируй поля)
    return rawData.map((row: any) => ({
      name: row['Наименование'] || row['Товар'] || '',
      price: row['Цена'] || row['Стоимость'] || '',
      unit: row['Ед. изм.'] || '',
      comment: row['Примечание'] || '',
    }));
  }

  exportToExcel(data: any[], fileName: string): string {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const filePath = path.join(this.exportDir, fileName);
    XLSX.writeFile(wb, filePath);
    return filePath;
  }
}