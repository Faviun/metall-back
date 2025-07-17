import { Module } from '@nestjs/common';
import { MetallotorgParserService } from './metallotorg.service';
import { MetallotorgParserController } from './metallotorg.controller';

@Module({
  controllers: [MetallotorgParserController],
  providers: [MetallotorgParserService],
})
export class MetallotorgModule {}
