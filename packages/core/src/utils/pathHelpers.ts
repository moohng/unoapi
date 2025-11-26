import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 解析绝对路径
 */
export function resolveAbsolutePath(basePath: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.join(basePath, relativePath);
}

/**
 * 确保目录存在
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
