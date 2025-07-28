import { Controller, Get } from '@nestjs/common';
import { BrokinvestParserService } from './brokinvest.service';

@Controller('parser-brokinvest')
export class BrokinvestParserController {
  constructor(private readonly service: BrokinvestParserService) {}

  @Get('parse')
  async runParser() {
    await this.service.fetchAllProducts();
    return { message: '✅ Парсинг завершён' };
  }
}
