import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { MetallotorgParserService } from './metallotorg.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from 'src/database/get-products.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Парсер Metallotorg')
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
  @ApiOperation({ summary: 'Запустить парсер Metallotorg' })
  @ApiResponse({ status: 200, description: 'Парсинг успешно завершён' })
  async parseAndSave() {
    await this.parserService.parseCategory();

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
        total: 3012,
        perPage: 100,
        products: [
          {
            id: 19898,
            provider: 'metallotorg',
            category: 'Поковка',
            name: 'Поковка сталь 09Г2С 670(640) мм',
            size: '670(640) мм',
            length: 'б/обточки',
            mark: 'ГОСТ 8479-70, 19281-2014, УЗК-',
            weight: '2468.260',
            units1: 'Цена 1 - 5 т.',
            price1: '161890 руб.',
            units2: 'Цена от 5 т. до 15 т.',
            price2: '160890 руб.',
            units3: 'Цена \u003E 15 т.',
            price3: '159890 руб.',
            location: 'Электроугли (Москва)',
            link: 'https://metallotorg.ru/info/metallobaza/elektrougli/pokovka/pokovka-st09g2s/rzm-670640-mm/dl-b-obtochki/',
            createdAt: '2025-07-31T05:11:57.485Z',
            updatedAt: '2025-07-31T05:11:57.485Z',
            available: null,
            image: null,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(@Query('page') page = '1', @Query('limit') limit = '100') {
    try {
      const { skip, take } = this.normalizePagination(page, limit);
      const provider = 'metallotorg';

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(provider, { skip, take }),
        this.productsDb.countProducts(provider),
      ]);

      return {
        message: '📦 Получены данные из базы',
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
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами Metallotorg' })
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
