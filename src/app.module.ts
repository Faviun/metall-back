import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { McParserModule } from './parser/mc/armatura/mc-parser.module';
import { DiposModule } from './parser/dipos/dipos.module';

@Module({
  imports: [ McParserModule, DiposModule],
  controllers: [AppController, ],
  providers: [AppService, ],
})
export class AppModule {}
