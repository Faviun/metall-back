import { Controller, Delete, Get, Logger, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { GetProductsService } from './database/get-products.service';
import { DeleteProductsService } from './database/delete-products.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { ExportExcelProductsService } from './database/export-excel.service';

@ApiTags('Управление данными')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly productsDb: GetProductsService,
    private readonly deleteService: DeleteProductsService,
    private readonly exportService: ExportExcelProductsService,
  ) {}

  private readonly logger = new Logger(AppController.name);
  private readonly MAX_LIMIT = 100;

  private normalizePagination(page?: string, limit?: string): { skip: number; take: number } {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(Number(limit) || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get()
  @ApiOperation({ summary: 'Приветственное сообщение' })
  @ApiResponse({ status: 200, description: 'Возвращает приветственное сообщение' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('data')
  @ApiOperation({ summary: 'Получить сохранённые данные из базы' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Номер страницы' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: '100',
    description: 'Количество элементов на странице',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    example: 'brokinvest,mc,dipos',
    description: 'Имя провайдера или список через запятую',
  })
  @ApiResponse({
    status: 200,
    description: 'Успешно получены данные',
    schema: {
      example: {
        message: '📦 Получены данные из базы',
        provider: ['mc', 'dipos'],
        total: 5000,
        perPage: 100,
        products: [
          {
            title: 'Арматура A500C',
            price: 45000,
            unit: 'тн',
            link: 'https://example.com/product/1',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('provider') provider?: string | string[],
  ) {
    try {
      const { skip, take } = this.normalizePagination(page, limit);

      // Поддержка одного или нескольких провайдеров
      const providerList = Array.isArray(provider)
        ? provider
        : provider
          ? provider.split(',')
          : undefined;

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(providerList, { skip, take }),
        this.productsDb.countProducts(providerList),
      ]);

      return {
        message: '📦 Получены данные из базы',
        provider: providerList || 'Все',
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
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами от выбранных поставщиков' })
  @ApiResponse({ status: 200, description: 'Файл Excel успешно сгенерирован и отправлен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка при формировании файла' })
  @ApiQuery({
    name: 'provider',
    required: true,
    example: 'brokinvest,mc,dipos',
    description: 'Имя провайдера или список через запятую',
  })
  async downloadExcel(@Query('provider') provider: string, @Res() res: Response): Promise<void> {
    const providerList = provider ? provider.split(',') : undefined;

    if (!provider) {
      res.status(400).send('Параметр provider обязателен');
      return;
    }

    const fileName = `data.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    try {
      await this.exportService.exportToExcelFromDb(filePath, providerList);

      if (!fs.existsSync(filePath)) {
        res.status(404).send('Файл не найден');
        return;
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
      this.logger.error(`Ошибка при скачивании файла Excel: ${error.message}`);
      res.status(500).send('Ошибка при формировании файла');
    }
  }

  @Delete('data')
  @ApiOperation({ summary: 'Удалить данные по провайдеру и возрасту' })
  @ApiQuery({
    name: 'provider',
    required: false,
    example: 'mc',
    description: 'Провайдер, чьи данные нужно удалить',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    example: '30',
    description: 'Удалять только те данные, которые старше N дней',
  })
  @ApiResponse({
    status: 200,
    description: 'Удаление завершено',
    schema: {
      example: {
        message: '🗑️ Удаление завершено',
        provider: 'mc',
        olderThanDays: 30,
        deletedCount: 123,
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Ошибка при удалении данных' })
  async deleteData(
    @Query('provider') provider?: string | string[],
    @Query('days') daysRaw?: string,
  ) {
    try {
      const days = daysRaw ? Number(daysRaw) : undefined;

      const result = await this.deleteService.deleteByProviderAndAge(provider, days);

      return {
        message: '🗑️ Удаление завершено',
        provider: provider || 'не указан',
        olderThanDays: days || 'не указано',
        deletedCount: result.count,
      };
    } catch (error) {
      return {
        message: '❌ Ошибка при удалении данных',
        error: error.message,
      };
    }
  }

  @Get('delete-manual') //Временное решение для ручного удаления
  @ApiOperation({ summary: 'Ручное удаление данных (временный эндпоинт)' })
  @ApiQuery({
    name: 'provider',
    required: false,
    example: 'dipos',
    description: 'Провайдер, чьи данные нужно удалить',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    example: '10',
    description: 'Удалить записи старше указанного числа дней',
  })
  @ApiResponse({
    status: 200,
    description: 'Удаление вручную завершено',
    schema: {
      example: {
        message: '🗑️ Удаление вручную',
        deletedCount: 45,
      },
    },
  })
  async deleteManual(
    @Query('provider') provider?: string | string[],
    @Query('days') daysRaw?: string,
  ) {
    const days = daysRaw ? Number(daysRaw) : undefined;
    const result = await this.deleteService.deleteByProviderAndAge(provider, days);
    return {
      message: '🗑️ Удаление вручную',
      deletedCount: result.count,
    };
  }
}
