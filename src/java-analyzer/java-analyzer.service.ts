import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { parse, BaseJavaCstVisitorWithDefaults } from 'java-parser';

export interface AnalysisResult {
  filePath: string;
  sqlParagraphs: SqlParagraph[];
}

export interface SqlParagraph {
  lineStart: number;
  lineEnd: number;
  content: string;
  sqlStatements: string[];
}

// Custom visitor to find SQL statements in Java code
class SqlStringVisitor extends BaseJavaCstVisitorWithDefaults {
  public sqlStrings: Array<{
    value: string;
    startLine: number;
    endLine: number;
    context: string;
  }> = [];

  private sqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'GROUP BY', 'ORDER BY',
    'HAVING', 'UNION', 'INTERSECT', 'EXCEPT'
  ];

  private sqlRegex: RegExp;
  private fileContent: string;

  constructor(fileContent: string) {
    super();
    this.fileContent = fileContent;
    this.sqlRegex = new RegExp(
      `(${this.sqlKeywords.join('|')})`,
      'i'
    );
    this.validateVisitor();
  }

  // Helper method to determine the line range for SQL statements
  private determineLineRange(node: any, currentLine: number, _sqlValue: string): { startLine: number, endLine: number, context: string } {
    const lines = this.fileContent.split('\n');
    let startLine = currentLine;
    let endLine = currentLine;

    // 1. Check if this is a variable declaration
    if (node.type === 'VariableDeclaration') {
      // For variable declarations, use the declaration line as the start
      startLine = node.location?.startLine || currentLine;
      endLine = node.location?.endLine || currentLine;
    }
    // 2. Check if this is a string literal
    else if (node.tokenType?.name === 'StringLiteral') {
      // For string literals, try to find the variable declaration
      const currentLineText = lines[currentLine - 1] || '';

      if (currentLineText.includes('String ') && currentLineText.includes('=')) {
        // This is already a variable declaration line
        startLine = currentLine;
      } else {
        // Look for the variable declaration in previous lines
        for (let i = currentLine - 2; i >= 0; i--) {
          const line = lines[i];
          if (line.includes('String ') && line.includes('=')) {
            startLine = i + 1; // 1-based line numbers
            break;
          }
        }
      }

      endLine = node.endLine || currentLine;
    }
    // 3. Check if this is a StringBuilder operation
    else if (node.type === 'MethodInvocation' && node.children?.identifier?.[0]?.image === 'append') {
      // For StringBuilder operations, find the declaration line
      let builderVarName = '';

      // Extract the variable name from the method call
      if (node.children?.primary?.[0]?.children?.primaryPrefix?.[0]?.children?.primary?.[0]?.children?.identifier) {
        builderVarName = node.children.primary[0].children.primaryPrefix[0].children.primary[0].children.identifier[0].image;
      }

      // Find the declaration line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('StringBuilder ' + builderVarName) ||
            line.includes('StringBuilder ' + builderVarName + ' ')) {
          startLine = i + 1; // 1-based line numbers
          break;
        }
      }

      // If we couldn't find the declaration, use the current node's line
      if (startLine === currentLine && node.location?.startLine) {
        startLine = node.location.startLine;
      }

      // Use the current node's end line
      endLine = node.location?.endLine || currentLine;
    }

    // Get the full content from start to end line
    const context = lines.slice(
      Math.max(0, startLine - 1), // -1 to convert to 0-based index
      Math.min(lines.length, endLine)
    ).join('\n');

    return { startLine, endLine, context };
  }

  // Visit method to find SQL in string literals
  visit(cst: any): void {
    this.findSqlInStrings(cst);
    this.findStringOperations(cst);
  }

  // Find string operations like concatenation and StringBuilder
  private findStringOperations(node: any): void {
    // We'll implement this to track string operations across multiple lines
    if (!node) return;

    // Track variable assignments that might be part of SQL construction
    this.trackVariableAssignments(node);
  }

  // Track variable assignments to find multi-line SQL construction
  private trackVariableAssignments(node: any): void {
    // This will be implemented to track string variables and their operations
    if (!node) return;

    // If it's an array, process each element
    if (Array.isArray(node)) {
      for (const item of node) {
        this.trackVariableAssignments(item);
      }
      return;
    }

    // If it's an object, process each property
    if (node && typeof node === 'object') {
      // Check if this is a variable declaration with string concatenation
      if (node.type === 'VariableDeclaration' && node.children && node.children.variableDeclarator) {
        this.processVariableDeclarators(node.children.variableDeclarator);
      }

      // Check if this is a method invocation (for StringBuilder)
      if (node.type === 'MethodInvocation' && node.children) {
        this.processMethodInvocation(node);
      }

      // Recursively process all properties
      for (const key in node) {
        this.trackVariableAssignments(node[key]);
      }
    }
  }

  // Process variable declarators to find string concatenation
  private processVariableDeclarators(declarators: any[]): void {
    if (!declarators || !Array.isArray(declarators)) return;

    for (const declarator of declarators) {
      if (declarator.children && declarator.children.variableInitializer) {
        const initializer = declarator.children.variableInitializer[0];
        if (initializer && initializer.children && initializer.children.expression) {
          const expression = initializer.children.expression[0];

          // Check if this is a string concatenation
          if (expression.children && expression.children.additiveExpression) {
            this.processAdditiveExpression(expression.children.additiveExpression[0]);
          }
        }
      }
    }
  }

  // Process additive expressions (string concatenation)
  private processAdditiveExpression(expression: any): void {
    if (!expression || !expression.children) return;

    // Check if this is a string concatenation with SQL
    let sqlFound = false;
    let sqlContent = '';
    let currentLine = 0;

    // Process all string literals in the expression
    const stringLiterals = this.findAllStringLiterals(expression);
    for (const literal of stringLiterals) {
      const value = literal.image.substring(1, literal.image.length - 1);

      // Check if the string contains SQL
      if (this.sqlRegex.test(value)) {
        sqlFound = true;
        sqlContent += value + ' ';

        // Use the first literal's line as the current line
        if (currentLine === 0) {
          currentLine = literal.startLine;
        }
      }
    }

    // If SQL was found, add it to the results
    if (sqlFound && currentLine > 0) {
      // Find the parent variable declaration node
      const declarationNode = this.findParentVariableDeclaration(expression);

      // Determine the line range using our helper method
      const { startLine, endLine, context } = this.determineLineRange(
        declarationNode || expression,
        currentLine,
        sqlContent.trim()
      );

      this.sqlStrings.push({
        value: sqlContent.trim(),
        startLine,
        endLine,
        context
      });
    }
  }

  // Helper method to find the parent variable declaration node
  private findParentVariableDeclaration(node: any): any {
    if (!node) return null;

    // Check if this is a variable declaration
    if (node.type === 'VariableDeclaration') {
      return node;
    }

    // Check if the node has a parent
    if (node.parent) {
      return this.findParentVariableDeclaration(node.parent);
    }

    return null;
  }

  // Process method invocation (for StringBuilder)
  private processMethodInvocation(node: any): void {
    if (!node || !node.children) return;

    // Check if this is a StringBuilder append method
    if (node.children.identifier &&
        node.children.identifier[0].image === 'append' &&
        node.children.argumentList &&
        node.children.argumentList[0].children &&
        node.children.argumentList[0].children.expression) {

      const expression = node.children.argumentList[0].children.expression[0];
      if (expression.children && expression.children.primary &&
          expression.children.primary[0].children &&
          expression.children.primary[0].children.literal &&
          expression.children.primary[0].children.literal[0].children &&
          expression.children.primary[0].children.literal[0].children.StringLiteral) {

        const stringLiteral = expression.children.primary[0].children.literal[0].children.StringLiteral[0];
        const value = stringLiteral.image.substring(1, stringLiteral.image.length - 1);

        // Check if the string contains SQL
        if (this.sqlRegex.test(value)) {
          // Get the current line from the string literal
          const currentLine = stringLiteral.startLine || (node.location?.startLine || 1);

          // Determine the line range using our helper method
          const { startLine, endLine, context } = this.determineLineRange(
            node,
            currentLine,
            value
          );

          this.sqlStrings.push({
            value,
            startLine,
            endLine,
            context
          });
        }
      }
    }
  }

  // Find all string literals in an expression
  private findAllStringLiterals(node: any): any[] {
    const literals: any[] = [];

    if (!node) return literals;

    // If this is a string literal, add it
    if (node.image && typeof node.image === 'string' &&
        node.startLine && node.endLine &&
        node.tokenType && node.tokenType.name === 'StringLiteral') {
      literals.push(node);
      return literals;
    }

    // If it's an array, process each element
    if (Array.isArray(node)) {
      for (const item of node) {
        literals.push(...this.findAllStringLiterals(item));
      }
      return literals;
    }

    // If it's an object, process each property
    if (node && typeof node === 'object') {
      for (const key in node) {
        literals.push(...this.findAllStringLiterals(node[key]));
      }
    }

    return literals;
  }

  // Helper method to find SQL in string literals
  private findSqlInStrings(node: any): void {
    if (!node) return;

    // Check if this is a string literal token
    if (node.image && typeof node.image === 'string' &&
        node.startLine && node.endLine &&
        node.tokenType && node.tokenType.name === 'StringLiteral') {

      const value = node.image.substring(1, node.image.length - 1);

      // Skip if the string is empty or doesn't contain SQL
      if (!value.trim() || !this.sqlRegex.test(value)) {
        return;
      }

      // Get the line from the file content
      const lines = this.fileContent.split('\n');
      const lineContent = lines[node.startLine - 1] || '';

      // Skip if this is in a comment line
      if (this.isCommentLine(lineContent)) {
        return;
      }

      // Skip if this is in a System.out or System.in statement
      if (this.isSystemStatement(lineContent)) {
        return;
      }

      // Determine the line range using our helper method
      const { startLine, endLine, context } = this.determineLineRange(
        node,
        node.startLine,
        value
      );

      this.sqlStrings.push({
        value,
        startLine,
        endLine,
        context
      });
    }

    // If it's an array, process each element
    if (Array.isArray(node)) {
      for (const item of node) {
        this.findSqlInStrings(item);
      }
      return;
    }

    // If it's an object, process each property
    if (node && typeof node === 'object') {
      for (const key in node) {
        this.findSqlInStrings(node[key]);
      }
    }
  }

  // Helper method to check if a line is a comment
  private isCommentLine(line: string): boolean {
    const trimmedLine = line.trim();
    // Check for single-line comments
    if (trimmedLine.startsWith('//')) {
      return true;
    }
    // Check for the start of a multi-line comment
    if (trimmedLine.startsWith('/*')) {
      return true;
    }
    // Check for the end of a multi-line comment
    if (trimmedLine.includes('*/')) {
      return true;
    }
    // Check for JavaDoc comments
    if (trimmedLine.startsWith('*') || trimmedLine.startsWith('/**')) {
      return true;
    }
    return false;
  }

  // Helper method to check if a line contains System.out or System.in
  private isSystemStatement(line: string): boolean {
    const trimmedLine = line.trim();
    // Check for System.out statements
    if (trimmedLine.includes('System.out.print') ||
        trimmedLine.includes('System.out.format') ||
        trimmedLine.includes('System.out.write')) {
      return true;
    }
    // Check for System.err statements
    if (trimmedLine.includes('System.err.print') ||
        trimmedLine.includes('System.err.format') ||
        trimmedLine.includes('System.err.write')) {
      return true;
    }
    // Check for System.in statements
    if (trimmedLine.includes('System.in')) {
      return true;
    }
    return false;
  }
}

@Injectable()
export class JavaAnalyzerService {
  private readonly logger = new Logger(JavaAnalyzerService.name);

  async analyzeDirectory(directoryPath: string): Promise<AnalysisResult[]> {
    try {
      // Ensure the directory path is absolute
      const absolutePath = path.isAbsolute(directoryPath)
        ? directoryPath
        : path.resolve(process.cwd(), directoryPath);

      this.logger.log(`Analyzing Java files in directory: ${absolutePath}`);

      // Find all .java files in the directory
      const javaFiles = await glob(`${absolutePath}/**/*.java`);

      this.logger.log(`Found ${javaFiles.length} Java files`);

      // Analyze each file
      const results: AnalysisResult[] = [];
      for (const filePath of javaFiles) {
        try {
          const result = await this.analyzeJavaFile(filePath);
          if (result.sqlParagraphs.length > 0) {
            results.push(result);
          }
        } catch (error) {
          this.logger.error(`Error analyzing file ${filePath}: ${error.message}`);
        }
      }

      // Deduplicate results
      const dedupedResults = this.deduplicateResults(results);

      return dedupedResults;
    } catch (error) {
      this.logger.error(`Error analyzing directory: ${error.message}`);
      throw error;
    }
  }

  // Helper method to deduplicate analysis results
  private deduplicateResults(results: AnalysisResult[]): AnalysisResult[] {
    // Create a new array to hold the deduplicated results
    const dedupedResults: AnalysisResult[] = [];

    // Process each file result
    for (const result of results) {
      // Deduplicate SQL paragraphs within this file
      const dedupedParagraphs = this.deduplicateSqlParagraphs(result.sqlParagraphs);

      // Only add the result if it has paragraphs after deduplication
      if (dedupedParagraphs.length > 0) {
        dedupedResults.push({
          filePath: result.filePath,
          sqlParagraphs: dedupedParagraphs
        });
      }
    }

    return dedupedResults;
  }

  // Helper method to deduplicate SQL paragraphs
  private deduplicateSqlParagraphs(paragraphs: SqlParagraph[]): SqlParagraph[] {
    if (paragraphs.length <= 1) {
      return paragraphs; // No need to deduplicate if there's only one paragraph or none
    }

    // Sort paragraphs by lineStart and then by lineEnd (descending) to prioritize larger ranges
    const sortedParagraphs = [...paragraphs].sort((a, b) => {
      if (a.lineStart !== b.lineStart) {
        return a.lineStart - b.lineStart; // Sort by lineStart ascending
      }
      return b.lineEnd - a.lineEnd; // Then by lineEnd descending (larger ranges first)
    });

    // Array to hold merged paragraphs
    const mergedParagraphs: SqlParagraph[] = [];
    let currentParagraph = sortedParagraphs[0];

    // Process each paragraph to merge overlapping ones
    for (let i = 1; i < sortedParagraphs.length; i++) {
      const nextParagraph = sortedParagraphs[i];

      // Check if paragraphs overlap or are adjacent
      if (nextParagraph.lineStart <= currentParagraph.lineEnd + 1) {
        // Merge the paragraphs
        currentParagraph = this.mergeParagraphs(currentParagraph, nextParagraph);
      } else {
        // No overlap, add the current paragraph and move to the next one
        mergedParagraphs.push(currentParagraph);
        currentParagraph = nextParagraph;
      }
    }

    // Add the last paragraph
    mergedParagraphs.push(currentParagraph);

    // Create a map to further deduplicate by content hash
    const uniqueParagraphs = new Map<string, SqlParagraph>();

    // Process each merged paragraph
    for (const paragraph of mergedParagraphs) {
      // Create a unique key based on content hash
      const key = this.hashString(paragraph.content);

      // Deduplicate SQL statements within this paragraph
      const uniqueStatements = [...new Set(paragraph.sqlStatements)];

      // Only add if we don't already have this paragraph or if this one has more SQL statements
      if (!uniqueParagraphs.has(key) ||
          uniqueParagraphs.get(key).sqlStatements.length < uniqueStatements.length) {
        uniqueParagraphs.set(key, {
          ...paragraph,
          sqlStatements: uniqueStatements
        });
      }
    }

    // Convert the map values back to an array
    return Array.from(uniqueParagraphs.values());
  }

  // Helper method to merge two paragraphs
  private mergeParagraphs(p1: SqlParagraph, p2: SqlParagraph): SqlParagraph {
    // Take the smaller lineStart and larger lineEnd
    const lineStart = Math.min(p1.lineStart, p2.lineStart);
    const lineEnd = Math.max(p1.lineEnd, p2.lineEnd);

    // Merge the content by taking the larger range
    let content = p1.content;
    if (p2.lineEnd > p1.lineEnd || p2.lineStart < p1.lineStart) {
      // If p2 has a larger range, merge the contents by taking the longer one
      // or by extracting the relevant lines from the content

      // Try to extract the content from p1 and p2
      const p1Lines = p1.content.split('\n');
      const p2Lines = p2.content.split('\n');

      // Calculate the total number of lines needed
      const totalLines = lineEnd - lineStart + 1;

      // If either content has enough lines, use it as a base
      if (p1Lines.length >= totalLines) {
        content = p1.content;
      } else if (p2Lines.length >= totalLines) {
        content = p2.content;
      } else {
        // Otherwise, use the longer content
        content = p2.content.length > p1.content.length ? p2.content : p1.content;
      }
    }

    // Merge and deduplicate SQL statements
    const sqlStatements = [...new Set([...p1.sqlStatements, ...p2.sqlStatements])];

    return {
      lineStart,
      lineEnd,
      content,
      sqlStatements
    };
  }

  // Helper method to create a simple hash of a string
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private async analyzeJavaFile(filePath: string): Promise<AnalysisResult> {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    let sqlParagraphs: SqlParagraph[] = [];

    try {
      // Try to parse the Java file using java-parser
      const ast = parse(fileContent);

      // Use our visitor to find SQL strings
      const visitor = new SqlStringVisitor(fileContent);
      visitor.visit(ast);

      // Convert the visitor's SQL strings to our SqlParagraph format
      // and deduplicate them based on line ranges
      const paragraphMap = new Map<string, SqlParagraph>();

      for (const sqlString of visitor.sqlStrings) {
        const key = `${sqlString.startLine}-${sqlString.endLine}`;

        if (paragraphMap.has(key)) {
          // If we already have a paragraph with this line range, add the SQL statement
          const paragraph = paragraphMap.get(key);
          if (!paragraph.sqlStatements.includes(sqlString.value)) {
            paragraph.sqlStatements.push(sqlString.value);
          }
        } else {
          // Otherwise, create a new paragraph
          paragraphMap.set(key, {
            lineStart: sqlString.startLine,
            lineEnd: sqlString.endLine,
            content: sqlString.context,
            sqlStatements: [sqlString.value]
          });
        }
      }

      // Convert the map values to an array
      sqlParagraphs = Array.from(paragraphMap.values());

      this.logger.log(`Found ${sqlParagraphs.length} SQL statements using AST parsing in ${filePath}`);
    } catch (error) {
      this.logger.warn(`Could not parse ${filePath} with java-parser: ${error.message}`);
      // If AST parsing fails, fall back to regex-based detection
      sqlParagraphs = this.detectSqlParagraphs(fileContent);
      this.logger.log(`Found ${sqlParagraphs.length} SQL statements using regex in ${filePath}`);
    }

    // Deduplicate SQL paragraphs before returning
    const dedupedParagraphs = this.deduplicateSqlParagraphs(sqlParagraphs);

    return {
      filePath,
      sqlParagraphs: dedupedParagraphs,
    };
  }

  private detectSqlParagraphs(fileContent: string): SqlParagraph[] {
    const lines = fileContent.split('\n');
    const sqlParagraphs: SqlParagraph[] = [];

    // Common SQL keywords to detect
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'GROUP BY', 'ORDER BY',
      'HAVING', 'UNION', 'INTERSECT', 'EXCEPT'
    ];

    // Regular expression to match SQL statements
    // This regex looks for SQL keywords in strings or in code
    const sqlRegex = new RegExp(
      `(["'\`].*?(${sqlKeywords.join('|')}).*?["'\`]|\\b(${sqlKeywords.join('|')})\\b)`,
      'i'
    );

    let inParagraph = false;
    let paragraphStart = 0;
    let paragraphContent = '';
    let sqlStatements: string[] = [];
    let inMultiLineComment = false;

    // Track string/StringBuilder variables
    const stringVars: { [key: string]: boolean } = {};
    const stringBuilderVars: { [key: string]: boolean } = {};

    // Track if we're in a string concatenation or StringBuilder operation
    let inStringOperation = false;
    let stringOperationStart = 0;
    let stringOperationVar = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle multi-line comments
      if (inMultiLineComment) {
        if (trimmedLine.includes('*/')) {
          inMultiLineComment = false;
        }
        continue; // Skip this line as it's part of a comment
      }

      // Check for the start of a multi-line comment
      if (trimmedLine.startsWith('/*')) {
        inMultiLineComment = true;
        if (trimmedLine.includes('*/')) {
          inMultiLineComment = false;
        }
        continue; // Skip this line as it's a comment
      }

      // Skip single-line comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        continue;
      }

      // Skip System.out and System.in statements
      if (trimmedLine.includes('System.out.print') ||
          trimmedLine.includes('System.out.format') ||
          trimmedLine.includes('System.out.write') ||
          trimmedLine.includes('System.err.print') ||
          trimmedLine.includes('System.err.format') ||
          trimmedLine.includes('System.err.write') ||
          trimmedLine.includes('System.in')) {
        continue;
      }

      // Detect string variable declarations
      if (trimmedLine.includes('String ') && trimmedLine.includes('=')) {
        const varName = trimmedLine.split('String ')[1].split('=')[0].trim();
        stringVars[varName] = true;

        // Check if this is the start of a string operation with SQL
        if (sqlRegex.test(line)) {
          inStringOperation = true;
          stringOperationStart = i;
          stringOperationVar = varName;
        }
      }

      // Detect StringBuilder variable declarations
      if (trimmedLine.includes('StringBuilder ') && trimmedLine.includes('=')) {
        const varName = trimmedLine.split('StringBuilder ')[1].split('=')[0].trim();
        stringBuilderVars[varName] = true;
      }

      // Check for StringBuilder append operations
      if (trimmedLine.includes('.append(') && sqlRegex.test(line)) {
        // Extract the variable name
        const varName = trimmedLine.split('.append(')[0].trim();

        // If this is a known StringBuilder variable
        if (stringBuilderVars[varName]) {
          if (!inStringOperation) {
            inStringOperation = true;
            stringOperationStart = i;
            stringOperationVar = varName;
          }
        }
      }

      // Check if the line contains SQL syntax
      if (sqlRegex.test(line)) {
        // Skip if the SQL is in a comment within the line
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          // Check if the SQL is before the comment
          const beforeComment = line.substring(0, commentIndex);
          if (!sqlRegex.test(beforeComment)) {
            continue; // SQL is only in the comment part, skip this line
          }
        }

        if (!inParagraph) {
          // Start of a new paragraph
          inParagraph = true;
          paragraphStart = i;
          paragraphContent = line;

          // Extract SQL statement from the line
          const sqlMatch = line.match(sqlRegex);
          if (sqlMatch) {
            sqlStatements.push(sqlMatch[0]);
          }
        } else {
          // Continue the paragraph
          paragraphContent += '\n' + line;

          // Extract SQL statement from the line
          const sqlMatch = line.match(sqlRegex);
          if (sqlMatch) {
            sqlStatements.push(sqlMatch[0]);
          }
        }
      } else if (inParagraph) {
        // Check if this is a continuation of SQL (e.g., multi-line query)
        if (/^\s*[+]?\s*["'\`]/.test(line) || /["'\`]\s*[+]?\s*$/.test(paragraphContent)) {
          // This is likely a continuation of a string containing SQL
          paragraphContent += '\n' + line;
        } else {
          // End of paragraph
          sqlParagraphs.push({
            lineStart: paragraphStart + 1, // 1-based line numbers
            lineEnd: i,
            content: paragraphContent,
            sqlStatements: [...new Set(sqlStatements)], // Remove duplicates
          });

          inParagraph = false;
          paragraphContent = '';
          sqlStatements = [];
        }
      }

      // Handle string operations (concatenation and StringBuilder)
      if (inStringOperation) {
        // Check if this is a continuation of the string operation
        if (trimmedLine.includes(stringOperationVar) &&
            (trimmedLine.includes('+=') ||
             trimmedLine.includes('+') ||
             trimmedLine.includes('.append('))) {

          // Continue collecting the string operation
          if (sqlRegex.test(line)) {
            // If we haven't started a paragraph yet, start one
            if (!inParagraph) {
              inParagraph = true;
              paragraphStart = stringOperationStart;
              // Get the full content from the variable declaration to the current line
              paragraphContent = lines.slice(stringOperationStart, i + 1).join('\n');

              // Extract SQL statement from the line
              const sqlMatch = line.match(sqlRegex);
              if (sqlMatch) {
                sqlStatements.push(sqlMatch[0]);
              }
            } else {
              // Continue the paragraph
              // Update the content to include all lines from declaration to current line
              paragraphContent = lines.slice(stringOperationStart, i + 1).join('\n');

              // Extract SQL statement from the line
              const sqlMatch = line.match(sqlRegex);
              if (sqlMatch) {
                sqlStatements.push(sqlMatch[0]);
              }
            }
          }
        } else if (trimmedLine.endsWith(';') ||
                  (trimmedLine.includes(stringOperationVar) &&
                   !trimmedLine.includes('+=') &&
                   !trimmedLine.includes('+') &&
                   !trimmedLine.includes('.append('))) {
          // End of string operation
          inStringOperation = false;

          // If we have a paragraph, end it
          if (inParagraph) {
            // Make sure to include the current line in the content
            const fullContent = lines.slice(stringOperationStart, i + 1).join('\n');

            sqlParagraphs.push({
              lineStart: stringOperationStart + 1, // 1-based line numbers (variable declaration line)
              lineEnd: i + 1, // Current line (end of string operation)
              content: fullContent, // Full content from declaration to end
              sqlStatements: [...new Set(sqlStatements)], // Remove duplicates
            });

            inParagraph = false;
            paragraphContent = '';
            sqlStatements = [];
          }
        }
      }
    }

    // Handle the case where the paragraph extends to the end of the file
    if (inParagraph && sqlStatements.length > 0) {
      // If we're in a string operation, make sure to include all lines from the declaration
      if (inStringOperation) {
        const fullContent = lines.slice(stringOperationStart, lines.length).join('\n');

        sqlParagraphs.push({
          lineStart: stringOperationStart + 1, // 1-based line numbers (variable declaration line)
          lineEnd: lines.length,              // Last line of the file
          content: fullContent,               // Full content from declaration to end
          sqlStatements: [...new Set(sqlStatements)], // Remove duplicates
        });
      } else {
        // Regular paragraph (not a string operation)
        sqlParagraphs.push({
          lineStart: paragraphStart + 1, // 1-based line numbers
          lineEnd: lines.length,
          content: paragraphContent,
          sqlStatements: [...new Set(sqlStatements)], // Remove duplicates
        });
      }
    }

    // Deduplicate paragraphs with the same or overlapping line ranges
    // We need to handle this here to avoid recursive calls

    // Sort paragraphs by lineStart and then by lineEnd (descending) to prioritize larger ranges
    const sortedParagraphs = [...sqlParagraphs].sort((a, b) => {
      if (a.lineStart !== b.lineStart) {
        return a.lineStart - b.lineStart; // Sort by lineStart ascending
      }
      return b.lineEnd - a.lineEnd; // Then by lineEnd descending (larger ranges first)
    });

    // Array to hold merged paragraphs
    const mergedParagraphs: SqlParagraph[] = [];

    if (sortedParagraphs.length > 0) {
      let currentParagraph = sortedParagraphs[0];

      // Process each paragraph to merge overlapping ones
      for (let i = 1; i < sortedParagraphs.length; i++) {
        const nextParagraph = sortedParagraphs[i];

        // Check if paragraphs overlap or are adjacent
        if (nextParagraph.lineStart <= currentParagraph.lineEnd + 1) {
          // Merge the paragraphs
          currentParagraph = this.mergeParagraphs(currentParagraph, nextParagraph);
        } else {
          // No overlap, add the current paragraph and move to the next one
          mergedParagraphs.push(currentParagraph);
          currentParagraph = nextParagraph;
        }
      }

      // Add the last paragraph
      mergedParagraphs.push(currentParagraph);
    }

    // Create a map to further deduplicate by content hash
    const uniqueParagraphs = new Map<string, SqlParagraph>();

    // Process each merged paragraph
    for (const paragraph of mergedParagraphs) {
      // Create a unique key based on content hash
      const key = this.hashString(paragraph.content);

      // Deduplicate SQL statements within this paragraph
      const uniqueStatements = [...new Set(paragraph.sqlStatements)];

      // Only add if we don't already have this paragraph or if this one has more SQL statements
      if (!uniqueParagraphs.has(key) ||
          uniqueParagraphs.get(key).sqlStatements.length < uniqueStatements.length) {
        uniqueParagraphs.set(key, {
          ...paragraph,
          sqlStatements: uniqueStatements
        });
      }
    }

    // Convert the map values back to an array
    const dedupedParagraphs = Array.from(uniqueParagraphs.values());

    // Log the number of SQL paragraphs found
    if (dedupedParagraphs.length > 0) {
      const totalSqlStatements = dedupedParagraphs.reduce((count, paragraph) => count + paragraph.sqlStatements.length, 0);
      this.logger.debug(`Found ${dedupedParagraphs.length} SQL paragraphs with ${totalSqlStatements} SQL statements`);
    }

    return dedupedParagraphs;
  }
}
