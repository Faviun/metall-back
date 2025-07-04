import { Controller, Get } from '@nestjs/common';
import { McParserService } from './mc-armatura.service';

@Controller('parser')
export class McParserController {
  constructor(private readonly parserService: McParserService) {}

  @Get('armatura')
  async parseArmatura() {
    return this.parserService.parseArmatura();
  }
}
