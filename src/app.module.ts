import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JavaAnalyzerModule } from './java-analyzer/java-analyzer.module';

@Module({
  imports: [JavaAnalyzerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
