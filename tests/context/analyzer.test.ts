import { ProjectAnalyzer } from '../../src/context/analyzer';
import { ProjectContext } from '../../src/interfaces/context';
import { ArchitecturalPattern } from '../../src/interfaces/common';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

const mockFs = require('fs');

// Simplified tests focusing on ProjectAnalyzer only to avoid TypeScript import issues

describe('ProjectAnalyzer', () => {
  let analyzer: ProjectAnalyzer;

  beforeEach(() => {
    analyzer = new ProjectAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeProject', () => {
    it('should return project context with basic structure', async () => {
      // Mock all fs operations to avoid real file system access
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('');
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const projectContext = await analyzer.analyzeProject('/test/project');

      expect(projectContext).toBeDefined();
      expect(projectContext.projectId).toBe('project');
      expect(projectContext.language).toBeDefined();
      expect(projectContext.framework).toBeDefined();
      expect(projectContext.architecture).toBeDefined();
      expect(projectContext.dependencies).toBeDefined();
      expect(projectContext.codeStyle).toBeDefined();
      expect(projectContext.qualityMetrics).toBeDefined();
    });

    it('should provide default values when no config files exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('');
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const projectContext = await analyzer.analyzeProject('/test/project');

      expect(projectContext.language).toBe('unknown');
      expect(projectContext.framework).toBe('none');
      expect(projectContext.architecture).toBe('monolithic');
      expect(projectContext.dependencies).toEqual([]);
    });

    it('should provide default code style and quality metrics', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('');
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const projectContext = await analyzer.analyzeProject('/test/project');

      expect(projectContext.codeStyle).toBeDefined();
      expect(projectContext.codeStyle.indentation).toBe('spaces');
      expect(projectContext.codeStyle.naming).toBe('camelCase');
      expect(projectContext.codeStyle.structure.maxLineLength).toBe(100);

      expect(projectContext.qualityMetrics).toBeDefined();
      expect(projectContext.qualityMetrics.complexity).toBeGreaterThan(0);
      expect(projectContext.qualityMetrics.maintainability).toBeGreaterThan(0);
      expect(projectContext.qualityMetrics.testCoverage).toBeGreaterThanOrEqual(0);
      expect(projectContext.qualityMetrics.codeSmells).toBeGreaterThanOrEqual(0);
    });

    it('should handle file system errors gracefully', async () => {
      // Mock fs to throw errors
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const projectContext = await analyzer.analyzeProject('/test/project');

      // Should still return a valid project context
      expect(projectContext).toBeDefined();
      expect(projectContext.projectId).toBe('project');
      expect(projectContext.language).toBe('unknown');
      expect(projectContext.framework).toBe('none');
    });

    it('should extract project ID from path', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('');
      mockFs.readdirSync.mockReturnValue([]);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const projectContext = await analyzer.analyzeProject('/path/to/my-awesome-project');

      expect(projectContext.projectId).toBe('my-awesome-project');
    });
  });
});