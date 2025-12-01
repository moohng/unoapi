import { describe, it, expect } from 'vitest';
import { transformTypeFieldCode, transformQueryCode, transformModelCode, transformApiCode, transformTypeIndexCode } from '../src/transform';
import { SchemaObject } from 'openapi3-ts/oas30';

describe('transformTypeFieldCode', () => {
  it('测试：基本类型对象', () => {
    const input = { name: 'age', required: true, schema: { type: 'integer' } };
    const expected = { code: '  age: number;', refs: [] };
    const result = transformTypeFieldCode(input as any);
    expect(result.code).toBe(expected.code);
    expect(result.refs).toEqual(expected.refs);
  });

  it('测试：可选字段', () => {
    const input = { name: 'email', required: false, schema: { type: 'string' } };
    const expected = { code: '  email?: string;', refs: [] };
    const result = transformTypeFieldCode(input as any);
    expect(result.code).toBe(expected.code);
    expect(result.refs).toEqual(expected.refs);
  });

  it('测试：带描述的字段', () => {
    const input = { name: 'desc', required: true, schema: { type: 'string' }, description: '描述信息' };
    const expected = { code: '  /**\n   * 描述信息\n   */\n  desc: string;', refs: [] };
    const result = transformTypeFieldCode(input as any);
    expect(result.code).toBe(expected.code);
    expect(result.refs).toEqual(expected.refs);
  });

  it('测试：带长度限制的字段', () => {
    const input = { name: 'code', required: true, schema: { type: 'string', minLength: 5, maxLength: 10 } };
    const expected = { code: '  /**\n   * 最小长度：5\n   * 最大长度：10\n   */\n  code: string;', refs: [] };
    const result = transformTypeFieldCode(input as any);
    expect(result.code).toBe(expected.code);
    expect(result.refs).toEqual(expected.refs);
  });
});

describe('transformQueryCode', () => {
  it('测试：简单查询参数', () => {
    const params = [
      { name: 'page', required: true, schema: { type: 'integer' } },
      { name: 'size', required: false, schema: { type: 'integer' } }
    ];
    const expected = `export default interface UserQueryParams {
  page: number;
  size?: number;
}
`;
    const result = transformQueryCode(params as any, 'UserQueryParams');
    expect(result.code).toBe(expected);
  });
});

describe('transformModelCode', () => {
  it('测试：简单模型', () => {
    const modelObj = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      },
      required: ['id']
    };
    const refKey = 'User';
    const expectedCode = `export default interface User {
  // @UNOAPI[User]
  id: number;
  name?: string;
}
`;
    const result = transformModelCode(modelObj as unknown as SchemaObject, refKey);
    expect(result.code).toBe(expectedCode);
  });

  it('测试：带描述的模型', () => {
    const modelObj = {
      type: 'object',
      title: '用户模型',
      description: '用户详细信息',
      properties: {
        id: { type: 'integer' }
      }
    };
    const refKey = 'UserDetail';
    const expectedCode = `/**
 * 用户详细信息
 */
export default interface UserDetail {
  // @UNOAPI[UserDetail]
  id?: number;
}
`;
    const result = transformModelCode(modelObj as unknown as SchemaObject, refKey);
    expect(result.code).toBe(expectedCode);
  });

  it('测试：泛型模型', () => {
    const modelObj = {
      type: 'object',
      properties: {
        code: { type: 'integer' },
        data: { $ref: '#/components/schemas/T' },
        msg: { type: 'string' }
      }
    };
    const refKey = 'Response<T>';
    const expectedCode = `export default interface Response<T> {
  // @UNOAPI[Response<T>]
  code?: number;
  data?: T;
  msg?: string;
}
`;
    const result = transformModelCode(modelObj as unknown as SchemaObject, refKey);
    expect(result.code).toBe(expectedCode);
  });
});

describe('transformApiCode', () => {
  it('测试：GET 请求', () => {
    const context = {
      url: '/api/users',
      method: 'get',
      name: 'getUsers',
      responseType: 'User[]',
      comment: '获取用户列表'
    };
    const expectedCode = `/**
 * 获取用户列表
 * @UNOAPI[get:/api/users]
 */
export function getUsers() {
  return request<User[]>({ url: '/api/users', method: 'GET' });
}`;
    const result = transformApiCode(context as any);
    expect(result).toBe(expectedCode);
  });

  it('测试：POST 请求带 Body', () => {
    const context = {
      url: '/api/users',
      method: 'post',
      name: 'createUser',
      bodyType: 'UserDTO',
      responseType: 'User'
    };
    const expectedCode = `/**
 * @UNOAPI[post:/api/users]
 */
export function createUser(data: UserDTO) {
  return request<User>({ url: '/api/users', data, method: 'POST' });
}`;
    const result = transformApiCode(context as any);
    expect(result).toBe(expectedCode);
  });

  it('测试：带路径参数', () => {
    const context = {
      url: '/api/users/{id}',
      method: 'get',
      name: 'getUserById',
      pathParams: [{ name: 'id', required: true, schema: { type: 'integer' } }],
      responseType: 'User'
    };
    const expectedCode = `/**
 * @UNOAPI[get:/api/users/{id}]
 */
export function getUserById(params: {
  id: number;
}) {
  return request<User>({ url: \`/api/users/\${params.id}\`, method: 'GET' });
}`;
    const result = transformApiCode(context as any);
    expect(result).toBe(expectedCode);
  });
});

describe('transformTypeIndexCode', () => {
  it('测试：导出类型索引', () => {
    const imports = [
      { defaultName: 'User', path: './User' },
      { defaultName: 'Post', path: './Post' }
    ];
    const expectedCode = `import User from './User';
import Post from './Post';

export {
  User,
  Post,
}
`;
    const result = transformTypeIndexCode(imports as any);
    expect(result).toBe(expectedCode);
  });
});
