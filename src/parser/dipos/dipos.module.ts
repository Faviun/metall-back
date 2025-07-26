import { Module } from '@nestjs/common';
import { DiposParserController } from './dipos.controller';
import { DiposParserService } from './dipos.service';

@Module({
  controllers: [DiposParserController],
  providers: [DiposParserService],
})
export class DiposParserModule {}
