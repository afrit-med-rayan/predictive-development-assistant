import { ArchitecturalPattern, QualityMetrics, IndentationStyle, NamingConvention } from './common';

/**
 * Interfaces for code context analysis
 */

export interface CodeContextAnalyzer {
  analyzeFile(filePath: string): Promise<CodeContext>;
  analyzeProject(projectPath: string): Promise<ProjectContext>;
  getSymbolTable(): SymbolTable;
  getDependencyGraph(): DependencyGraph;
}

export interface CodeContext {
  ast: AbstractSyntaxTree;
  symbols: SymbolTable;
  scope: ScopeInfo;
  patterns: ArchitecturalPattern[];
  quality: QualityMetrics;
}

export interface ProjectContext {
  projectId: string;
  language: string;
  framework: string;
  architecture: ArchitecturalPattern;
  dependencies: Dependency[];
  codeStyle: StyleProfile;
  qualityMetrics: QualityMetrics;
}

export interface AbstractSyntaxTree {
  type: string;
  children: AbstractSyntaxTree[];
  metadata: Record<string, any>;
}

export interface SymbolTable {
  symbols: Map<string, Symbol>;
  scopes: ScopeInfo[];
}

export interface Symbol {
  name: string;
  type: string;
  scope: string;
  location: SourceLocation;
}

export interface ScopeInfo {
  id: string;
  type: string;
  parent?: string;
  variables: string[];
  functions: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: string;
  version?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
}

export interface StyleProfile {
  indentation: IndentationStyle;
  naming: NamingConvention;
  structure: StructuralPreferences;
  patterns: PreferredPatterns[];
}

export interface StructuralPreferences {
  maxLineLength: number;
  bracketStyle: string;
  importStyle: string;
}

export interface PreferredPatterns {
  pattern: string;
  frequency: number;
  context: string;
}

export interface SourceLocation {
  line: number;
  column: number;
  file: string;
}