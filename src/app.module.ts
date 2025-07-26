import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { McParserModule } from './parser/mc/mc.module';
import { PdfParserModule } from './parser/pdf/pdf-parser.module';
import { MetallotorgModule } from './parser/metallotorg/metallotorg.module';
import { KtzParserModule } from './parser/ktzholding/ktzholding.module';
import { PrismaModule } from './prisma/prisma.module';
import { DiposParserModule } from './parser/dipos/dipos.module';

@Module({
  imports: [ McParserModule, MetallotorgModule, KtzParserModule, PdfParserModule, PrismaModule, DiposParserModule],
  controllers: [AppController, ],
  providers: [AppService ],
})
export class AppModule {}
