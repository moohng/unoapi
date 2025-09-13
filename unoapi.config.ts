import { defineUnoAPIConfig } from '@unoapi/core';

export default defineUnoAPIConfig({
  openapiUrl: 'https://api.example.com/openapi.json', // 支持返回 Promise 的回调函数
  output: 'src/api', // 如需单独指定模型输出目录：['src/api', 'src/models'],
  // typeMapping: [['DateTime', 'string'], [...]], // 自定义类型映射优先

  // funcTpl: (context) => { // 自定义 API 函数
  //   // 返回自定义 API 函数的字符串
  //   return `export function...`;
  // },
});
