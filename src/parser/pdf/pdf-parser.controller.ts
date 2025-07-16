import { Controller, Get } from '@nestjs/common';
import { PdfParserService } from './pdf-parser.service';

@Controller('pdf')
export class PdfParserController {
  constructor(private readonly pdfParserService: PdfParserService) {}

  @Get('manual')
  async extractFromManualFile() {
    const products = await this.pdfParserService.parseManualFile();
    return { products };
  }
}
