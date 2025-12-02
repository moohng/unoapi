import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { isBaseType, upperFirst, existsPath, isSimilar, isAllowGenerate, getAllowTypeName, isDirectory } from '../src/tools';

// Mock fs/promises
vi.mock('fs/promises');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isBaseType', () => {
  it('测试：string', () => {
    expect(isBaseType('string')).toBe(true);
  });
  it('测试：number', () => {
    expect(isBaseType('number')).toBe(true);
  });
  it('测试：boolean', () => {
    expect(isBaseType('boolean')).toBe(true);
  });
  it('测试：object', () => {
    expect(isBaseType('object')).toBe(true);
  });
  it('测试：any', () => {
    expect(isBaseType('any')).toBe(true);
  });
  it('测试：unknown', () => {
    expect(isBaseType('unknown')).toBe(true);
  });
  it('测试：User', () => {
    expect(isBaseType('User')).toBe(false);
  });
  it('测试：Array', () => {
    expect(isBaseType('Array')).toBe(false);
  });
  it('测试：空字符串', () => {
    expect(isBaseType('')).toBe(false);
  });
});

describe('upperFirst', () => {
  it('测试：hello', () => {
    expect(upperFirst('hello')).toBe('Hello');
  });
  it('测试：world', () => {
    expect(upperFirst('world')).toBe('World');
  });
  it('测试：空字符串', () => {
    expect(upperFirst('')).toBe('');
  });
  it('测试：a', () => {
    expect(upperFirst('a')).toBe('A');
  });
  it('测试：Hello', () => {
    expect(upperFirst('Hello')).toBe('Hello');
  });
});

describe('isSimilar', () => {
  it('测试：abc abc', () => {
    expect(isSimilar('abc', 'abc')).toBe(true);
  });
  it('测试：Abc abc', () => {
    expect(isSimilar('Abc', 'abc')).toBe(true);
  });
  it('测试：ABC abc', () => {
    expect(isSimilar('ABC', 'abc')).toBe(true);
  });
  it('测试：abc def', () => {
    expect(isSimilar('abc', 'def')).toBe(false);
  });
  it('测试：undefined undefined', () => {
    expect(isSimilar(undefined, undefined)).toBe(true);
  });
  it('测试：abc undefined', () => {
    expect(isSimilar('abc', undefined)).toBe(false);
  });
  it('测试：undefined abc', () => {
    expect(isSimilar(undefined, 'abc')).toBe(false);
  });
});

describe('existsPath', () => {
  it('测试：existing path', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const result = await existsPath('/path/to/existing/file');
    expect(result).toBe(true);
    expect(fs.access).toHaveBeenCalledWith('/path/to/existing/file');
  });

  it('测试：non-existent path', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));
    const result = await existsPath('/path/to/non-existent/file');
    expect(result).toBe(false);
    expect(fs.access).toHaveBeenCalledWith('/path/to/non-existent/file');
  });
});

describe('isAllowGenerate', () => {
  it('测试：/declarer/bindingDeclarer (ignored)', () => {
    expect(isAllowGenerate('/declarer/bindingDeclarer', ['/declarer/bindingDeclarer'])).toBe(false);
  });
  it('测试：/declarer/bindingDeclarer (not ignored)', () => {
    expect(isAllowGenerate('/declarer/bindingDeclarer', ['declarer/bindingDeclarer'])).toBe(true);
  });
  it('测试：Regex ignore', () => {
    expect(isAllowGenerate('#/components/schemas/Abc', [/Ab/])).toBe(false);
  });
  it('测试：UserDTO ignore', () => {
    expect(isAllowGenerate('#/components/schemas/com.example.dto.UserDTO', ['UserDTO'])).toBe(false);
  });
  it('测试：def (not ignored)', () => {
    expect(isAllowGenerate('def', ['abc'])).toBe(true);
  });
  it('测试：abc (no ignores)', () => {
    expect(isAllowGenerate('abc', undefined)).toBe(true);
  });
  it('测试：undefined name', () => {
    expect(isAllowGenerate(undefined, ['abc'])).toBe(false);
  });
});

describe('getAllowTypeName', () => {
  it('测试：User (no ignores)', () => {
    expect(getAllowTypeName('User', undefined)).toBe('User');
  });
  it('测试：User[] (no ignores)', () => {
    expect(getAllowTypeName('User[]', undefined)).toBe('User[]');
  });
  it('测试：Res<User> (no ignores)', () => {
    expect(getAllowTypeName('Res<User>', undefined)).toBe('Res<User>');
  });
  it('测试：User (ignored)', () => {
    expect(getAllowTypeName('User', ['User'])).toBe('');
  });
  it('测试：User[] (ignored)', () => {
    expect(getAllowTypeName('User[]', ['User'])).toBe('');
  });
  it('测试：中文<User> (ignored)', () => {
    expect(getAllowTypeName('中文<User>', ['中文'])).toBe('User');
  });
  it('测试：Res<中文[]> (ignored)', () => {
    expect(getAllowTypeName('Res<中文[]>', ['Res', 'User'])).toBe('中文[]');
  });
  it('测试：Res<User[]> (ignored)', () => {
    expect(getAllowTypeName('Res<User[]>', ['Res'])).toBe('User[]');
  });
});

describe('isDirectory', () => {
  it('测试：', async () => {
    expect(await isDirectory('./')).toBe(true);
    expect(await isDirectory('./abc')).toBe(false);
    expect(await isDirectory('./abc/')).toBe(true);
    expect(await isDirectory('./abc/def')).toBe(false);
    expect(await isDirectory('./abc/def/')).toBe(true);
  });
})