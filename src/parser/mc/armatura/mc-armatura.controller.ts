import { Controller, Get, Res } from '@nestjs/common';
import { McParserService } from './mc-armatura.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('parser-mc')
export class McParserController {
  constructor(private readonly parserService: McParserService) {}

  @Get('armatura')
  async parseAll() {
    return this.parserService.parseAll();
  }

  @Get('download')
  async downloadExcel(@Res() res: Response) {
    const fileName = 'products.xlsx';

    // 1. Запустить парсинг и экспорт
    const { products } = await this.parserService.parseAll();
    await this.parserService.exportToExcel(products, fileName);

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
