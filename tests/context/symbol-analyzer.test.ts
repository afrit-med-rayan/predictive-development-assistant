import { SymbolAnalyzer, TypeScriptSymbolAnalyzer, PythonSymbolAnalyzer } from '../../src/context/symbol-analyzer';
import { MultiLanguageASTParser } from '../../src/context/ast-parser';
import { AbstractSyntaxTree, SymbolTable, Symbol, ScopeInfo } from '../../src/interfaces/context';

describe('SymbolAnalyzer', () => {
  let analyzer: SymbolAnalyzer;
  let astParser: MultiLanguageASTParser;

  beforeEach(() => {
    analyzer = new SymbolAnalyzer();
    astParser = new MultiLanguageASTParser();
  });

  describe('analyzeSymbols', () => {
    it('should analyze TypeScript symbols correctly', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }
        
        class UserService {
          private users: User[] = [];
          
          addUser(user: User): void {
            this.users.push(user);
          }
        }
        
        function createUser(name: string): User {
          return { name, age: 0 };
        }
      `;

      const ast = await astParser.parseCode(code, 'typescript');
      const symbolTable = analyzer.analyzeSymbols(ast, 'typescript');

      expect(symbolTable.symbols.size).toBeGreaterThan(0);
      expect(symbolTable.scopes.length).toBeGreaterThan(0);

      // Check for interface
      const userInterface = symbolTable.symbols.get('User');
      expect(userInterface).toBeDefined();
      expect(userInterface!.type).toBe('interface');

      // Check for class
      const userServiceClass = symbolTable.symbols.get('UserService');
      expect(userServiceClass).toBeDefined();
      expect(userServiceClass!.type).toBe('class');

      // Check for function
      const createUserFunction = symbolTable.symbols.get('createUser');
      expect(createUserFunction).toBeDefined();
      expect(createUserFunction!.type).toBe('function');

      // Check scopes
      const globalScope = symbolTable.scopes.find(scope => scope.id === 'global');
      expect(globalScope).toBeDefined();
      expect(globalScope!.functions.length).toBeGreaterThan(0);
    });

    it('should analyze Python symbols correctly', async () => {
      const code = `
import os
from typing import List

class DataProcessor:
    def __init__(self, config):
        self.config = config
    
    def process(self, data):
        return data

def main():
    processor = DataProcessor({})
    return processor.process([])
      `;

      const ast = await astParser.parseCode(code, 'python');
      const symbolTable = analyzer.analyzeSymbols(ast, 'python');

      expect(symbolTable.symbols.size).toBeGreaterThan(0);
      expect(symbolTable.scopes.length).toBeGreaterThan(0);

      // Check for imports
      const osImport = symbolTable.symbols.get('os');
      expect(osImport).toBeDefined();
      expect(osImport!.type).toBe('import');

      // Check for class
      const dataProcessorClass = symbolTable.symbols.get('DataProcessor');
      expect(dataProcessorClass).toBeDefined();
      expect(dataProcessorClass!.type).toBe('class');

      // Check for function
      const mainFunction = symbolTable.symbols.get('main');
      expect(mainFunction).toBeDefined();
      expect(mainFunction!.type).toBe('function');
    });

    it('should throw error for unsupported language', async () => {
      const mockAst: AbstractSyntaxTree = {
        type: 'Module',
        children: [],
        metadata: {}
      };

      expect(() => analyzer.analyzeSymbols(mockAst, 'unsupported')).toThrow('Unsupported language for symbol analysis: unsupported');
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph from symbol table', async () => {
      const code = `
        import { Component } from 'react';
        import axios from 'axios';
        
        class MyComponent extends Component {
          render() {
            return null;
          }
        }
      `;

      const ast = await astParser.parseCode(code, 'typescript');
      const symbolTable = analyzer.analyzeSymbols(ast, 'typescript');
      const dependencyGraph = analyzer.buildDependencyGraph(symbolTable, ast);

      expect(dependencyGraph.nodes.length).toBeGreaterThan(0);
      expect(dependencyGraph.edges).toBeDefined();

      // Should have nodes for the class and potentially imports
      const classNode = dependencyGraph.nodes.find(node => node.name === 'MyComponent');
      expect(classNode).toBeDefined();
      expect(classNode!.type).toBe('class');
    });
  });
});

describe('TypeScriptSymbolAnalyzer', () => {
  let analyzer: TypeScriptSymbolAnalyzer;
  let astParser: MultiLanguageASTParser;

  beforeEach(() => {
    analyzer = new TypeScriptSymbolAnalyzer();
    astParser = new MultiLanguageASTParser();
  });

  it('should analyze function declarations', async () => {
    const code = `
      function calculateSum(a: number, b: number): number {
        const result = a + b;
        return result;
      }
    `;

    const ast = await astParser.parseCode(code, 'typescript');
    const symbolTable = analyzer.analyze(ast);

    const functionSymbol = symbolTable.symbols.get('calculateSum');
    expect(functionSymbol).toBeDefined();
    expect(functionSymbol!.type).toBe('function');
    expect(functionSymbol!.scope).toBe('global');

    // Check for function scope
    const functionScope = symbolTable.scopes.find(scope => scope.id === 'global.calculateSum');
    expect(functionScope).toBeDefined();
    expect(functionScope!.type).toBe('function');
    expect(functionScope!.parent).toBe('global');
  });

  it('should analyze class declarations with methods and properties', async () => {
    const code = `
      class Calculator {
        private history: number[] = [];
        
        constructor(initialValue: number) {
          this.history.push(initialValue);
        }
        
        add(value: number): number {
          const result = this.history[this.history.length - 1] + value;
          this.history.push(result);
          return result;
        }
      }
    `;

    const ast = await astParser.parseCode(code, 'typescript');
    const symbolTable = analyzer.analyze(ast);

    // Check class symbol
    const classSymbol = symbolTable.symbols.get('Calculator');
    expect(classSymbol).toBeDefined();
    expect(classSymbol!.type).toBe('class');

    // Check class scope
    const classScope = symbolTable.scopes.find(scope => scope.id === 'global.Calculator');
    expect(classScope).toBeDefined();
    expect(classScope!.type).toBe('class');

    // Check for method scopes
    const constructorScope = symbolTable.scopes.find(scope => scope.id.includes('constructor'));
    const addMethodScope = symbolTable.scopes.find(scope => scope.id.includes('add'));
    
    // At least one method scope should exist
    expect(constructorScope || addMethodScope).toBeDefined();
  });

  it('should analyze interface declarations', async () => {
    const code = `
      interface ApiResponse<T> {
        data: T;
        status: number;
        message: string;
      }
      
      interface UserData {
        id: number;
        name: string;
        email: string;
      }
    `;

    const ast = await astParser.parseCode(code, 'typescript');
    const symbolTable = analyzer.analyze(ast);

    const apiResponseInterface = symbolTable.symbols.get('ApiResponse');
    expect(apiResponseInterface).toBeDefined();
    expect(apiResponseInterface!.type).toBe('interface');

    const userDataInterface = symbolTable.symbols.get('UserData');
    expect(userDataInterface).toBeDefined();
    expect(userDataInterface!.type).toBe('interface');
  });

  it('should handle nested scopes correctly', async () => {
    const code = `
      class OuterClass {
        outerMethod() {
          function innerFunction() {
            const innerVar = 'test';
            return innerVar;
          }
          return innerFunction();
        }
      }
    `;

    const ast = await astParser.parseCode(code, 'typescript');
    const symbolTable = analyzer.analyze(ast);

    // Should have multiple scopes: global, class, method, and inner function
    expect(symbolTable.scopes.length).toBeGreaterThanOrEqual(3);

    const globalScope = symbolTable.scopes.find(scope => scope.id === 'global');
    expect(globalScope).toBeDefined();

    const classScope = symbolTable.scopes.find(scope => scope.id === 'global.OuterClass');
    expect(classScope).toBeDefined();

    // Should have nested scopes
    const nestedScopes = symbolTable.scopes.filter(scope => scope.parent && scope.parent !== 'global');
    expect(nestedScopes.length).toBeGreaterThan(0);
  });

  it('should track variable declarations', async () => {
    const code = `
      const globalVar = 'global';
      let mutableVar = 42;
      
      function testFunction() {
        const localVar = 'local';
        let functionVar = 100;
      }
    `;

    const ast = await astParser.parseCode(code, 'typescript');
    const symbolTable = analyzer.analyze(ast);

    const globalScope = symbolTable.scopes.find(scope => scope.id === 'global');
    expect(globalScope).toBeDefined();
    expect(globalScope!.variables.length).toBeGreaterThan(0);

    const functionScope = symbolTable.scopes.find(scope => scope.id === 'global.testFunction');
    if (functionScope) {
      expect(functionScope.variables.length).toBeGreaterThan(0);
    }
  });
});

describe('PythonSymbolAnalyzer', () => {
  let analyzer: PythonSymbolAnalyzer;
  let astParser: MultiLanguageASTParser;

  beforeEach(() => {
    analyzer = new PythonSymbolAnalyzer();
    astParser = new MultiLanguageASTParser();
  });

  it('should analyze Python function definitions', async () => {
    const code = `
def calculate_sum(a, b):
    result = a + b
    return result

def greet(name):
    message = f"Hello, {name}!"
    return message
    `;

    const ast = await astParser.parseCode(code, 'python');
    const symbolTable = analyzer.analyze(ast);

    const calculateSumFunction = symbolTable.symbols.get('calculate_sum');
    expect(calculateSumFunction).toBeDefined();
    expect(calculateSumFunction!.type).toBe('function');

    const greetFunction = symbolTable.symbols.get('greet');
    expect(greetFunction).toBeDefined();
    expect(greetFunction!.type).toBe('function');

    // Check global scope
    const globalScope = symbolTable.scopes.find(scope => scope.id === 'global');
    expect(globalScope).toBeDefined();
    expect(globalScope!.functions).toContain('calculate_sum');
    expect(globalScope!.functions).toContain('greet');
  });

  it('should analyze Python class definitions', async () => {
    const code = `
class Animal:
    def __init__(self, name):
        self.name = name
    
    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"
    `;

    const ast = await astParser.parseCode(code, 'python');
    const symbolTable = analyzer.analyze(ast);

    const animalClass = symbolTable.symbols.get('Animal');
    expect(animalClass).toBeDefined();
    expect(animalClass!.type).toBe('class');

    const dogClass = symbolTable.symbols.get('Dog');
    expect(dogClass).toBeDefined();
    expect(dogClass!.type).toBe('class');

    // Check for class scopes
    const animalScope = symbolTable.scopes.find(scope => scope.id === 'global.Animal');
    expect(animalScope).toBeDefined();
    expect(animalScope!.type).toBe('class');

    const dogScope = symbolTable.scopes.find(scope => scope.id === 'global.Dog');
    expect(dogScope).toBeDefined();
    expect(dogScope!.type).toBe('class');
  });

  it('should analyze Python import statements', async () => {
    const code = `
import os
import sys
from typing import List, Dict
from collections import defaultdict
    `;

    const ast = await astParser.parseCode(code, 'python');
    const symbolTable = analyzer.analyze(ast);

    const osImport = symbolTable.symbols.get('os');
    expect(osImport).toBeDefined();
    expect(osImport!.type).toBe('import');

    const sysImport = symbolTable.symbols.get('sys');
    expect(sysImport).toBeDefined();
    expect(sysImport!.type).toBe('import');

    const typingImport = symbolTable.symbols.get('typing');
    expect(typingImport).toBeDefined();
    expect(typingImport!.type).toBe('import');

    const collectionsImport = symbolTable.symbols.get('collections');
    expect(collectionsImport).toBeDefined();
    expect(collectionsImport!.type).toBe('import');
  });

  it('should handle nested Python structures', async () => {
    const code = `
class OuterClass:
    def outer_method(self):
        def inner_function():
            return "nested"
        return inner_function()

def main():
    class LocalClass:
        pass
    return LocalClass()
    `;

    const ast = await astParser.parseCode(code, 'python');
    const symbolTable = analyzer.analyze(ast);

    // Should have multiple scopes
    expect(symbolTable.scopes.length).toBeGreaterThan(2);

    const outerClass = symbolTable.symbols.get('OuterClass');
    expect(outerClass).toBeDefined();
    expect(outerClass!.type).toBe('class');

    const mainFunction = symbolTable.symbols.get('main');
    expect(mainFunction).toBeDefined();
    expect(mainFunction!.type).toBe('function');

    // Check for nested scopes
    const outerClassScope = symbolTable.scopes.find(scope => scope.id === 'global.OuterClass');
    expect(outerClassScope).toBeDefined();

    const mainFunctionScope = symbolTable.scopes.find(scope => scope.id === 'global.main');
    expect(mainFunctionScope).toBeDefined();
  });

  it('should track function locations', async () => {
    const code = `
def first_function():
    pass

def second_function():
    pass
    `;

    const ast = await astParser.parseCode(code, 'python');
    const symbolTable = analyzer.analyze(ast);

    const firstFunction = symbolTable.symbols.get('first_function');
    expect(firstFunction).toBeDefined();
    expect(firstFunction!.location.line).toBe(2);

    const secondFunction = symbolTable.symbols.get('second_function');
    expect(secondFunction).toBeDefined();
    expect(secondFunction!.location.line).toBe(5);
  });
});