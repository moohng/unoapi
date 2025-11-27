import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { isBaseType, upperFirst, existsPath, isSimilar, isAllowGenerate, getAllowTypeName } from '../src/tools';

// Mock fs/promises
vi.mock('fs/promises');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isBaseType', () => {
  const testCases = [
    { type: 'string', expected: true },
    { type: 'number', expected: true },
    { type: 'boolean', expected: true },
    { type: 'object', expected: true },
    { type: 'any', expected: true },
    { type: 'unknown', expected: true },
    { type: 'User', expected: false },
    { type: 'Array', expected: false },
    { type: '', expected: false },
  ];

  for (const { type, expected } of testCases) {
    it(`测试：${type}`, () => {
      expect(isBaseType(type)).toBe(expected);
    });
  }
});

describe('upperFirst', () => {
  const testCases = [
    { input: 'hello', expected: 'Hello' },
    { input: 'world', expected: 'World' },
    { input: '', expected: '' },
    { input: 'a', expected: 'A' },
    { input: 'Hello', expected: 'Hello' },
  ];

  for (const { input, expected } of testCases) {
    it(`测试：${input}`, () => {
      expect(upperFirst(input)).toBe(expected);
    });
  }
});

describe('isSimilar', () => {
  const testCases = [
    { str1: 'abc', str2: 'abc', expected: true },
    { str1: 'Abc', str2: 'abc', expected: true },
    { str1: 'ABC', str2: 'abc', expected: true },
    { str1: 'abc', str2: 'def', expected: false },
    { str1: undefined, str2: undefined, expected: true },
    { str1: 'abc', str2: undefined, expected: false },
    { str1: undefined, str2: 'abc', expected: false },
  ];

  for (const { str1, str2, expected } of testCases) {
    it(`测试：${str1} ${str2}`, () => {
      expect(isSimilar(str1, str2)).toBe(expected);
    });
  }
});

describe('existsPath', () => {
  const testCases = [
    { path: '/path/to/existing/file', mockSuccess: true, expected: true, desc: 'existing path' },
    { path: '/path/to/non-existent/file', mockSuccess: false, expected: false, desc: 'non-existent path' },
  ];

  for (const { path, mockSuccess, expected, desc } of testCases) {
    it(`测试：${desc}`, async () => {
      if (mockSuccess) {
        vi.mocked(fs.access).mockResolvedValue(undefined);
      } else {
        vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
      }

      const result = await existsPath(path);
      expect(result).toBe(expected);
      expect(fs.access).toHaveBeenCalledWith(path);
    });
  }
});

describe('isAllowGenerate', () => {
  const testCases = [
    { name: '/declarer/bindingDeclarer', ignores: ['/declarer/bindingDeclarer'], expected: false },
    { name: '/declarer/bindingDeclarer', ignores: ['declarer/bindingDeclarer'], expected: true },
    { name: '#/components/schemas/Abc', ignores: [/Ab/], expected: false },
    { name: '#/components/schemas/com.example.dto.UserDTO', ignores: ['UserDTO'], expected: false },
    { name: 'def', ignores: ['abc'], expected: true },
    { name: 'abc', ignores: undefined, expected: true },
    { name: undefined, ignores: ['abc'], expected: false },
  ];

  for (const { name, ignores, expected } of testCases) {
    it(`测试：${name} ${ignores}`, () => {
      expect(isAllowGenerate(name, ignores)).toBe(expected);
    });
  }
});

describe('getAllowTypeName', () => {
  const testCases = [
    { tsType: 'User', ignores: undefined, expected: 'User' },
    { tsType: 'User[]', ignores: undefined, expected: 'User[]' },
    { tsType: 'Res<User>', ignores: undefined, expected: 'Res<User>' },
    { tsType: 'User', ignores: ['User'], expected: '' },
    { tsType: 'User[]', ignores: ['User'], expected: '' },
    { tsType: 'Res<User>', ignores: ['User'], expected: 'Res<User>' },
    { tsType: 'Res<User[]>', ignores: ['Res', 'User'], expected: '' },
    { tsType: 'Res<User[]>', ignores: ['Res'], expected: 'User[]' },
  ];

  for (const { tsType, ignores, expected } of testCases) {
    it(`测试：${tsType} ${ignores}`, () => {
      expect(getAllowTypeName(tsType, ignores)).toBe(expected);
    });
  }
});
