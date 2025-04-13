import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JavaAnalyzerService } from './java-analyzer.service';
import { AnalyzeDirectoryDto } from './dto/analyze-directory.dto';
import { AnalysisResultDto } from './dto/analysis-result.dto';

@ApiTags('java-analyzer')
@Controller('java-analyzer')
export class JavaAnalyzerController {
  constructor(private readonly javaAnalyzerService: JavaAnalyzerService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze Java files in a directory (POST method)' })
  @ApiResponse({
    status: 200,
    description: 'The analysis results',
    type: [AnalysisResultDto]
  })
  async analyzeDirectory(@Body() analyzeDirectoryDto: AnalyzeDirectoryDto): Promise<AnalysisResultDto[]> {
    return this.javaAnalyzerService.analyzeDirectory(analyzeDirectoryDto.directoryPath);
  }

  @Get('analyze/:directoryPath')
  @ApiOperation({ summary: 'Analyze Java files in a directory (GET method)' })
  @ApiParam({
    name: 'directoryPath',
    description: 'The path to the directory containing Java files to analyze',
    example: 'test-data'
  })
  @ApiResponse({
    status: 200,
    description: 'The analysis results',
    type: [AnalysisResultDto]
  })
  async analyzeDirectoryGet(@Param('directoryPath') directoryPath: string): Promise<AnalysisResultDto[]> {
    return this.javaAnalyzerService.analyzeDirectory(directoryPath);
  }
}
