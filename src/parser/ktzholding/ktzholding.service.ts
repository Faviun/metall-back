import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { ctzCategories } from './ktzholding-categories';


@Injectable()
export class ParserService {
    private readonly logger = new Logger(ParserService.name);
    private readonly categories = ctzCategories;

  async fetchAllProducts(): Promise<any[]> {
    const allProducts: any[] = [];

    for (const category of this.categories) {
        const res = await axios.get(category.url, {
            headers: { 'Content-Type': 'application/json' },
    });

    const { products } = res.data;

    for (const product of products) {
      product.categoryName = category.nameRu || '';
      product.categoryLink = category.nameEn || 'unknown';
    }

    allProducts.push(...products);

    if (products.length === 0) {
        this.logger.warn(`Нет данных для категории: ${category.nameRu}`);
        continue;
    }
        this.logger.log(`Получено ${products.length} товаров из категории: ${category.nameRu}`);
    }


    return allProducts
        .filter((product) => product.prices?.[0].wh === 'Дмитров' || product.prices?.[0].wh === 'Ивантеевка')
        .map((product) => {
            const firstPrice = product.prices?.[0];
    
            return {
                id: product.id,
                provider: 'ktzholding',
                category: product.categoryName,
                name: product.name,
                size: product.size,
                mark: product.mark_of_steel,
                weight: product.weight,
                location: product.prices ? firstPrice.wh : null,
                price: product.prices ? firstPrice.price : null,
                image: product.image ? `https://ktzholding.com${product.image}` : null,
                link: `https://ktzholding.com/category/${product.categoryLink}/${product.id}`,
    }})
  }

  

  
}