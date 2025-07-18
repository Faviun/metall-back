import { Controller, Get, Query, Res } from '@nestjs/common';
import { McParserService } from './mc.service';
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
      async getSavedData(
        @Query('page') page = 1,
        @Query('limit') limit = 100,
      ) {
      
      const pageNum = Math.max(1, Number(page));
      const take = Math.min(Number(limit), 100); // ограничим максимум 100 товаров за раз
      const skip = (pageNum - 1) * take;
  
      const [products, total] = await Promise.all([
      this.parserService.getFromDatabase({ skip, take }),
      this.parserService.countProducts(),
    ]);
  
      return {
        message: '📦 Получены данные из базы',
        totalProduct: products.length,
        total,
        page,
        perPage: take,
        products,
      };
    }
  
    @Get('download')
      async downloadExcel(@Res() res: Response) {
      const fileName = 'products.xlsx';
  
      await this.parserService.exportToExcelFromDb(fileName);
      const filePath = path.join(__dirname, '..', '..', 'exports', fileName);
  
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
