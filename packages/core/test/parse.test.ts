import { describe, it, expect } from 'vitest';
import { parseUrl, parseRefKey, parseProperty } from '../src/parse';

describe('parseUrl', () => {

  const testCases = [
    { url: '/api/user/login', funcName: 'login', fileName: 'user', dirName: 'api', pathStrParams: [] },
    { url: '/login', funcName: 'login', fileName: 'index', dirName: '', pathStrParams: [] },
    { url: '/api/user/{id}', funcName: 'userById', fileName: 'user', dirName: 'api', pathStrParams: ['id'] },
    { url: '/api/user/:id', funcName: 'userById', fileName: 'user', dirName: 'api', pathStrParams: ['id'] },
    { url: '/api/user-info/get-data', funcName: 'getData', fileName: 'userInfo', dirName: 'api', pathStrParams: [] },
    { url: '/api/v1/user/{userId}/details', funcName: 'details', fileName: 'user', dirName: 'api/v1', pathStrParams: ['userId'] },
  ];

  for (const testCase of testCases) {
    it(`测试：${testCase.url}`, () => {
      const result = parseUrl(testCase.url);
      expect(result).toEqual({
        funcName: testCase.funcName,
        fileName: testCase.fileName,
        dirName: testCase.dirName,
        pathStrParams: testCase.pathStrParams,
      });
    });
  }
});

describe('parseRefKey', () => {
  const testCases = [
    { refKey: 'UserDTO', typeName: 'UserDTO', fileName: 'UserDTO' },
    { refKey: 'Response<UserDTO>', typeName: 'Response<UserDTO>', fileName: 'Response' },
    { refKey: 'Response<UserDTO[]>', typeName: 'Response<UserDTO[]>', fileName: 'Response' },
    { refKey: 'com.example.dto.UserDTO', typeName: 'UserDTO', fileName: 'UserDTO' },
    { refKey: '#/components/schemas/Response«com.example.dto.User»', typeName: 'Response<User>', fileName: 'Response' },
    { refKey: 'Response«List«User对象»»', typeName: 'Response<User[]>', fileName: 'Response' },
    { refKey: 'com.zmn.common.dto2.ResponseDTO«com.zmn.common.dto2.PageResult«RecommendItemVO对象»»', typeName: 'ResponseDTO<PageResult<RecommendItemVO>>', fileName: 'ResponseDTO' },
    { refKey: '#/components/schemas/发票对象', typeName: '发票对象', fileName: '发票对象' },
  ];

  for (const testCase of testCases) {
    it(`测试：${testCase.refKey}`, () => {
      const result = parseRefKey(testCase.refKey);
      expect(result).toEqual({
        typeName: testCase.typeName,
        fileName: testCase.fileName,
      });
    });
  }
});

describe('parseProperty', () => {
  const testCases = [
    { property: 'string', tsType: 'string', refs: [] },
    { property: 'integer', tsType: 'number', refs: [] },
    { property: 'boolean', tsType: 'boolean', refs: [] },
    { property: 'int', tsType: 'number', refs: [] },
    { property: 'object', tsType: 'object', refs: [] },
    { property: 'unknown', tsType: 'unknown', refs: [] },
    { property: 'ABBSBSB', tsType: 'ABBSBSB', refs: [] },
    { property: { type: 'long' }, tsType: 'number', refs: [] },
    { property: { type: 'array', items: { $ref: '#/components/schemas/com.example.dto.UserDTO' } }, tsType: 'UserDTO[]', refs: ['#/components/schemas/com.example.dto.UserDTO'], tsFileName: 'UserDTO' },
    { property: { $ref: '#/components/schemas/com.example.dto.UserDTO' }, tsType: 'UserDTO', refs: ['#/components/schemas/com.example.dto.UserDTO'], tsFileName: 'UserDTO' },
    { property: { $ref: '#/components/schemas/Response«List«User对象»»' }, tsType: 'Response<User[]>', refs: ['#/components/schemas/Response«List«User对象»»'], tsFileName: 'Response' },
    { property: { $ref: '#/components/schemas/Response«List«int»»' }, tsType: 'Response<number[]>', refs: ['#/components/schemas/Response«List«int»»'], tsFileName: 'Response' },
  ];
  for (const testCase of testCases) {
    it(`测试：${typeof testCase.property === 'string' ? testCase.property : JSON.stringify(testCase.property)}`, () => {
      expect(parseProperty(testCase.property as any)).toEqual({
        tsType: testCase.tsType,
        refs: testCase.refs,
        tsFileName: testCase.tsFileName,
      });
    });
  }
});
