import {
  Controller,
  Get,
  Logger,
  Query,
  StreamableFile,
  NotFoundException,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { BrokinvestParserService } from './brokinvest.service';
import { GetProductsService } from 'src/database/get-products.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiProduces } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';
import { GetProductsResponseDto } from 'src/utils/dto/get-products-response.dto';

@ApiTags('Парсер Brokinvest')
@Controller('parser-brokinvest')
export class BrokinvestParserController {
  private readonly logger = new Logger(BrokinvestParserController.name);
  private readonly MAX_LIMIT = 100;
  private readonly EXPORT_DIR = 'exports';
  private readonly PROVIDER_NAME = 'brokinvest';

  constructor(
    private readonly service: BrokinvestParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: number, limit?: number): { skip: number; take: number } {
    const pageNum = Math.max(1, page || 1);
    const take = Math.min(limit || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  // @Get('parse')
  // @ApiOperation({ summary: 'Запустить парсер Brokinvest' })
  // @ApiResponse({ status: 200, description: 'Парсинг успешно завершён' })
  // async runParser() {
  //   await this.service.fetchAllProducts();
  //   return { message: '✅ Парсинг завершён' };
  // }

  @Get('start') //change on Post
  @ApiOperation({ summary: 'Запустить парсер Brokinvest' })
  @ApiResponse({ status: 200, description: 'Парсинг Brokinvest запущен' })
  async startParsing() {
    this.service.fetchAllProducts();
    return { message: 'Парсер запущен' };
  }

  @Get('stop') //change on Post
  @ApiOperation({ summary: 'Отменить парсер Brokinvest' })
  @ApiResponse({ status: 200, description: 'Парсинг Brokinvest остановлен' })
  stopParsing() {
    this.service.cancelParsing();
    return { message: 'Запрос на остановку отправлен' };
  }

  @Get('data')
  @ApiOperation({ summary: 'Получить сохранённые товары из базы' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiResponse({ status: 200, description: 'Успешный ответ', type: GetProductsResponseDto })
  @ApiResponse({ status: 500, description: 'Ошибка при получении данных' })
  async getSavedData(@Query() query: PaginationQueryDto) {
    try {
      const { page, limit } = query;
      const { skip, take } = this.normalizePagination(page, limit);

      const [products, total] = await Promise.all([
        this.productsDb.getProducts(this.PROVIDER_NAME, { skip, take }),
        this.productsDb.countProducts(this.PROVIDER_NAME),
      ]);

      const filterProducts = products.map(({ uniqueString, ...rest }) => rest);

      return {
        message: '📦 Получены данные из базы',
        provider: this.PROVIDER_NAME,
        total,
        perPage: take,
        filterProducts,
      };
    } catch (error) {
      this.logger.error(`Ошибка при получении данных: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при получении данных');
    }
  }

  @Get('download')
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами Brokinvest' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ status: 200, description: 'Файл Excel успешно сгенерирован и отправлен' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка при формировании файла' })
  async downloadExcel(): Promise<StreamableFile> {
    const provider = this.PROVIDER_NAME;
    const fileName = `${provider}.xlsx`;
    const filePath = path.join(process.cwd(), this.EXPORT_DIR, fileName);

    try {
      await this.service.exportToExcelFromDb(provider, filePath);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Файл не найден');
      }

      const fileStream = createReadStream(filePath);
      return new StreamableFile(fileStream, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
      });
    } catch (error) {
      this.logger.error(`Ошибка при скачивании файла: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при формировании файла');
    }
  }
}
