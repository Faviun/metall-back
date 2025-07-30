import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DeleteProductsService {
  private readonly logger = new Logger(DeleteProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deleteByProviderAndAge(
    provider?: string | string[],
    days?: number,
  ): Promise<{ count: number }> {
    if (!provider || (Array.isArray(provider) && provider.length === 0)) {
      throw new Error('❌ Не указан провайдер для удаления');
    }

    const whereClause: any = {
      provider: Array.isArray(provider) ? { in: provider } : provider,
    };

    if (typeof days === 'number' && !isNaN(days) && days > 0) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);

      whereClause.AND = [
        {
          AND: [{ createdAt: { lt: thresholdDate } }, { updatedAt: { lt: thresholdDate } }],
        },
      ];
    }

    const deleted = await this.prisma.parser.deleteMany({ where: whereClause });

    this.logger.log(
      `🗑️ Удалено товаров: ${deleted.count} (провайдер: ${JSON.stringify(provider)}, старше ${days || '∞'} дней)`,
    );

    return { count: deleted.count };
  }
}
