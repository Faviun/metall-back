import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ktzholdingParserService } from './ktzholding.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from 'src/database/get-products.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Парсер Ktzholding')
@Controller('parser-ktzholding')
export class ktzholdingParserController {
  private readonly logger = new Logger(ktzholdingParserController.name);
  private readonly MAX_LIMIT = 100;
  private readonly PROVIDER_NAME = 'ktzholding';

  constructor(
    private readonly parserService: ktzholdingParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get('parse')
  @ApiOperation({ summary: 'Запустить парсер Ktzholding' })
  @ApiResponse({ status: 200, description: 'Парсинг успешно завершён' })
  async parseAndSave() {
    await this.parserService.fetchAllProducts();

    return {
      message: '✅ Парсинг завершён, данные сохранены в базу по мере обработки.',
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
        total: 987,
        perPage: 100,
        products: [
          {
            id: 21124,
            provider: 'ktzholding',
            category: 'Швеллер',
            name: 'Швеллер 16П',
            size: '16П',
            length: '12000',
            mark: 'Ст3',
            weight: '0',
            units1: 'Цена FCA, т. ₽',
            price1: '71000',
            units2: '',
            price2: '',
            units3: '',
            price3: '',
            location: 'Дмитров',
            link: 'https://ktzholding.com/category/shveller/a3374fd0-df03-459d-92a9-5026cc00e904',
            createdAt: '2025-07-31T05:18:05.746Z',
            updatedAt: '2025-07-31T05:18:05.746Z',
            available: true,
            image: 'https://ktzholding.com/media/subcategory_image/швеллер_2.svg',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('provider') provider?: string,
  ) {
    try {
      const { skip, take } = this.normalizePagination(page, limit);
      const providerFilter = provider || this.PROVIDER_NAME;

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(providerFilter, { skip, take }),
        this.productsDb.countProducts(providerFilter),
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
