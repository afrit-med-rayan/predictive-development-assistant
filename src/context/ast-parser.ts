import * as ts from 'typescript';
import { AbstractSyntaxTree, SourceLocation } from '../interfaces/context';

/**
 * Multi-language AST parser supporting TypeScript and Python
 */
export class MultiLanguageASTParser {
  private typeScriptParser: TypeScriptASTParser;
  private pythonParser: PythonASTParser;

  constructor() {
    this.typeScriptParser = new TypeScriptASTParser();
    this.pythonParser = new PythonASTParser();
  }

  /**
   * Parse source code and return unified AST
   */
  async parseCode(code: string, language: string, filePath?: string): Promise<AbstractSyntaxTree> {
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return this.typeScriptParser.parse(code, filePath);
      case 'python':
        return this.pythonParser.parse(code, filePath);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Parse file and return unified AST
   */
  async parseFile(filePath: string): Promise<AbstractSyntaxTree> {
    const language = this.detectLanguage(filePath);
    const fs = await import('fs');
    const code = fs.readFileSync(filePath, 'utf-8');
    return this.parseCode(code, language, filePath);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts':
        return 'typescript';
      case 'js':
        return 'javascript';
      case 'py':
        return 'python';
      default:
        throw new Error(`Cannot detect language for file: ${filePath}`);
    }
  }
}

/**
 * TypeScript AST Parser using TypeScript Compiler API
 */
export class TypeScriptASTParser {
  /**
   * Parse TypeScript/JavaScript code into unified AST
   */
  parse(code: string, filePath?: string): AbstractSyntaxTree {
    const sourceFile = ts.createSourceFile(
      filePath || 'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    return this.convertTSNodeToUnifiedAST(sourceFile);
  }

  /**
   * Convert TypeScript AST node to unified AST format
   */
  private convertTSNodeToUnifiedAST(node: ts.Node): AbstractSyntaxTree {
    const children: AbstractSyntaxTree[] = [];
    
    ts.forEachChild(node, (child) => {
      children.push(this.convertTSNodeToUnifiedAST(child));
    });

    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      type: ts.SyntaxKind[node.kind],
      children,
      metadata: {
        start: {
          line: start.line + 1,
          column: start.character + 1,
          file: sourceFile.fileName
        } as SourceLocation,
        end: {
          line: end.line + 1,
          column: end.character + 1,
          file: sourceFile.fileName
        } as SourceLocation,
        text: node.getText(sourceFile),
        kind: node.kind,
        flags: node.flags
      }
    };
  }
}

/**
 * Python AST Parser (placeholder for Python integration)
 */
export class PythonASTParser {
  /**
   * Parse Python code into unified AST
   * Note: This is a simplified implementation. In a real system,
   * this would integrate with Python's ast module via a bridge.
   */
  parse(code: string, filePath?: string): AbstractSyntaxTree {
    // For now, return a basic structure
    // In production, this would use a Python bridge or WASM Python interpreter
    return {
      type: 'Module',
      children: this.parseBasicPythonStructure(code),
      metadata: {
        language: 'python',
        filePath: filePath || 'temp.py',
        lineCount: code.split('\n').length
      }
    };
  }

  /**
   * Basic Python structure parsing (simplified)
   */
  private parseBasicPythonStructure(code: string): AbstractSyntaxTree[] {
    const lines = code.split('\n');
    const nodes: AbstractSyntaxTree[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('def ')) {
        nodes.push({
          type: 'FunctionDef',
          children: [],
          metadata: {
            name: line.match(/def\s+(\w+)/)?.[1] || 'unknown',
            line: i + 1,
            text: line
          }
        });
      } else if (line.startsWith('class ')) {
        nodes.push({
          type: 'ClassDef',
          children: [],
          metadata: {
            name: line.match(/class\s+(\w+)/)?.[1] || 'unknown',
            line: i + 1,
            text: line
          }
        });
      } else if (line.startsWith('import ') || line.startsWith('from ')) {
        nodes.push({
          type: 'Import',
          children: [],
          metadata: {
            module: line,
            line: i + 1,
            text: line
          }
        });
      }
    }
    
    return nodes;
  }
}