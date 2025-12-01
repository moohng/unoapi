import { describe, it, expect } from 'vitest';
import { parseUrl, parseRefKey, parseProperty } from '../src/parse';

describe('parseUrl', () => {
  it('测试：/api/user/login', () => {
    const result = parseUrl('/api/user/login');
    expect(result).toEqual({
      funcName: 'login',
      fileName: 'user',
      dirName: 'api',
      pathStrParams: [],
    });
  });

  it('测试：/login', () => {
    const result = parseUrl('/login');
    expect(result).toEqual({
      funcName: 'login',
      fileName: 'index',
      dirName: '',
      pathStrParams: [],
    });
  });

  it('测试：/api/user/{id}', () => {
    const result = parseUrl('/api/user/{id}');
    expect(result).toEqual({
      funcName: 'userById',
      fileName: 'user',
      dirName: 'api',
      pathStrParams: ['id'],
    });
  });

  it('测试：/api/user/:id', () => {
    const result = parseUrl('/api/user/:id');
    expect(result).toEqual({
      funcName: 'userById',
      fileName: 'user',
      dirName: 'api',
      pathStrParams: ['id'],
    });
  });

  it('测试：/api/user-info/get-data', () => {
    const result = parseUrl('/api/user-info/get-data');
    expect(result).toEqual({
      funcName: 'getData',
      fileName: 'userInfo',
      dirName: 'api',
      pathStrParams: [],
    });
  });

  it('测试：/api/v1/user/{userId}/details', () => {
    const result = parseUrl('/api/v1/user/{userId}/details');
    expect(result).toEqual({
      funcName: 'details',
      fileName: 'user',
      dirName: 'api/v1',
      pathStrParams: ['userId'],
    });
  });

  it('测试：/POST https://oapi.dingtalk.com/topapi/asr/voice/translate', () => {
    const result = parseUrl('/POST https://oapi.dingtalk.com/topapi/asr/voice/translate');
    expect(result).toEqual({
      funcName: 'translate',
      fileName: 'voice',
      dirName: 'topapi/asr',
      pathStrParams: [],
    });
  });
});

describe('parseRefKey', () => {
  it('测试：UserDTO', () => {
    const result = parseRefKey('UserDTO');
    expect(result).toEqual({
      typeName: 'UserDTO',
      fileName: 'UserDTO',
    });
  });

  it('测试：Response<UserDTO>', () => {
    const result = parseRefKey('Response<UserDTO>');
    expect(result).toEqual({
      typeName: 'Response<UserDTO>',
      fileName: 'Response',
    });
  });

  it('测试：Response<UserDTO[]>', () => {
    const result = parseRefKey('Response<UserDTO[]>');
    expect(result).toEqual({
      typeName: 'Response<UserDTO[]>',
      fileName: 'Response',
    });
  });

  it('测试：com.example.dto.UserDTO', () => {
    const result = parseRefKey('com.example.dto.UserDTO');
    expect(result).toEqual({
      typeName: 'UserDTO',
      fileName: 'UserDTO',
    });
  });

  it('测试：#/components/schemas/Response«com.example.dto.User»', () => {
    const result = parseRefKey('#/components/schemas/Response«com.example.dto.User»');
    expect(result).toEqual({
      typeName: 'Response<User>',
      fileName: 'Response',
    });
  });

  it('测试：Response«List«User对象»»', () => {
    const result = parseRefKey('Response«List«User对象»»');
    expect(result).toEqual({
      typeName: 'Response<User[]>',
      fileName: 'Response',
    });
  });

  it('测试：com.zmn.common.dto2.ResponseDTO«com.zmn.common.dto2.PageResult«RecommendItemVO对象»»', () => {
    const result = parseRefKey('com.zmn.common.dto2.ResponseDTO«com.zmn.common.dto2.PageResult«RecommendItemVO对象»»');
    expect(result).toEqual({
      typeName: 'ResponseDTO<PageResult<RecommendItemVO>>',
      fileName: 'ResponseDTO',
    });
  });

  it('测试：#/components/schemas/发票对象', () => {
    const result = parseRefKey('#/components/schemas/发票对象');
    expect(result).toEqual({
      typeName: '发票对象',
      fileName: '发票对象',
    });
  });
});

describe('parseProperty', () => {
  it('测试：string', () => {
    expect(parseProperty('string')).toEqual({
      tsType: 'string',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：integer', () => {
    expect(parseProperty('integer')).toEqual({
      tsType: 'number',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：boolean', () => {
    expect(parseProperty('boolean')).toEqual({
      tsType: 'boolean',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：int', () => {
    expect(parseProperty('int')).toEqual({
      tsType: 'number',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：object', () => {
    expect(parseProperty('object')).toEqual({
      tsType: 'object',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：unknown', () => {
    expect(parseProperty('unknown')).toEqual({
      tsType: 'unknown',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：ABBSBSB', () => {
    expect(parseProperty('ABBSBSB')).toEqual({
      tsType: 'ABBSBSB',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：{ type: "long" }', () => {
    expect(parseProperty({ type: 'long' } as any)).toEqual({
      tsType: 'number',
      refs: [],
      tsFileName: undefined,
    });
  });

  it('测试：{ type: "array", items: { $ref: ... } }', () => {
    expect(parseProperty({ type: 'array', items: { $ref: '#/components/schemas/com.example.dto.UserDTO' } } as any)).toEqual({
      tsType: 'UserDTO[]',
      refs: ['#/components/schemas/com.example.dto.UserDTO'],
      tsFileName: 'UserDTO',
    });
  });

  it('测试：{ type: ["array", "null"], items: { $ref: ... } }', () => {
    expect(parseProperty({ type: ['array', 'null'], items: { $ref: '#/components/schemas/com.example.dto.UserDTO' } } as any)).toEqual({
      tsType: 'UserDTO[]',
      refs: ['#/components/schemas/com.example.dto.UserDTO'],
      tsFileName: 'UserDTO',
    });
  });

  it('测试：{ $ref: ... }', () => {
    expect(parseProperty({ $ref: '#/components/schemas/com.example.dto.UserDTO' } as any)).toEqual({
      tsType: 'UserDTO',
      refs: ['#/components/schemas/com.example.dto.UserDTO'],
      tsFileName: 'UserDTO',
    });
  });

  it('测试：{ $ref: ... } (nested generic)', () => {
    expect(parseProperty({ $ref: '#/components/schemas/Response«List«User对象»»' } as any)).toEqual({
      tsType: 'Response<User[]>',
      refs: ['#/components/schemas/Response«List«User对象»»'],
      tsFileName: 'Response',
    });
  });

  it('测试：{ $ref: ... } (int generic)', () => {
    expect(parseProperty({ $ref: '#/components/schemas/Response«List«int»»' } as any)).toEqual({
      tsType: 'Response<number[]>',
      refs: ['#/components/schemas/Response«List«int»»'],
      tsFileName: 'Response',
    });
  });
});
