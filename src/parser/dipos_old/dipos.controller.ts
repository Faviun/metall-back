import { Controller, Get, Query, Res } from '@nestjs/common';
import { ExcelService } from './dipos.service';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Get('download-from-yandex')
  async downloadFromYandex(@Query('url') url: string, @Res() res: Response) {
    try {
      if (!url || !url.startsWith('http')) {
        return res.status(400).send('Некорректная ссылка');
      }

      const filePath = await this.excelService.downloadFileDirect(url);
      const parsedData = this.excelService.parseExcel(filePath);
      const exportFileName = `parsed-${Date.now()}.xlsx`;
      const exportPath = this.excelService.exportToExcel(parsedData, exportFileName);

      res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const stream = fs.createReadStream(exportPath);
      stream.pipe(res);
    } catch (error) {
      console.error(error);
      res.status(500).send('Ошибка при скачивании и обработке файла: ' + error.message);
    }
  }
}