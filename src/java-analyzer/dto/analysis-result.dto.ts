import { ApiProperty } from '@nestjs/swagger';
import { AnalysisResult, SqlParagraph } from '../java-analyzer.service';

export class SqlParagraphDto implements SqlParagraph {
  @ApiProperty({
    description: 'The starting line number of the SQL paragraph',
    example: 22
  })
  lineStart: number;

  @ApiProperty({
    description: 'The ending line number of the SQL paragraph',
    example: 25
  })
  lineEnd: number;

  @ApiProperty({
    description: 'The content of the SQL paragraph (code context)',
    example: 'String sql = "SELECT * FROM users";'
  })
  content: string;

  @ApiProperty({
    description: 'The SQL statements found in the paragraph',
    example: ['SELECT * FROM users']
  })
  sqlStatements: string[];
}

export class AnalysisResultDto implements AnalysisResult {
  @ApiProperty({
    description: 'The path to the analyzed Java file',
    example: 'src/main/java/com/example/dao/UserDao.java'
  })
  filePath: string;

  @ApiProperty({
    description: 'The SQL paragraphs found in the file',
    type: [SqlParagraphDto]
  })
  sqlParagraphs: SqlParagraphDto[];
}
