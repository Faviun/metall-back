import { Module } from '@nestjs/common';
import { ParserController } from './ktzholding.controller';
import { ParserService } from './ktzholding.service';

@Module({
  controllers: [ParserController],
  providers: [ParserService],
})
export class KtzParserModule {}