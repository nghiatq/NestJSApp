import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeDirectoryDto {
  @ApiProperty({
    description: 'The path to the directory containing Java files to analyze',
    example: 'src/main/java',
    required: true
  })
  directoryPath: string;
}
