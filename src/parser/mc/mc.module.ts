import { Module } from '@nestjs/common';
import { McParserService } from './mc.service';
import { McParserController } from './mc.controller';

@Module({
  controllers: [McParserController],
  providers: [McParserService],
})
export class McParserModule {}
