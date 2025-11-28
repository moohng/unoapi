import { describe, it, expect } from 'vitest';
import { parseImports, mergeImports } from '../src/import';
import { ImportItem } from '../src/types';

describe('parseImports', () => {
  const testCases = [
    {
      name: '解析默认导入',
      code: `import React from 'react';
const a = 1;`,
      expectedImports: [
        { path: 'react', defaultName: 'React', onlyType: false }
      ],
      expectedOtherLines: ['const a = 1;']
    },
    {
      name: '解析命名导入',
      code: `import { useState, useEffect } from 'react';`,
      expectedImports: [
        { path: 'react', names: ['useState', 'useEffect'], defaultName: undefined, onlyType: false }
      ],
      expectedOtherLines: []
    },
    {
      name: '解析混合导入',
      code: `import React, { useState } from 'react';`,
      expectedImports: [
        { path: 'react', defaultName: 'React', names: ['useState'], onlyType: false }
      ],
      expectedOtherLines: []
    },
    {
      name: '解析类型导入',
      code: `import type { User } from './types';`,
      expectedImports: [
        { path: './types', names: ['User'], defaultName: undefined, onlyType: true }
      ],
      expectedOtherLines: []
    },
    {
      name: '解析默认类型导入',
      code: `import type User from './types';`,
      expectedImports: [
        { path: './types', defaultName: 'User', onlyType: true }
      ],
      expectedOtherLines: []
    },
    {
      name: '解析命名空间导入',
      code: `import * as React from 'react';`,
      expectedImports: [
        { path: 'react', asName: 'React', onlyType: false }
      ],
      expectedOtherLines: []
    },
    {
      name: '解析无法识别的导入',
      code: `import 'style.css';`,
      expectedImports: [`import 'style.css';`],
      expectedOtherLines: []
    }
  ];

  for (const { name, code, expectedImports, expectedOtherLines } of testCases) {
    it(`测试：${name}`, () => {
      const result = parseImports(code);
      // Simplify comparison by removing undefined properties from result items if needed,
      // but toEqual should handle it if structure matches.
      // We might need to be careful about optional properties in ImportItem.

      // Let's check length first
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
  }
});

describe('mergeImports', () => {
  const testCases = [
    {
      name: '合并新的命名导入',
      existing: [
        { path: 'react', defaultName: 'React' }
      ] as ImportItem[],
      newImports: [
        { path: 'react', names: ['useState'] }
      ] as ImportItem[],
      expected: `import React, { useState } from 'react';`
    },
    {
      name: '添加新的导入',
      existing: [
        { path: 'react', defaultName: 'React' }
      ] as ImportItem[],
      newImports: [
        { path: 'vue', defaultName: 'Vue' }
      ] as ImportItem[],
      expected: `import React from 'react';\nimport Vue from 'vue';`
    },
    {
      name: '合并重复的命名导入',
      existing: [
        { path: 'react', names: ['useState'] }
      ] as ImportItem[],
      newImports: [
        { path: 'react', names: ['useState', 'useEffect'] }
      ] as ImportItem[],
      expected: `import { useState, useEffect } from 'react';`
    },
    {
      name: '保留字符串导入',
      existing: [
        `import 'style.css';`
      ] as any[],
      newImports: [],
      expected: `import 'style.css';`
    },
    {
      name: '合并类型导入',
      existing: [
        { path: './types', names: ['User'], onlyType: true }
      ] as ImportItem[],
      newImports: [
        { path: './types', names: ['Post'], onlyType: true }
      ] as ImportItem[],
      expected: `import type { User, Post } from './types';`
    }
  ];

  for (const { name, existing, newImports, expected } of testCases) {
    it(`测试：${name}`, () => {
      const result = mergeImports(existing, newImports);
      expect(result).toBe(expected);
    });
  }
});
