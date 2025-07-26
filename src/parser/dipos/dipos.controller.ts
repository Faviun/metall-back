import { Controller, Get } from "@nestjs/common";
import { DiposParserService } from "./dipos.service";

@Controller()
export class DiposParserController {
  constructor(private readonly diposParserService: DiposParserService) {}

  @Get('parser-dipos')
  async parse() {
    await this.diposParserService.fetchAndDownloadPriceList();
    return { status: 'OK' };
  }

  @Get('dipos-data')
async parseData() {
  const data = await this.diposParserService.parseDownloadedFile();
  return data
}
}