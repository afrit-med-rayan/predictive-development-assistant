/**
 * Common types and enums used across the system
 */

export enum ActionType {
  KEYSTROKE = 'keystroke',
  MOUSE_CLICK = 'mouse_click',
  MOUSE_MOVE = 'mouse_move',
  CODE_EDIT = 'code_edit',
  FILE_SWITCH = 'file_switch',
  CONTEXT_SWITCH = 'context_switch'
}

export enum PredictionType {
  CODE_COMPLETION = 'code_completion',
  FUNCTION_GENERATION = 'function_generation',
  CLASS_GENERATION = 'class_generation',
  ARCHITECTURAL_SUGGESTION = 'architectural_suggestion',
  ERROR_HANDLING = 'error_handling'
}

export enum ArchitecturalPattern {
  MVC = 'mvc',
  MVVM = 'mvvm',
  REPOSITORY = 'repository',
  FACTORY = 'factory',
  SINGLETON = 'singleton',
  OBSERVER = 'observer'
}

export enum IndentationStyle {
  SPACES_2 = 'spaces_2',
  SPACES_4 = 'spaces_4',
  TABS = 'tabs'
}

export enum NamingConvention {
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase',
  SNAKE_CASE = 'snake_case',
  KEBAB_CASE = 'kebab-case'
}

export interface QualityMetrics {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  codeSmells: number;
}