import { Controller, Get } from '@nestjs/common';
import { ParserService } from './ktzholding.service';

@Controller('parser-ktzholding')
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Get('parse')
  async getAllProducts() {
    return this.parserService.fetchAllProducts();
  }
}