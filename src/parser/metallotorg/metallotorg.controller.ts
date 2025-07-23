import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { MetallotorgParserService } from './metallotorg.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from 'src/database/get-products.service';

@Controller('parser-metallotorg')
export class MetallotorgParserController {
  private readonly logger = new Logger(MetallotorgParserController.name);
  private readonly MAX_LIMIT = 100;
  private readonly PROVIDER_NAME = 'metallotorg';

  constructor(
    private readonly parserService: MetallotorgParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get('parse')
  async parseAndSave() {
    await this.parserService.parseCategory();

    return {
      message: '✅ Парсинг завершён, данные сохранены в базу по мере обработки.',
    };
  }

  @Get('data')
  async getSavedData(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
  ) {
    try {
      const { skip, take } = this.normalizePagination(page, limit);
      const provider = 'metallotorg';

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(provider, { skip, take }),
        this.productsDb.countProducts(provider),
      ]);

      return {
        message: '📦 Получены данные из базы',
        totalProduct: products.length,
        total,
        perPage: take,
        products,
      };
    } catch (error) {
      return {
        message: '❌ Ошибка при получении данных',
        error: error.message,
      };
    }
  }

  @Get('download')
  async downloadExcel(@Res() res: Response) {
    const provider = this.PROVIDER_NAME;
    const fileName = `${provider}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    try {
      await this.parserService.exportToExcelFromDb(filePath, provider);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Файл не найден');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Ошибка при скачивании файла: ${error.message}`);
      return res.status(500).send('Ошибка при формировании файла');
    }
  }
}