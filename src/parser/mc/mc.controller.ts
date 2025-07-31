import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { McParserService } from './mc.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from 'src/database/get-products.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Парсер Металл Сервис')
@Controller('parser-mc')
export class McParserController {
  private readonly logger = new Logger(McParserController.name);
  private readonly MAX_LIMIT = 100;
  private readonly PROVIDER_NAME = 'МЕТАЛЛ СЕРВИС';

  constructor(
    private readonly parserService: McParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get('parse')
  @ApiOperation({ summary: 'Запустить парсер Металл Сервис' })
  @ApiResponse({ status: 200, description: 'Парсинг успешно завершён' })
  async parseAll() {
    await this.parserService.parseAll();

    return {
      message: '✅ Парсинг завершён, данные сохранены по мере обработки каждой страницы',
    };
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
        provider: 'МЕТАЛЛ СЕРВИС',
        total: 1728,
        perPage: 100,
        products: [
          {
            id: 25102,
            provider: 'МЕТАЛЛ СЕРВИС',
            category: 'Лист оцинкованный',
            name: 'Лист оцинкованный 2х1250х2500 ст 220 Zn120 Н пас',
            size: '2',
            length: '',
            mark: 'Ст220',
            weight: null,
            units1: 'Цена руб/шт',
            price1: '4543',
            units2: 'Цена, руб от 5 до 10т',
            price2: '87690',
            units3: null,
            price3: null,
            location: 'Москва',
            link: 'https://mc.ru/metalloprokat/list_ocinkovannyy_2x1250x2500_st_220_zn120_n_pas_razmer_2_marka_st220',
            createdAt: '2025-07-31T05:39:40.613Z',
            updatedAt: '2025-07-31T05:39:40.613Z',
            available: true,
            image: 'https://mc.ru/img/prodpict/gal/mini/stal_listovaya_ocinkovannaya.jpg',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(@Query('page') page = '1', @Query('limit') limit = '100') {
    try {
      const { skip, take } = this.normalizePagination(page, limit);
      const provider = this.PROVIDER_NAME;

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(provider, { skip, take }),
        this.productsDb.countProducts(provider),
      ]);

      return {
        message: '📦 Получены данные из базы',
        provider,
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
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами Ktzholding' })
  @ApiResponse({ status: 200, description: 'Файл Excel успешно сгенерирован и отправлен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка при формировании файла' })
  async downloadExcel(@Res() res: Response) {
    const provider = this.PROVIDER_NAME;
    const fileName = `${provider}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    try {
      await this.parserService.exportToExcelFromDb(filePath, provider);

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
