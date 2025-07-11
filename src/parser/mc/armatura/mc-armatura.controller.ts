import { Controller, Get, Res } from '@nestjs/common';
import { McParserService } from './mc-armatura.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('parser-mc')
export class McParserController {
  constructor(private readonly parserService: McParserService) {}

  @Get('parse')
    async parseAll() {
    // return this.parserService.parseAll();
    const { products } = await this.parserService.parseAll();

    // сохраняем валидные товары в базу
    await this.parserService.saveToDatabase(products);

    // возвращаем краткую информацию
    return {
      message: '✅ Данные успешно спарсены и сохранены в базу',
      total: products.length,
    };
  }

  @Get('data')
    async getSavedData() {
    const products = await this.parserService.getFromDatabase();
    return {
      message: '📦 Получены данные из базы',
      total: products.length,
      products,
    };
  }

  @Get('download')
    async downloadExcel(@Res() res: Response) {
    const fileName = 'products.xlsx';

    // 1. Запустить парсинг и экспорт
    // const { products } = await this.parserService.parseAll();
    await this.parserService.exportToExcelFromDb(fileName);

    // 2. Получить путь к файлу
    const filePath = path.join(__dirname, '..', '..', 'exports', fileName);

    // 3. Проверить наличие и отправить
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Файл не найден');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
