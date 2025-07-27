import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DiposParserService } from "./dipos.service";
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from "src/database/get-products.service";

@Controller('parser-dipos')
export class DiposParserController {
    private readonly logger = new Logger(DiposParserController.name);
    private readonly MAX_LIMIT = 100;
    private readonly PROVIDER_NAME = 'dipos';
    
      constructor(
        private readonly diposParserService: DiposParserService,
        private readonly productsDb: GetProductsService,
      ) {}

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
      const pageNum = Math.max(1, Number(page) || 1);
      const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
      const skip = (pageNum - 1) * take;
      return { skip, take };
    }

  @Get('parse')
  async parse() {
    await this.diposParserService.fetchAndDownloadPriceList();
    const data = await this.diposParserService.parseDownloadedFile() || '';
    return { Message: `✅ Парсинг завершён. Сохраненно ${data.length} товаров.` };
  }

  @Get('data')
    async getSavedData(
      @Query('page') page = '1',
      @Query('limit') limit = '100',
    ) {
      try {
        const { skip, take } = this.normalizePagination(page, limit);
  
        const [products, total] = await Promise.all([
          this.productsDb.getProducts(this.PROVIDER_NAME, { skip, take }),
          this.productsDb.countProducts(this.PROVIDER_NAME),
        ]);
  
        return {
          message: '📦 Получены данные из базы',
          provider: this.PROVIDER_NAME,
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
            await this.diposParserService.exportToExcelFromDb(filePath, provider);
      
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