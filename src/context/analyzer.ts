import * as fs from 'fs';
import * as path from 'path';
import { CodeContextAnalyzer, CodeContext, ProjectContext, SymbolTable, DependencyGraph, StyleProfile, Dependency } from '../interfaces/context';
import { ArchitecturalPattern, QualityMetrics } from '../interfaces/common';
import { MultiLanguageASTParser } from './ast-parser';
import { SymbolAnalyzer } from './symbol-analyzer';

/**
 * Main code context analyzer that combines AST parsing, symbol analysis, and project analysis
 */
export class CodeContextAnalyzerImpl implements CodeContextAnalyzer {
  private astParser: MultiLanguageASTParser;
  private symbolAnalyzer: SymbolAnalyzer;
  private projectAnalyzer: ProjectAnalyzer;

  constructor() {
    this.astParser = new MultiLanguageASTParser();
    this.symbolAnalyzer = new SymbolAnalyzer();
    this.projectAnalyzer = new ProjectAnalyzer();
  }

  /**
   * Analyze a single file and return code context
   */
  async analyzeFile(filePath: string): Promise<CodeContext> {
    const ast = await this.astParser.parseFile(filePath);
    const language = this.detectLanguage(filePath);
    const symbols = this.symbolAnalyzer.analyzeSymbols(ast, language);
    const dependencyGraph = this.symbolAnalyzer.buildDependencyGraph(symbols, ast);
    
    // Get current scope info (simplified - would be cursor position in real implementation)
    const scope = symbols.scopes.find(s => s.id === 'global') || symbols.scopes[0];
    
    // Detect architectural patterns in the file
    const patterns = this.detectFilePatterns(ast, language);
    
    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(ast, symbols);

    return {
      ast,
      symbols,
      scope,
      patterns,
      quality
    };
  }

  /**
   * Analyze entire project and return project context
   */
  async analyzeProject(projectPath: string): Promise<ProjectContext> {
    return this.projectAnalyzer.analyzeProject(projectPath);
  }

  /**
   * Get symbol table for current context
   */
  getSymbolTable(): SymbolTable {
    // This would typically be cached from the last analysis
    return {
      symbols: new Map(),
      scopes: []
    };
  }

  /**
   * Get dependency graph for current context
   */
  getDependencyGraph(): DependencyGraph {
    // This would typically be cached from the last analysis
    return {
      nodes: [],
      edges: []
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    switch (extension) {
      case '.ts':
        return 'typescript';
      case '.js':
        return 'javascript';
      case '.py':
        return 'python';
      default:
        return 'unknown';
    }
  }

  /**
   * Detect architectural patterns in a file
   */
  private detectFilePatterns(ast: any, language: string): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Detect common patterns based on AST structure
    if (this.hasPattern(ast, 'class')) {
      patterns.push('object-oriented' as ArchitecturalPattern);
    }
    
    if (this.hasPattern(ast, 'function') && !this.hasPattern(ast, 'class')) {
      patterns.push('functional' as ArchitecturalPattern);
    }

    if (language === 'typescript' && this.hasPattern(ast, 'interface')) {
      patterns.push('interface-based' as ArchitecturalPattern);
    }

    return patterns;
  }

  /**
   * Check if AST contains a specific pattern
   */
  private hasPattern(ast: any, pattern: string): boolean {
    if (ast.type && ast.type.toLowerCase().includes(pattern)) {
      return true;
    }
    
    if (ast.children) {
      return ast.children.some((child: any) => this.hasPattern(child, pattern));
    }
    
    return false;
  }

  /**
   * Calculate code quality metrics
   */
  private calculateQualityMetrics(ast: any, symbols: SymbolTable): QualityMetrics {
    const complexity = this.calculateComplexity(ast);
    const maintainability = this.calculateMaintainability(symbols, complexity);
    const testCoverage = 0; // Would be calculated from test files
    const codeSmells = this.calculateCodeSmells(ast);

    return {
      complexity,
      maintainability,
      testCoverage,
      codeSmells
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(ast: any): number {
    let complexity = 1; // Base complexity

    if (ast.type) {
      // Add complexity for control flow statements
      if (['IfStatement', 'WhileStatement', 'ForStatement', 'SwitchStatement'].includes(ast.type)) {
        complexity += 1;
      }
      if (ast.type === 'ConditionalExpression') {
        complexity += 1;
      }
    }

    if (ast.children) {
      ast.children.forEach((child: any) => {
        complexity += this.calculateComplexity(child) - 1; // Subtract 1 to avoid double counting base
      });
    }

    return complexity;
  }

  /**
   * Calculate maintainability index
   */
  private calculateMaintainability(symbols: SymbolTable, complexity: number): number {
    const linesOfCode = symbols.scopes.length * 10; // Rough estimate
    const halsteadVolume = symbols.symbols.size * 2; // Simplified calculation
    
    // Simplified maintainability index calculation
    const maintainability = Math.max(0, 
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
    );
    
    return Math.min(100, maintainability);
  }

  /**
   * Calculate code smells count
   */
  private calculateCodeSmells(ast: any): number {
    let codeSmells = 0;
    
    // Count various code smells
    codeSmells += this.countLongMethods(ast);
    codeSmells += this.countLargeClasses(ast);
    codeSmells += this.countDuplicatedCode(ast);
    
    return codeSmells;
  }

  /**
   * Count long methods (simplified)
   */
  private countLongMethods(ast: any): number {
    let count = 0;
    
    if (ast.type === 'FunctionDeclaration' || ast.type === 'MethodDeclaration') {
      // Simplified: count children as a proxy for method length
      if (ast.children && ast.children.length > 10) {
        count++;
      }
    }
    
    if (ast.children) {
      ast.children.forEach((child: any) => {
        count += this.countLongMethods(child);
      });
    }
    
    return count;
  }

  /**
   * Count large classes (simplified)
   */
  private countLargeClasses(ast: any): number {
    let count = 0;
    
    if (ast.type === 'ClassDeclaration') {
      // Simplified: count children as a proxy for class size
      if (ast.children && ast.children.length > 15) {
        count++;
      }
    }
    
    if (ast.children) {
      ast.children.forEach((child: any) => {
        count += this.countLargeClasses(child);
      });
    }
    
    return count;
  }

  /**
   * Count duplicated code patterns (simplified)
   */
  private countDuplicatedCode(ast: any): number {
    const nodeTypes = new Map<string, number>();
    this.countNodeTypes(ast, nodeTypes);
    
    let duplicatedPatterns = 0;
    nodeTypes.forEach((count, type) => {
      if (count > 3) { // More than 3 similar patterns might indicate duplication
        duplicatedPatterns++;
      }
    });
    
    return duplicatedPatterns;
  }

  /**
   * Count node types for duplication analysis
   */
  private countNodeTypes(ast: any, nodeTypes: Map<string, number>): void {
    if (ast.type) {
      nodeTypes.set(ast.type, (nodeTypes.get(ast.type) || 0) + 1);
    }
    
    if (ast.children) {
      ast.children.forEach((child: any) => {
        this.countNodeTypes(child, nodeTypes);
      });
    }
  }
}

/**
 * Project-level analyzer for architectural patterns and dependencies
 */
export class ProjectAnalyzer {
  /**
   * Analyze entire project structure and dependencies
   */
  async analyzeProject(projectPath: string): Promise<ProjectContext> {
    const packageInfo = await this.analyzePackageFile(projectPath);
    const fileStructure = await this.analyzeFileStructure(projectPath);
    const dependencies = await this.analyzeDependencies(projectPath);
    const architecture = this.detectArchitecture(fileStructure, dependencies);
    const codeStyle = await this.analyzeCodeStyle(projectPath);
    const qualityMetrics = await this.calculateProjectQuality(projectPath);

    return {
      projectId: path.basename(projectPath),
      language: packageInfo.language,
      framework: packageInfo.framework,
      architecture,
      dependencies,
      codeStyle,
      qualityMetrics
    };
  }

  /**
   * Analyze package.json or similar configuration files
   */
  private async analyzePackageFile(projectPath: string): Promise<{ language: string; framework: string }> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');

    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const framework = this.detectJavaScriptFramework(packageJson);
        return {
          language: 'typescript',
          framework
        };
      } else if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
        const framework = await this.detectPythonFramework(projectPath);
        return {
          language: 'python',
          framework
        };
      }
    } catch (error) {
      // Handle file system errors gracefully
      console.warn('Error analyzing package files:', error);
    }

    return {
      language: 'unknown',
      framework: 'none'
    };
  }

  /**
   * Analyze project file structure
   */
  private async analyzeFileStructure(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const scanDirectory = (dirPath: string) => {
        if (!fs.existsSync(dirPath)) return;
        
        const items = fs.readdirSync(dirPath);
        items.forEach(item => {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(itemPath);
          } else if (stat.isFile() && this.isCodeFile(item)) {
            files.push(path.relative(projectPath, itemPath));
          }
        });
      };

      scanDirectory(projectPath);
    } catch (error) {
      // Handle file system errors gracefully
      console.warn('Error scanning directory:', error);
    }
    
    return files;
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.ts', '.js', '.py', '.tsx', '.jsx'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Analyze project dependencies
   */
  private async analyzeDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Add production dependencies
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'production'
            });
          });
        }
        
        // Add development dependencies
        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'development'
            });
          });
        }
      }
    } catch (error) {
      // Handle file system errors gracefully
      console.warn('Error analyzing dependencies:', error);
    }

    return dependencies;
  }

  /**
   * Detect architectural pattern from project structure
   */
  private detectArchitecture(files: string[], dependencies: Dependency[]): ArchitecturalPattern {
    // Check for layered architecture (controller + service + repository)
    const hasController = files.some(f => f.toLowerCase().includes('controller'));
    const hasService = files.some(f => f.toLowerCase().includes('service'));
    const hasRepository = files.some(f => f.toLowerCase().includes('repository'));
    
    if (hasController && hasService && hasRepository) {
      return ArchitecturalPattern.REPOSITORY;
    }
    
    // Check for MVC pattern
    const hasModel = files.some(f => f.toLowerCase().includes('model'));
    const hasView = files.some(f => f.toLowerCase().includes('view'));
    const hasControllerMvc = files.some(f => f.toLowerCase().includes('controller'));
    
    if (hasModel && hasView && hasControllerMvc) {
      return ArchitecturalPattern.MVC;
    }
    
    // Check for component-based architecture
    const hasComponent = files.some(f => f.toLowerCase().includes('component'));
    const hasContainer = files.some(f => f.toLowerCase().includes('container'));
    
    if (hasComponent && hasContainer) {
      return 'component-based' as ArchitecturalPattern;
    }
    
    // Check for microservices
    if (dependencies.some(d => d.name.includes('microservice') || d.name.includes('express'))) {
      return 'microservices' as ArchitecturalPattern;
    }

    return 'monolithic' as ArchitecturalPattern;
  }

  /**
   * Detect JavaScript/TypeScript framework
   */
  private detectJavaScriptFramework(packageJson: any): string {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.react) return 'react';
    if (dependencies.vue) return 'vue';
    if (dependencies.angular || dependencies['@angular/core']) return 'angular';
    if (dependencies.express) return 'express';
    if (dependencies.next) return 'next.js';
    if (dependencies.nuxt) return 'nuxt.js';
    
    return 'vanilla';
  }

  /**
   * Detect Python framework
   */
  private async detectPythonFramework(projectPath: string): Promise<string> {
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      const requirements = fs.readFileSync(requirementsPath, 'utf-8');
      
      if (requirements.includes('django')) return 'django';
      if (requirements.includes('flask')) return 'flask';
      if (requirements.includes('fastapi')) return 'fastapi';
      if (requirements.includes('tornado')) return 'tornado';
    }
    
    return 'vanilla';
  }

  /**
   * Analyze code style across the project
   */
  private async analyzeCodeStyle(projectPath: string): Promise<StyleProfile> {
    // This would analyze multiple files to determine consistent style
    return {
      indentation: 'spaces' as any,
      naming: 'camelCase' as any,
      structure: {
        maxLineLength: 100,
        bracketStyle: 'same-line',
        importStyle: 'grouped'
      },
      patterns: []
    };
  }

  /**
   * Calculate project-wide quality metrics
   */
  private async calculateProjectQuality(projectPath: string): Promise<QualityMetrics> {
    // This would aggregate metrics from all files
    return {
      complexity: 5.0,
      maintainability: 75.0,
      testCoverage: 0.0,
      codeSmells: 3
    };
  }
}