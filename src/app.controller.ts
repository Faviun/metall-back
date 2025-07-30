import { Controller, Delete, Get, Logger, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { GetProductsService } from './database/get-products.service';
import { DeleteProductsService } from './database/delete-products.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly productsDb: GetProductsService,
    private readonly deleteService: DeleteProductsService,
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
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('data')
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

  @Delete('data')
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
