import { Module } from '@nestjs/common';
import { McParserService } from './mc-armatura.service';
import { McParserController } from './mc-armatura.controller';

@Module({
  controllers: [McParserController],
  providers: [McParserService],
})
export class McParserModule {}
