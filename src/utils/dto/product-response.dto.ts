import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() provider: string;
  @ApiProperty() category: string;
  @ApiProperty() name: string;
  @ApiProperty() size: string;
  @ApiProperty() length: string;
  @ApiProperty() mark: string;
  @ApiProperty() weight: string;
  @ApiProperty() units1: string;
  @ApiProperty() price1: string;
  @ApiProperty() units2: string;
  @ApiProperty() price2: string;
  @ApiProperty() units3: string;
  @ApiProperty() price3: string;
  @ApiProperty() location: string;
  @ApiProperty() link: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty() available: boolean;
  @ApiProperty() image: string;
}
