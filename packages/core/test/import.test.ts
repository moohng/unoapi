import { describe, it, expect } from 'vitest';
import { parseImports, mergeImports } from '../src/import';
import { ImportItem } from '../src/types';

describe('parseImports', () => {
  it('测试：解析默认导入', () => {
    const code = `import React from 'react';
const a = 1;`;
    const expectedImports = [
      { path: 'react', defaultName: 'React', onlyType: false }
    ];
    const expectedOtherLines = ['const a = 1;'];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析命名导入', () => {
    const code = `import { useState, useEffect } from 'react';`;
    const expectedImports = [
      { path: 'react', names: ['useState', 'useEffect'], defaultName: undefined, onlyType: false }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析混合导入', () => {
    const code = `import React, { useState } from 'react';`;
    const expectedImports = [
      { path: 'react', defaultName: 'React', names: ['useState'], onlyType: false }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析类型导入', () => {
    const code = `import type { User } from './types';`;
    const expectedImports = [
      { path: './types', names: ['User'], defaultName: undefined, onlyType: true }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析默认类型导入', () => {
    const code = `import type User from './types';`;
    const expectedImports = [
      { path: './types', defaultName: 'User', onlyType: true }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析命名空间导入', () => {
    const code = `import * as React from 'react';`;
    const expectedImports = [
      { path: 'react', asName: 'React', onlyType: false }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析无法识别的导入', () => {
    const code = `import 'style.css';`;
    const expectedImports = [`import 'style.css';`];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });

  it('测试：解析换行导入', () => {
    const code = `import {
  useState,
  useEffect
} from 'react';`;
    const expectedImports = [
      { path: 'react', names: ['useState', 'useEffect'], defaultName: undefined, onlyType: false }
    ];
    const expectedOtherLines: string[] = [];

    const result = parseImports(code);
    expect(result.parsedImports.length).toBe(expectedImports.length);
    result.parsedImports.forEach((item, index) => {
      const expected = expectedImports[index];
      if (typeof item === 'string') {
        expect(item).toBe(expected);
      } else {
        expect(item).toEqual(expect.objectContaining(expected));
      }
    });
    expect(result.otherLines.map(l => l.trim()).filter(Boolean)).toEqual(expectedOtherLines);
  });
});

describe('mergeImports', () => {
  it('测试：合并新的命名导入', () => {
    const existing = [
      { path: 'react', defaultName: 'React' }
    ] as ImportItem[];
    const newImports = [
      { path: 'react', names: ['useState'] }
    ] as ImportItem[];
    const expected = `import React, { useState } from 'react';`;
    const result = mergeImports(existing, newImports);
    expect(result).toBe(expected);
  });

  it('测试：添加新的导入', () => {
    const existing = [
      { path: 'react', defaultName: 'React' }
    ] as ImportItem[];
    const newImports = [
      { path: 'vue', defaultName: 'Vue' }
    ] as ImportItem[];
    const expected = `import React from 'react';\nimport Vue from 'vue';`;
    const result = mergeImports(existing, newImports);
    expect(result).toBe(expected);
  });

  it('测试：合并重复的命名导入', () => {
    const existing = [
      { path: 'react', names: ['useState'] }
    ] as ImportItem[];
    const newImports = [
      { path: 'react', names: ['useState', 'useEffect'] }
    ] as ImportItem[];
    const expected = `import { useState, useEffect } from 'react';`;
    const result = mergeImports(existing, newImports);
    expect(result).toBe(expected);
  });

  it('测试：保留字符串导入', () => {
    const existing = [
      `import 'style.css';`
    ] as any[];
    const newImports: ImportItem[] = [];
    const expected = `import 'style.css';`;
    const result = mergeImports(existing, newImports);
    expect(result).toBe(expected);
  });

  it('测试：合并类型导入', () => {
    const existing = [
      { path: './types', names: ['User'], onlyType: true }
    ] as ImportItem[];
    const newImports = [
      { path: './types', names: ['Post'], onlyType: true }
    ] as ImportItem[];
    const expected = `import type { User, Post } from './types';`;
    const result = mergeImports(existing, newImports);
    expect(result).toBe(expected);
  });
});
