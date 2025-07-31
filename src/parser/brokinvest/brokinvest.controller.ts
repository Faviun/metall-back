import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { BrokinvestParserService } from './brokinvest.service';
import { GetProductsService } from 'src/database/get-products.service';
import * as path from 'path';
import * as fs from 'fs';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Парсер Brokinvest')
@Controller('parser-brokinvest')
export class BrokinvestParserController {
  private readonly logger = new Logger(BrokinvestParserController.name);
  private readonly MAX_LIMIT = 100;
  private readonly PROVIDER_NAME = 'brokinvest';

  constructor(
    private readonly service: BrokinvestParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get('parse')
  @ApiOperation({ summary: 'Запустить парсер Brokinvest' })
  @ApiResponse({ status: 200, description: 'Парсинг успешно завершён' })
  async runParser() {
    await this.service.fetchAllProducts();
    return { message: '✅ Парсинг завершён' };
  }

  @Get('data')
  @ApiOperation({ summary: 'Получить сохранённые товары из базы' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Номер страницы' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: '100',
    description: 'Количество товаров на странице',
  })
  @ApiResponse({
    status: 200,
    description: 'Пример успешного ответа',
    schema: {
      example: {
        message: '📦 Получены данные из базы',
        provider: 'brokinvest',
        total: 800,
        perPage: 100,
        products: [
          {
            id: 26525,
            provider: 'brokinvest',
            category: 'Балка',
            name: 'Балка 30К1х12000 ГОСТ 35087; 27772 С355 ТМ ',
            size: '',
            length: '12000',
            mark: 'ГОСТ 35087; 27772',
            weight: '0',
            units1: 'т',
            price1: '96400',
            units2: '',
            price2: '',
            units3: '',
            price3: '',
            location: '5',
            link: 'https://www.brokinvest.ru/product/balka-30k1x12000-gost-35087-27772-s355-tm',
            createdAt: '2025-07-31T06:16:40.732Z',
            updatedAt: '2025-07-31T06:16:40.732Z',
            available: true,
            image:
              'https://back.brokinvest.ru/api/v1/files/catalog/2845e973-5b37-482c-8ef3-8471a7ad0963.jpg',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(@Query('page') page = '1', @Query('limit') limit = '100') {
    try {
      const { skip, take } = this.normalizePagination(page, limit);

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(this.PROVIDER_NAME, { skip, take }),
        this.productsDb.countProducts(this.PROVIDER_NAME),
      ]);

      return {
        message: '📦 Получены данные из базы',
        provider: this.PROVIDER_NAME,
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
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами Brokinvest' })
  @ApiResponse({ status: 200, description: 'Файл Excel успешно сгенерирован и отправлен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка при формировании файла' })
  async downloadExcel(@Res() res: Response) {
    const provider = this.PROVIDER_NAME;
    const fileName = `${provider}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    try {
      await this.service.exportToExcelFromDb(filePath, provider);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('Файл не найден');
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Ошибка при скачивании файла: ${error.message}`);
      return res.status(500).send('Ошибка при формировании файла');
    }
  }
}
