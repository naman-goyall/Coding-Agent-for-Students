import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export class FileUtils {
  /**
   * List files in a directory
   */
  static async listFiles(
    directory: string,
    options: {
      recursive?: boolean;
      ignorePatterns?: string[];
    } = {}
  ): Promise<FileInfo[]> {
    const { recursive = false, ignorePatterns = [] } = options;
    const results: FileInfo[] = [];

    if (!existsSync(directory)) {
      throw new Error(`Directory not found: ${directory}`);
    }

    const entries = await readdir(directory);

    for (const entry of entries) {
      // Check ignore patterns
      if (this.shouldIgnore(entry, ignorePatterns)) {
        continue;
      }

      const fullPath = join(directory, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        results.push({
          name: entry,
          path: fullPath,
          type: 'directory',
        });

        if (recursive) {
          const subFiles = await this.listFiles(fullPath, options);
          results.push(...subFiles);
        }
      } else {
        results.push({
          name: entry,
          path: fullPath,
          type: 'file',
          size: stats.size,
        });
      }
    }

    return results;
  }

  /**
   * Read file with optional line range
   */
  static async readFileWithLines(
    filePath: string,
    options: {
      startLine?: number;
      endLine?: number;
      addLineNumbers?: boolean;
    } = {}
  ): Promise<string> {
    const { startLine, endLine, addLineNumbers = true } = options;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      throw new Error(`Path is a directory: ${filePath}`);
    }

    // Check if file is binary
    if (await this.isBinaryFile(filePath)) {
      return `[Binary file: ${filePath}]`;
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Apply line range
    const start = startLine ? Math.max(0, startLine - 1) : 0;
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;
    const selectedLines = lines.slice(start, end);

    // Add line numbers if requested
    if (addLineNumbers) {
      const startLineNum = start + 1;
      return selectedLines
        .map((line, idx) => {
          const lineNum = (startLineNum + idx).toString().padStart(6, ' ');
          return `${lineNum}|${line}`;
        })
        .join('\n');
    }

    return selectedLines.join('\n');
  }

  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if a file should be ignored based on patterns
   */
  private static shouldIgnore(filename: string, patterns: string[]): boolean {
    // Default ignore patterns
    const defaultIgnores = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.DS_Store',
      '.env',
      '*.log',
    ];

    const allPatterns = [...defaultIgnores, ...patterns];

    return allPatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(filename);
      }
      return filename === pattern || filename.startsWith(pattern);
    });
  }

  /**
   * Check if file is binary
   */
  private static async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await readFile(filePath);
      const chunk = buffer.slice(0, 512);

      // Check for null bytes (common in binary files)
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}

