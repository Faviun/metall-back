import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class GetProductsService {
  private readonly prisma = new PrismaClient();

  async getProducts(provider?: string | string[], pagination?: { skip?: number; take?: number }) {
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const whereClause: any = {
      AND: [
        {
          // OR: [{ createdAt: { gte: today } }, { updatedAt: { gte: today } }],
        },
      ],
    };

    if (provider) {
      whereClause.AND.push({
        provider: Array.isArray(provider) ? { in: provider } : provider,
      });
    }

    return this.prisma.parser.findMany({
      where: whereClause,
      select: {
        id: true,
        provider: true,
        category: true,
        name: true,
        size: true,
        length: true,
        mark: true,
        weight: true,
        units1: true,
        price1: true,
        units2: true,
        price2: true,
        units3: true,
        price3: true,
        location: true,
        link: true,
        uniqueString: true,
        createdAt: true,
        updatedAt: true,
        available: true,
        image: true,
      },
      skip: pagination?.skip,
      take: pagination?.take,
      orderBy: { id: 'desc' },
    });
  }

  async countProducts(provider?: string | string[]): Promise<number> {
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const whereClause: any = {
      AND: [
        {
          // OR: [{ createdAt: { gte: today } }, { updatedAt: { gte: today } }],
        },
      ],
    };

    if (provider) {
      whereClause.AND.push({
        provider: Array.isArray(provider) ? { in: provider } : provider,
      });
    }

    return this.prisma.parser.count({ where: whereClause });
  }
}
