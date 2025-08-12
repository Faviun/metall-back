import {
  Controller,
  Get,
  Query,
  Logger,
  StreamableFile,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DiposParserService } from './dipos.service';
import * as path from 'path';
import * as fs from 'fs';
import { GetProductsService } from 'src/database/get-products.service';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';
import { GetProductsResponseDto } from 'src/utils/dto/get-products-response.dto';

@ApiTags('Парсер Dipos')
@Controller('parser-dipos')
export class DiposParserController {
  private readonly logger = new Logger(DiposParserController.name);
  private readonly EXPORT_DIR = 'exports';
  private readonly MAX_LIMIT = 100;
  private readonly PROVIDER_NAME = 'dipos';

  constructor(
    private readonly service: DiposParserService,
    private readonly productsDb: GetProductsService,
  ) {}

  private normalizePagination(page?: number, limit?: number): { skip: number; take: number } {
    const pageNum = Math.max(1, page || 1);
    const take = Math.min(limit || this.MAX_LIMIT, this.MAX_LIMIT);
    const skip = (pageNum - 1) * take;
    return { skip, take };
  }

  @Get('start') // Лучше потом сделать POST
  @ApiOperation({ summary: 'Запустить полный парсинг Dipos' })
  @ApiResponse({ status: 200, description: 'Парсинг завершён' })
  async startParsing() {
    try {
      const products = await this.service.parse();
      return {
        message: 'Парсер запущен',
      };
    } catch (error) {
      this.logger.error(`Ошибка запуска парсера: ${error.message}`);
      return {
        message: '❌ Ошибка запуска парсинга',
        error: error.message,
      };
    }
  }

  @Get('stop') // Лучше потом сделать POST
  @ApiOperation({ summary: 'Остановить парсер Dipos' })
  @ApiResponse({ status: 200, description: 'Парсер остановлен' })
  stopParsing() {
    this.service.cancelParsing();
    return { message: 'Запрос на остановку парсинга отправлен' };
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

      return {
        message: '📦 Данные успешно получены',
        provider: this.PROVIDER_NAME,
        total,
        perPage: take,
        data: products.map(({ uniqueString, ...rest }) => rest),
      };
    } catch (error) {
      this.logger.error(`Ошибка получения данных: ${error.message}`);
      return {
        message: '❌ Ошибка при получении данных',
        error: error.message,
      };
    }
  }

  @Get('download')
  @ApiOperation({ summary: 'Скачать Excel-файл с товарами Dipos' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadExcel(): Promise<StreamableFile> {
    const provider = this.PROVIDER_NAME;
    const fileName = `${provider}.xlsx`;
    const filePath = path.join(process.cwd(), this.EXPORT_DIR, fileName);

    try {
      await this.service.exportToExcelFromDb(provider, filePath);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Файл не найден');
      }

      const fileStream = fs.createReadStream(filePath);
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
