import { describe, it, expect } from 'vitest';
import { transformTypeFieldCode, transformQueryCode, transformModelCode, transformApiCode, transformTypeIndexCode } from '../src/transform';
import { SchemaObject } from 'openapi3-ts/oas30';

describe('transformTypeFieldCode', () => {
  const testCases = [
    {
      name: '基本类型对象',
      input: { name: 'age', required: true, schema: { type: 'integer' } },
      expected: { code: '  age: number;', refs: [] }
    },
    {
      name: '可选字段',
      input: { name: 'email', required: false, schema: { type: 'string' } },
      expected: { code: '  email?: string;', refs: [] }
    },
    {
      name: '带描述的字段',
      input: { name: 'desc', required: true, schema: { type: 'string' }, description: '描述信息' },
      expected: { code: '  /**\n   * 描述信息 \n   */\n  desc: string;', refs: [] }
    },
    {
      name: '带长度限制的字段',
      input: { name: 'code', required: true, schema: { type: 'string', minLength: 5, maxLength: 10 } },
      expected: { code: '  /**\n   * 最小长度：5  最大长度：10 \n   */\n  code: string;', refs: [] }
    }
  ];

  for (const { name, input, expected } of testCases) {
    it(`测试：${name}`, () => {
      const result = transformTypeFieldCode(input as any);
      expect(result.code).toBe(expected.code);
      expect(result.refs).toEqual(expected.refs);
    });
  }
});

describe('transformQueryCode', () => {
  const testCases = [
    {
      name: '简单查询参数',
      params: [
        { name: 'page', required: true, schema: { type: 'integer' } },
        { name: 'size', required: false, schema: { type: 'integer' } }
      ],
      // name: 'UserQueryParams',
      expectedCode: `export default interface UserQueryParams {
  page: number;
  size?: number;
}
`
    }
  ];

  for (const { name, params, expectedCode: expected } of testCases) {
    it(`测试：${name}`, () => {
      const result = transformQueryCode(params as any, 'UserQueryParams');
      expect(result.code).toBe(expected);
    });
  }
});

describe('transformModelCode', () => {
  const testCases = [
    {
      name: '简单模型',
      modelObj: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        },
        required: ['id']
      },
      refKey: 'User',
      expectedCode: `export default interface User {
  // @UNOAPI[User]
  id: number;
  name?: string;
}
`
    },
    {
      name: '带描述的模型',
      modelObj: {
        type: 'object',
        title: '用户模型',
        description: '用户详细信息',
        properties: {
          id: { type: 'integer' }
        }
      },
      refKey: 'UserDetail',
      expectedCode: `/**
 * 用户详细信息
 */
export default interface UserDetail {
  // @UNOAPI[UserDetail]
  id?: number;
}
`
    },
    {
      name: '泛型模型',
      modelObj: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          data: { $ref: '#/components/schemas/T' },
          msg: { type: 'string' }
        }
      },
      refKey: 'Response<T>',
      expectedCode: `export default interface Response<T> {
  // @UNOAPI[Response<T>]
  code?: number;
  data?: T;
  msg?: string;
}
`
    }
  ];

  for (const { name, modelObj, refKey, expectedCode } of testCases) {
    it(`测试：${name}`, () => {
      const result = transformModelCode(modelObj as unknown as SchemaObject, refKey);
      expect(result.code).toBe(expectedCode);
    });
  }
});

describe('transformApiCode', () => {
  const testCases = [
    {
      name: 'GET 请求',
      context: {
        url: '/api/users',
        method: 'get',
        name: 'getUsers',
        responseType: 'User[]',
        comment: '获取用户列表'
      },
      expectedCode: `/**
 * 获取用户列表
 * @UNOAPI[get:/api/users]
 */
export function getUsers() {
  return request<User[]>({ url: '/api/users', method: 'GET' });
}`
    },
    {
      name: 'POST 请求带 Body',
      context: {
        url: '/api/users',
        method: 'post',
        name: 'createUser',
        bodyType: 'UserDTO',
        responseType: 'User'
      },
      expectedCode: `/**
 * @UNOAPI[post:/api/users]
 */
export function createUser(data: UserDTO) {
  return request<User>({ url: '/api/users', data, method: 'POST' });
}`
    },
    {
      name: '带路径参数',
      context: {
        url: '/api/users/{id}',
        method: 'get',
        name: 'getUserById',
        pathParams: [{ name: 'id', required: true, schema: { type: 'integer' } }],
        responseType: 'User'
      },
      expectedCode: `/**
 * @UNOAPI[get:/api/users/{id}]
 */
export function getUserById(params: { id: number; }) {
  return request<User>({ url: \`/api/users/\${params.id}\`, method: 'GET' });
}`
    }
  ];

  for (const { name, context, expectedCode } of testCases) {
    it(`测试：${name}`, () => {
      const result = transformApiCode(context as any);
      expect(result).toBe(expectedCode);
    });
  }
});

describe('transformTypeIndexCode', () => {
  const testCases = [
    {
      name: '导出类型索引',
      imports: [
        { defaultName: 'User', path: './User' },
        { defaultName: 'Post', path: './Post' }
      ],
      expectedCode: `import User from './User';
import Post from './Post';

export {
  User,
  Post,
}
`
    }
  ];

  for (const { name, imports, expectedCode } of testCases) {
    it(`测试：${name}`, () => {
      const result = transformTypeIndexCode(imports as any);
      expect(result).toBe(expectedCode);
    });
  }
});
