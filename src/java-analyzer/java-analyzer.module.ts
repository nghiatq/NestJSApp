import { Module } from '@nestjs/common';
import { JavaAnalyzerController } from './java-analyzer.controller';
import { JavaAnalyzerService } from './java-analyzer.service';

@Module({
  controllers: [JavaAnalyzerController],
  providers: [JavaAnalyzerService],
})
export class JavaAnalyzerModule {}
