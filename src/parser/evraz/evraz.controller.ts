// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { EvrazService } from './evraz.service';

@Controller()
export class EvrazController {
  constructor(private readonly evrazService: EvrazService) {}

  @Get('parser-evraz')
  async parseProductPage() {
    const url = 'https://evraz.market/metalloprokat/armatura/armatura_gladkaya/';
    return this.evrazService.parseProductPage(url);
  }
}
