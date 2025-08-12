import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

export class GetProductsResponseDto {
  @ApiProperty({ example: '📦 Получены данные из базы' })
  message: string;

  @ApiProperty({ example: 'provider name' })
  provider: string;

  @ApiProperty({ example: 999 })
  total: number;

  @ApiProperty({ example: 100 })
  perPage: number;

  @ApiProperty({ type: [ProductResponseDto] })
  products: ProductResponseDto[];
}
