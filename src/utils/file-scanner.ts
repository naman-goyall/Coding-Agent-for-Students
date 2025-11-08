/**
 * File scanner utility for @mention autocomplete
 * Recursively scans workspace directories and respects .gitignore patterns
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, sep } from 'path';

export interface FileEntry {
  path: string;           // Relative path from workspace root
  name: string;           // File/directory name
  type: 'file' | 'directory';
  size?: number;          // File size in bytes
  modified?: Date;        // Last modified date
}

interface ScanOptions {
  maxDepth?: number;      // Maximum directory depth (default: 10)
  maxFiles?: number;      // Maximum files to return (default: 500)
  includeHidden?: boolean; // Include hidden files (default: false)
}

// Default patterns to ignore (in addition to .gitignore)
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.DS_Store',
  '*.log',
];

/**
 * Scan workspace directory for files and directories
 */
export function scanWorkspace(
  workspaceRoot: string,
  options: ScanOptions = {}
): FileEntry[] {
  const {
    maxDepth = 10,
    maxFiles = 500,
    includeHidden = false,
  } = options;

  const entries: FileEntry[] = [];
  const ignorePatterns = loadIgnorePatterns(workspaceRoot);

  function scan(dir: string, depth: number) {
    if (depth > maxDepth || entries.length >= maxFiles) {
      return;
    }

    try {
      const items = readdirSync(dir);

      for (const item of items) {
        if (entries.length >= maxFiles) {
          break;
        }

        // Skip hidden files unless explicitly included
        if (!includeHidden && item.startsWith('.')) {
          continue;
        }

        const fullPath = join(dir, item);
        const relativePath = relative(workspaceRoot, fullPath);

        // Check if path should be ignored
        if (shouldIgnore(relativePath, ignorePatterns)) {
          continue;
        }

        try {
          const stats = statSync(fullPath);
          const isDirectory = stats.isDirectory();

          entries.push({
            path: relativePath,
            name: item,
            type: isDirectory ? 'directory' : 'file',
            size: isDirectory ? undefined : stats.size,
            modified: stats.mtime,
          });

          // Recursively scan directories
          if (isDirectory) {
            scan(fullPath, depth + 1);
          }
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't read
      return;
    }
  }

  scan(workspaceRoot, 0);
  return entries;
}

/**
 * Filter file entries based on query string
 * Supports fuzzy matching on file/directory names and paths
 */
export function filterFiles(
  entries: FileEntry[],
  query: string
): FileEntry[] {
  if (!query) {
    return entries;
  }

  const lowerQuery = query.toLowerCase();
  
  return entries
    .filter(entry => {
      const lowerPath = entry.path.toLowerCase();
      const lowerName = entry.name.toLowerCase();
      
      // Exact match on name or path
      if (lowerName.includes(lowerQuery) || lowerPath.includes(lowerQuery)) {
        return true;
      }
      
      // Fuzzy match: check if query characters appear in order
      return fuzzyMatch(lowerPath, lowerQuery);
    })
    .sort((a, b) => {
      // Prioritize exact name matches
      const aNameMatch = a.name.toLowerCase().startsWith(lowerQuery);
      const bNameMatch = b.name.toLowerCase().startsWith(lowerQuery);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then prioritize directories
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      // Then sort by path length (shorter first)
      return a.path.length - b.path.length;
    });
}

/**
 * Fuzzy match: check if all characters in query appear in order in target
 */
function fuzzyMatch(target: string, query: string): boolean {
  let queryIndex = 0;
  
  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === query.length;
}

/**
 * Load .gitignore patterns from workspace
 */
function loadIgnorePatterns(workspaceRoot: string): string[] {
  const patterns = [...DEFAULT_IGNORE_PATTERNS];
  
  const gitignorePath = join(workspaceRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    try {
      const content = readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.push(trimmed);
        }
      }
    } catch (err) {
      // Ignore errors reading .gitignore
    }
  }
  
  return patterns;
}

/**
 * Check if a path should be ignored based on patterns
 */
function shouldIgnore(path: string, patterns: string[]): boolean {
  const pathParts = path.split(sep);
  
  for (const pattern of patterns) {
    // Handle exact matches
    if (pathParts.includes(pattern)) {
      return true;
    }
    
    // Handle wildcard patterns (simple implementation)
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      if (regex.test(path) || pathParts.some(part => regex.test(part))) {
        return true;
      }
    }
    
    // Handle directory patterns (ending with /)
    if (pattern.endsWith('/')) {
      const dirName = pattern.slice(0, -1);
      if (pathParts.includes(dirName)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get file entries that match a partial path
 * Used for autocomplete as user types
 */
export function getMatchingFiles(
  workspaceRoot: string,
  partialPath: string,
  limit: number = 20
): FileEntry[] {
  // Remove leading @ if present
  const cleanPath = partialPath.startsWith('@') 
    ? partialPath.slice(1) 
    : partialPath;
  
  // Scan workspace
  const allEntries = scanWorkspace(workspaceRoot, {
    maxFiles: 1000,
    includeHidden: false,
  });
  
  // Filter based on partial path
  const filtered = filterFiles(allEntries, cleanPath);
  
  // Return limited results
  return filtered.slice(0, limit);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
