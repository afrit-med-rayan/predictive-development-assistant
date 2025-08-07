import { MultiLanguageASTParser, TypeScriptASTParser, PythonASTParser } from '../../src/context/ast-parser';
import { AbstractSyntaxTree } from '../../src/interfaces/context';

describe('MultiLanguageASTParser', () => {
  let parser: MultiLanguageASTParser;

  beforeEach(() => {
    parser = new MultiLanguageASTParser();
  });

  describe('parseCode', () => {
    it('should parse TypeScript code correctly', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const ast = await parser.parseCode(code, 'typescript');
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('SourceFile');
      expect(ast.children.length).toBeGreaterThan(0);
      
      const functionNode = ast.children.find(child => child.type === 'FunctionDeclaration');
      expect(functionNode).toBeDefined();
      expect(functionNode!.metadata.text).toContain('greet');
    });

    it('should parse JavaScript code correctly', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;

      const ast = await parser.parseCode(code, 'javascript');
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('SourceFile');
      expect(ast.children.length).toBeGreaterThan(0);
      
      const functionNode = ast.children.find(child => child.type === 'FunctionDeclaration');
      expect(functionNode).toBeDefined();
      expect(functionNode!.metadata.text).toContain('add');
    });

    it('should parse Python code correctly', async () => {
      const code = `
def greet(name):
    return f"Hello, {name}!"

class Person:
    def __init__(self, name):
        self.name = name
      `;

      const ast = await parser.parseCode(code, 'python');
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Module');
      expect(ast.children.length).toBeGreaterThan(0);
      
      const functionNodes = ast.children.filter(child => child.type === 'FunctionDef');
      const classNodes = ast.children.filter(child => child.type === 'ClassDef');
      
      expect(functionNodes.length).toBeGreaterThan(0);
      expect(classNodes.length).toBeGreaterThan(0);
      
      const greetFunction = functionNodes.find(fn => fn.metadata.name === 'greet');
      expect(greetFunction).toBeDefined();
      
      const personClass = classNodes.find(cls => cls.metadata.name === 'Person');
      expect(personClass).toBeDefined();
    });

    it('should throw error for unsupported language', async () => {
      const code = 'print("Hello")';
      
      await expect(parser.parseCode(code, 'unsupported')).rejects.toThrow('Unsupported language: unsupported');
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript files', async () => {
      const mockFs = {
        readFileSync: jest.fn().mockReturnValue('const x = 1;')
      };
      jest.doMock('fs', () => mockFs);

      const ast = await parser.parseFile('test.ts');
      expect(ast).toBeDefined();
      expect(mockFs.readFileSync).toHaveBeenCalledWith('test.ts', 'utf-8');
    });

    it('should detect JavaScript files', async () => {
      const mockFs = {
        readFileSync: jest.fn().mockReturnValue('const x = 1;')
      };
      jest.doMock('fs', () => mockFs);

      const ast = await parser.parseFile('test.js');
      expect(ast).toBeDefined();
    });

    it('should detect Python files', async () => {
      const mockFs = {
        readFileSync: jest.fn().mockReturnValue('x = 1')
      };
      jest.doMock('fs', () => mockFs);

      const ast = await parser.parseFile('test.py');
      expect(ast).toBeDefined();
    });

    it('should throw error for unsupported file extension', async () => {
      await expect(parser.parseFile('test.unknown')).rejects.toThrow('Cannot detect language for file: test.unknown');
    });
  });
});

describe('TypeScriptASTParser', () => {
  let parser: TypeScriptASTParser;

  beforeEach(() => {
    parser = new TypeScriptASTParser();
  });

  it('should parse function declarations', () => {
    const code = 'function test() { return 42; }';
    const ast = parser.parse(code);

    expect(ast.type).toBe('SourceFile');
    expect(ast.children.length).toBeGreaterThan(0);
    
    const functionNode = ast.children.find(child => child.type === 'FunctionDeclaration');
    expect(functionNode).toBeDefined();
    expect(functionNode!.metadata.text).toContain('test');
  });

  it('should parse class declarations', () => {
    const code = `
      class TestClass {
        constructor(public name: string) {}
        
        greet(): string {
          return \`Hello, \${this.name}\`;
        }
      }
    `;
    
    const ast = parser.parse(code);
    const classNode = ast.children.find(child => child.type === 'ClassDeclaration');
    
    expect(classNode).toBeDefined();
    expect(classNode!.type).toBe('ClassDeclaration');
    expect(classNode!.children.length).toBeGreaterThan(0);
  });

  it('should parse variable declarations', () => {
    const code = 'const message: string = "Hello World";';
    const ast = parser.parse(code);

    const variableStatement = ast.children.find(child => child.type.includes('Statement') || child.type.includes('Declaration'));
    expect(variableStatement).toBeDefined();
  });

  it('should include source location metadata', () => {
    const code = 'function test() {\n  return 42;\n}';
    const ast = parser.parse(code, 'test.ts');

    const functionNode = ast.children.find(child => child.type === 'FunctionDeclaration');
    expect(functionNode).toBeDefined();
    expect(functionNode!.metadata.start).toEqual({
      line: 1,
      column: 1,
      file: 'test.ts'
    });
    expect(functionNode!.metadata.end.line).toBeGreaterThan(1);
  });

  it('should handle complex nested structures', () => {
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
        
        getUsers(): User[] {
          return this.users;
        }
      }
    `;
    
    const ast = parser.parse(code);
    expect(ast.children.length).toBeGreaterThan(0);
    
    const interfaceNode = ast.children.find(child => child.type === 'InterfaceDeclaration');
    expect(interfaceNode).toBeDefined();
    
    const classNode = ast.children.find(child => child.type === 'ClassDeclaration');
    expect(classNode).toBeDefined();
    expect(classNode!.children.length).toBeGreaterThan(0);
  });
});

describe('PythonASTParser', () => {
  let parser: PythonASTParser;

  beforeEach(() => {
    parser = new PythonASTParser();
  });

  it('should parse function definitions', () => {
    const code = `
def calculate_sum(a, b):
    return a + b

def greet(name):
    print(f"Hello, {name}")
    `;
    
    const ast = parser.parse(code);
    
    expect(ast.type).toBe('Module');
    expect(ast.children).toHaveLength(2);
    
    const firstFunction = ast.children[0];
    expect(firstFunction.type).toBe('FunctionDef');
    expect(firstFunction.metadata.name).toBe('calculate_sum');
    
    const secondFunction = ast.children[1];
    expect(secondFunction.type).toBe('FunctionDef');
    expect(secondFunction.metadata.name).toBe('greet');
  });

  it('should parse class definitions', () => {
    const code = `
class Animal:
    def __init__(self, name):
        self.name = name
    
    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return "Woof!"
    `;
    
    const ast = parser.parse(code);
    
    const classNodes = ast.children.filter(child => child.type === 'ClassDef');
    expect(classNodes.length).toBeGreaterThanOrEqual(2);
    
    const animalClass = classNodes.find(cls => cls.metadata.name === 'Animal');
    expect(animalClass).toBeDefined();
    
    const dogClass = classNodes.find(cls => cls.metadata.name === 'Dog');
    expect(dogClass).toBeDefined();
  });

  it('should parse import statements', () => {
    const code = `
import os
import sys
from typing import List, Dict
from collections import defaultdict
    `;
    
    const ast = parser.parse(code);
    
    expect(ast.children).toHaveLength(4);
    
    ast.children.forEach(child => {
      expect(child.type).toBe('Import');
    });
    
    expect(ast.children[0].metadata.module).toContain('import os');
    expect(ast.children[2].metadata.module).toContain('from typing');
  });

  it('should handle mixed Python code', () => {
    const code = `
import json
from typing import Optional

class DataProcessor:
    def __init__(self, config_path: str):
        self.config = self.load_config(config_path)
    
    def load_config(self, path: str) -> dict:
        with open(path, 'r') as f:
            return json.load(f)

def process_data(data: list) -> Optional[dict]:
    if not data:
        return None
    return {"processed": True, "count": len(data)}
    `;
    
    const ast = parser.parse(code);
    
    // Should find imports, class, and function
    const importNodes = ast.children.filter(child => child.type === 'Import');
    const classNodes = ast.children.filter(child => child.type === 'ClassDef');
    const functionNodes = ast.children.filter(child => child.type === 'FunctionDef');
    
    expect(importNodes).toHaveLength(2);
    expect(classNodes).toHaveLength(1);
    expect(functionNodes.length).toBeGreaterThanOrEqual(1);
    
    expect(classNodes[0].metadata.name).toBe('DataProcessor');
    const processDataFunction = functionNodes.find(fn => fn.metadata.name === 'process_data');
    expect(processDataFunction).toBeDefined();
  });

  it('should include line numbers in metadata', () => {
    const code = `
def first_function():
    pass

def second_function():
    pass
    `;
    
    const ast = parser.parse(code, 'test.py');
    
    expect(ast.children).toHaveLength(2);
    expect(ast.children[0].metadata.line).toBe(2);
    expect(ast.children[1].metadata.line).toBe(5);
    expect(ast.metadata.filePath).toBe('test.py');
  });
});