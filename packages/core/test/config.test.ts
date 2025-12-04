import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { defineUnoConfig, getConfigFile, UnoConfigType, existsConfig, loadConfig, getCacheFile, DEFAULT_CACHE_FILE } from '../src/config';

// Mock fs/promises
vi.mock('fs/promises');
vi.mock('esbuild');

describe('config 模块测试', () => {
  const cwd = process.cwd();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('defineUnoConfig', () => {
    it('测试：普通对象配置', async () => {
      const input = { input: 'http://example.com' };
      const expected = { input: 'http://example.com' };
      const result = await defineUnoConfig(input);
      expect(result).toEqual(expected);
    });

    it('测试：函数配置', async () => {
      const input = () => ({ input: 'http://example.com' });
      const expected = { input: 'http://example.com' };
      const result = await defineUnoConfig(input);
      expect(result).toEqual(expected);
    });

    it('测试：异步函数配置', async () => {
      const input = async () => ({ input: 'http://example.com' });
      const expected = { input: 'http://example.com' };
      const result = await defineUnoConfig(input);
      expect(result).toEqual(expected);
    });
  });

  describe('getConfigFile', () => {
    it('测试：获取 PACKAGE 类型的配置文件路径', () => {
      const expected = path.join(cwd, 'package.json');
      expect(getConfigFile(UnoConfigType.PACKAGE)).toBe(expected);
    });

    it('测试：获取 JS 类型的配置文件路径', () => {
      const expected = path.join(cwd, 'unoapi.config.js');
      expect(getConfigFile(UnoConfigType.JS)).toBe(expected);
    });

    it('测试：获取 TS 类型的配置文件路径', () => {
      const expected = path.join(cwd, 'unoapi.config.ts');
      expect(getConfigFile(UnoConfigType.TS)).toBe(expected);
    });

    it('测试：获取 默认 类型的配置文件路径', () => {
      const expected = path.join(cwd, 'package.json');
      expect(getConfigFile(undefined)).toBe(expected);
    });
  });

  describe('existsConfig', () => {
    it('测试：package.json 中存在配置', async () => {
      const pkgPath = path.join(cwd, 'package.json');
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ unoapi: {} }));

      const result = await existsConfig(UnoConfigType.PACKAGE);
      expect(result).toBe(true);
      expect(fs.readFile).toHaveBeenCalledWith(pkgPath, 'utf-8');
    });

    it('测试：JS 配置文件存在', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const result = await existsConfig(UnoConfigType.JS);
      expect(result).toBe(true);
    });

    it('测试：TS 配置文件不存在', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error());
      const result = await existsConfig(UnoConfigType.TS);
      expect(result).toBe(false);
    });
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
      expect(config.cacheFile).toBe(path.join(cwd, DEFAULT_CACHE_FILE));
    });

    it('测试：从 package.json 加载', async () => {
      const mockConfig = { unoapi: { input: 'url', output: 'out', onlyModel: true } };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadConfig();
      expect(config.input).toBe('url');
      expect(config.output).toBe(path.join(cwd, 'out'));
      expect(config.modelOutput).toBe(undefined);
      expect(config.cacheFile).toBe(path.join(cwd, DEFAULT_CACHE_FILE));
      expect(config.onlyModel).toBe(true);
    });
  });

  describe('getCacheFile', () => {
    it('测试：获取缓存文件路径', () => {
      const output = path.join(cwd, 'out');
      const expected = path.join(output, DEFAULT_CACHE_FILE);
      expect(getCacheFile(output)).toBe(expected);
    });

    it('测试：获取缓存文件路径（默认）', () => {
      const expected = path.join(cwd, DEFAULT_CACHE_FILE);
      expect(getCacheFile()).toBe(expected);
    });

    it('测试：获取缓存文件路径（不存在）', () => {
      const expected = path.join(cwd, DEFAULT_CACHE_FILE);
      expect(getCacheFile('')).toBe(expected);
    });

    it('测试：获取缓存文件路径（不存在）', () => {
      const expected = path.join(cwd, 'out', DEFAULT_CACHE_FILE);
      expect(getCacheFile('./out')).toBe(expected);
    });

    it('测试：获取缓存文件路径（不存在）', () => {
      const expected = path.join(cwd, DEFAULT_CACHE_FILE);
      expect(getCacheFile('./')).toBe(expected);
    });
  });
});
