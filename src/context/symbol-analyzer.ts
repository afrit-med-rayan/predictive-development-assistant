import * as ts from 'typescript';
import { AbstractSyntaxTree, SymbolTable, Symbol, ScopeInfo, DependencyGraph, DependencyNode, DependencyEdge, SourceLocation } from '../interfaces/context';

/**
 * Symbol table and scope analyzer for multi-language support
 */
export class SymbolAnalyzer {
  private typeScriptAnalyzer: TypeScriptSymbolAnalyzer;
  private pythonAnalyzer: PythonSymbolAnalyzer;

  constructor() {
    this.typeScriptAnalyzer = new TypeScriptSymbolAnalyzer();
    this.pythonAnalyzer = new PythonSymbolAnalyzer();
  }

  /**
   * Analyze AST and build symbol table with scope information
   */
  analyzeSymbols(ast: AbstractSyntaxTree, language: string): SymbolTable {
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return this.typeScriptAnalyzer.analyze(ast);
      case 'python':
        return this.pythonAnalyzer.analyze(ast);
      default:
        throw new Error(`Unsupported language for symbol analysis: ${language}`);
    }
  }

  /**
   * Build dependency graph from symbol table and imports
   */
  buildDependencyGraph(symbolTable: SymbolTable, ast: AbstractSyntaxTree): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];

    // Extract import/dependency information from AST
    this.extractDependencies(ast, nodes, edges);

    // Add internal symbols as nodes
    symbolTable.symbols.forEach((symbol, name) => {
      if (symbol.type === 'function' || symbol.type === 'class' || symbol.type === 'interface') {
        nodes.push({
          id: symbol.name,
          name: symbol.name,
          type: symbol.type
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * Extract dependencies from AST nodes
   */
  private extractDependencies(ast: AbstractSyntaxTree, nodes: DependencyNode[], edges: DependencyEdge[]): void {
    if (ast.type === 'Import' || ast.type === 'ImportDeclaration') {
      const moduleName = this.extractModuleName(ast);
      if (moduleName) {
        nodes.push({
          id: moduleName,
          name: moduleName,
          type: 'module'
        });
      }
    }

    // Recursively process children
    ast.children.forEach(child => {
      this.extractDependencies(child, nodes, edges);
    });
  }

  /**
   * Extract module name from import node
   */
  private extractModuleName(importNode: AbstractSyntaxTree): string | null {
    if (importNode.metadata.module) {
      return importNode.metadata.module;
    }
    if (importNode.metadata.text) {
      const match = importNode.metadata.text.match(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/);
      return match ? (match[1] || match[2]) : null;
    }
    return null;
  }
}

/**
 * TypeScript-specific symbol analyzer
 */
export class TypeScriptSymbolAnalyzer {
  /**
   * Analyze TypeScript AST and build symbol table
   */
  analyze(ast: AbstractSyntaxTree): SymbolTable {
    const symbols = new Map<string, Symbol>();
    const scopes: ScopeInfo[] = [];
    
    // Create global scope
    const globalScope: ScopeInfo = {
      id: 'global',
      type: 'global',
      variables: [],
      functions: []
    };
    scopes.push(globalScope);

    this.analyzeNode(ast, symbols, scopes, globalScope);

    return { symbols, scopes };
  }

  /**
   * Recursively analyze AST nodes to extract symbols
   */
  private analyzeNode(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    switch (node.type) {
      case 'FunctionDeclaration':
        this.analyzeFunctionDeclaration(node, symbols, scopes, currentScope);
        break;
      case 'ClassDeclaration':
        this.analyzeClassDeclaration(node, symbols, scopes, currentScope);
        break;
      case 'InterfaceDeclaration':
        this.analyzeInterfaceDeclaration(node, symbols, scopes, currentScope);
        break;
      case 'VariableStatement':
      case 'FirstStatement':
        this.analyzeVariableStatement(node, symbols, currentScope);
        break;
      case 'MethodDeclaration':
        this.analyzeMethodDeclaration(node, symbols, scopes, currentScope);
        break;
      case 'PropertyDeclaration':
        this.analyzePropertyDeclaration(node, symbols, currentScope);
        break;
      default:
        // Recursively analyze children
        node.children.forEach(child => {
          this.analyzeNode(child, symbols, scopes, currentScope);
        });
    }
  }

  /**
   * Analyze function declaration
   */
  private analyzeFunctionDeclaration(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const functionName = this.extractIdentifierName(node.children[0]);
    if (functionName) {
      const symbol: Symbol = {
        name: functionName,
        type: 'function',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(functionName, symbol);
      currentScope.functions.push(functionName);

      // Create function scope
      const functionScope: ScopeInfo = {
        id: `${currentScope.id}.${functionName}`,
        type: 'function',
        parent: currentScope.id,
        variables: [],
        functions: []
      };
      scopes.push(functionScope);

      // Analyze function body
      node.children.forEach(child => {
        this.analyzeNode(child, symbols, scopes, functionScope);
      });
    }
  }

  /**
   * Analyze class declaration
   */
  private analyzeClassDeclaration(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const className = this.extractIdentifierName(node.children[0]);
    if (className) {
      const symbol: Symbol = {
        name: className,
        type: 'class',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(className, symbol);

      // Create class scope
      const classScope: ScopeInfo = {
        id: `${currentScope.id}.${className}`,
        type: 'class',
        parent: currentScope.id,
        variables: [],
        functions: []
      };
      scopes.push(classScope);

      // Analyze class members
      node.children.forEach(child => {
        this.analyzeNode(child, symbols, scopes, classScope);
      });
    }
  }

  /**
   * Analyze interface declaration
   */
  private analyzeInterfaceDeclaration(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const interfaceName = this.extractIdentifierName(node.children[0]);
    if (interfaceName) {
      const symbol: Symbol = {
        name: interfaceName,
        type: 'interface',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(interfaceName, symbol);
    }
  }

  /**
   * Analyze variable statement
   */
  private analyzeVariableStatement(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, currentScope: ScopeInfo): void {
    // Look for variable declarations in children
    this.findVariableDeclarations(node, symbols, currentScope);
  }

  /**
   * Analyze method declaration
   */
  private analyzeMethodDeclaration(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const methodName = this.extractIdentifierName(node.children[0]);
    if (methodName) {
      const symbol: Symbol = {
        name: methodName,
        type: 'method',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(`${currentScope.id}.${methodName}`, symbol);
      currentScope.functions.push(methodName);

      // Create method scope
      const methodScope: ScopeInfo = {
        id: `${currentScope.id}.${methodName}`,
        type: 'method',
        parent: currentScope.id,
        variables: [],
        functions: []
      };
      scopes.push(methodScope);

      // Analyze method body
      node.children.forEach(child => {
        this.analyzeNode(child, symbols, scopes, methodScope);
      });
    }
  }

  /**
   * Analyze property declaration
   */
  private analyzePropertyDeclaration(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, currentScope: ScopeInfo): void {
    const propertyName = this.extractIdentifierName(node.children.find(child => child.type === 'Identifier'));
    if (propertyName) {
      const symbol: Symbol = {
        name: propertyName,
        type: 'property',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(`${currentScope.id}.${propertyName}`, symbol);
      currentScope.variables.push(propertyName);
    }
  }

  /**
   * Find variable declarations recursively
   */
  private findVariableDeclarations(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, currentScope: ScopeInfo): void {
    if (node.type === 'Identifier' && node.metadata.text) {
      const variableName = node.metadata.text;
      const symbol: Symbol = {
        name: variableName,
        type: 'variable',
        scope: currentScope.id,
        location: node.metadata.start as SourceLocation
      };
      symbols.set(`${currentScope.id}.${variableName}`, symbol);
      currentScope.variables.push(variableName);
    }

    node.children.forEach(child => {
      this.findVariableDeclarations(child, symbols, currentScope);
    });
  }

  /**
   * Extract identifier name from AST node
   */
  private extractIdentifierName(node?: AbstractSyntaxTree): string | null {
    if (!node) return null;
    if (node.type === 'Identifier' && node.metadata.text) {
      return node.metadata.text;
    }
    return null;
  }
}

/**
 * Python-specific symbol analyzer
 */
export class PythonSymbolAnalyzer {
  /**
   * Analyze Python AST and build symbol table
   */
  analyze(ast: AbstractSyntaxTree): SymbolTable {
    const symbols = new Map<string, Symbol>();
    const scopes: ScopeInfo[] = [];
    
    // Create global scope
    const globalScope: ScopeInfo = {
      id: 'global',
      type: 'global',
      variables: [],
      functions: []
    };
    scopes.push(globalScope);

    this.analyzeNode(ast, symbols, scopes, globalScope);

    return { symbols, scopes };
  }

  /**
   * Recursively analyze Python AST nodes
   */
  private analyzeNode(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    switch (node.type) {
      case 'FunctionDef':
        this.analyzeFunctionDef(node, symbols, scopes, currentScope);
        break;
      case 'ClassDef':
        this.analyzeClassDef(node, symbols, scopes, currentScope);
        break;
      case 'Import':
        this.analyzeImport(node, symbols, currentScope);
        break;
      default:
        // Recursively analyze children
        node.children.forEach(child => {
          this.analyzeNode(child, symbols, scopes, currentScope);
        });
    }
  }

  /**
   * Analyze Python function definition
   */
  private analyzeFunctionDef(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const functionName = node.metadata.name;
    if (functionName) {
      const symbol: Symbol = {
        name: functionName,
        type: 'function',
        scope: currentScope.id,
        location: {
          line: node.metadata.line || 1,
          column: 1,
          file: 'python_file'
        }
      };
      symbols.set(functionName, symbol);
      currentScope.functions.push(functionName);

      // Create function scope
      const functionScope: ScopeInfo = {
        id: `${currentScope.id}.${functionName}`,
        type: 'function',
        parent: currentScope.id,
        variables: [],
        functions: []
      };
      scopes.push(functionScope);

      // Analyze function body (children would contain nested functions/classes)
      node.children.forEach(child => {
        this.analyzeNode(child, symbols, scopes, functionScope);
      });
    }
  }

  /**
   * Analyze Python class definition
   */
  private analyzeClassDef(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, scopes: ScopeInfo[], currentScope: ScopeInfo): void {
    const className = node.metadata.name;
    if (className) {
      const symbol: Symbol = {
        name: className,
        type: 'class',
        scope: currentScope.id,
        location: {
          line: node.metadata.line || 1,
          column: 1,
          file: 'python_file'
        }
      };
      symbols.set(className, symbol);

      // Create class scope
      const classScope: ScopeInfo = {
        id: `${currentScope.id}.${className}`,
        type: 'class',
        parent: currentScope.id,
        variables: [],
        functions: []
      };
      scopes.push(classScope);

      // Analyze class body
      node.children.forEach(child => {
        this.analyzeNode(child, symbols, scopes, classScope);
      });
    }
  }

  /**
   * Analyze Python import statement
   */
  private analyzeImport(node: AbstractSyntaxTree, symbols: Map<string, Symbol>, currentScope: ScopeInfo): void {
    const importText = node.metadata.module || node.metadata.text;
    if (importText) {
      // Extract module names from import statement
      const moduleNames = this.extractPythonModuleNames(importText);
      moduleNames.forEach(moduleName => {
        const symbol: Symbol = {
          name: moduleName,
          type: 'import',
          scope: currentScope.id,
          location: {
            line: node.metadata.line || 1,
            column: 1,
            file: 'python_file'
          }
        };
        symbols.set(moduleName, symbol);
      });
    }
  }

  /**
   * Extract module names from Python import statement
   */
  private extractPythonModuleNames(importText: string): string[] {
    const modules: string[] = [];
    
    if (importText.startsWith('import ')) {
      const moduleList = importText.replace('import ', '').split(',');
      moduleList.forEach(module => {
        const cleanModule = module.trim().split(' as ')[0];
        modules.push(cleanModule);
      });
    } else if (importText.startsWith('from ')) {
      const match = importText.match(/from\s+(\S+)\s+import/);
      if (match) {
        modules.push(match[1]);
      }
    }
    
    return modules;
  }
}