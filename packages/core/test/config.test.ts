import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { defineUnoConfig, getConfigFile, UnoConfigType, existsConfig, loadConfig } from '../src/config';

// Mock fs/promises
vi.mock('fs/promises');
vi.mock('esbuild');

describe('config 模块测试', () => {
  const cwd = process.cwd();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('defineUnoConfig', () => {
    const testCases = [
      {
        name: '普通对象配置',
        input: { openapiUrl: 'http://example.com' },
        expected: { openapiUrl: 'http://example.com' }
      },
      {
        name: '函数配置',
        input: () => ({ openapiUrl: 'http://example.com' }),
        expected: { openapiUrl: 'http://example.com' }
      },
      {
        name: '异步函数配置',
        input: async () => ({ openapiUrl: 'http://example.com' }),
        expected: { openapiUrl: 'http://example.com' }
      }
    ];

    for (const { name, input, expected } of testCases) {
      it(`测试：${name}`, async () => {
        const result = await defineUnoConfig(input);
        expect(result).toEqual(expected);
      });
    }
  });

  describe('getConfigFile', () => {
    const testCases = [
      { type: UnoConfigType.PACKAGE, expected: path.join(cwd, 'package.json') },
      { type: UnoConfigType.JS, expected: path.join(cwd, 'unoapi.config.js') },
      { type: UnoConfigType.TS, expected: path.join(cwd, 'unoapi.config.ts') },
      { type: undefined, expected: path.join(cwd, 'package.json') }
    ];

    for (const { type, expected } of testCases) {
      it(`测试：获取 ${type ? UnoConfigType[type] : '默认'} 类型的配置文件路径`, () => {
        expect(getConfigFile(type)).toBe(expected);
      });
    }
  });

  describe('existsConfig', () => {
    it('测试：package.json 中存在配置', async () => {
      const pkgPath = path.join(cwd, 'package.json');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ unoapi: {} }));

      const result = await existsConfig(UnoConfigType.PACKAGE);
      expect(result).toBe(true);
      expect(fs.readFile).toHaveBeenCalledWith(pkgPath, 'utf-8');
    });

    // Since mocking require is complex dynamically in loop, we'll focus on fs.access for JS/TS
    // and skip PACKAGE for now or handle it separately if needed.
    // Let's stick to simple fs mocks for now.

    const fsTestCases = [
      {
        name: 'JS 配置文件存在',
        type: UnoConfigType.JS,
        exists: true,
        expected: true
      },
      {
        name: 'TS 配置文件不存在',
        type: UnoConfigType.TS,
        exists: false,
        expected: false
      }
    ];

    for (const { name, type, exists, expected } of fsTestCases) {
      it(`测试：${name}`, async () => {
        if (exists) {
          vi.mocked(fs.access).mockResolvedValue(undefined);
        } else {
          vi.mocked(fs.access).mockRejectedValue(new Error());
        }
        const result = await existsConfig(type);
        expect(result).toBe(expected);
      });
    }
  });

  // Testing checkConfig logic via loadConfig (mocking the loading part)
  // Since checkConfig is not exported, we test the result of loadConfig which calls checkConfig
  describe('loadConfig (配置解析逻辑)', () => {
    // We need to mock how loadConfig reads files.
    // loadConfig reads package.json first.

    it('测试：默认配置', async () => {
      // Mock package.json read failure
      vi.mocked(fs.readFile).mockRejectedValue(new Error());
      // Mock existsPath for JS/TS to false
      vi.mocked(fs.access).mockRejectedValue(new Error());

      const config = await loadConfig();
      expect(config.output).toBe(path.join(cwd, 'src/api'));
      expect(config.cacheFile).toBe(path.join(cwd, 'src/api/.openapi-cache.json'));
    });

    it('测试：从 package.json 加载', async () => {
      const mockConfig = { unoapi: { openapiUrl: 'url', output: 'out', onlyModel: true } };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadConfig();
      expect(config.openapiUrl).toBe('url');
      expect(config.output).toBe(path.join(cwd, 'out'));
      expect(config.modelOutput).toBe(path.join(cwd, 'out'));
      expect(config.cacheFile).toBe(path.join(cwd, 'out/.openapi-cache.json'));
      expect(config.onlyModel).toBe(true);
    });
  });
});
