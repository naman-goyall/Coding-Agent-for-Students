import { ToolRegistry } from './registry.js';
import { listFilesTool } from './file/list-files.js';
import { readFileTool } from './file/read-file.js';
import { writeFileTool } from './file/write-file.js';
import { ripgrepTool } from './code/ripgrep.js';
import { bashTool } from './system/bash.js';
import { webSearchTool } from './system/web-search.js';

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register file tools
  registry.register(listFilesTool);
  registry.register(readFileTool);
  registry.register(writeFileTool);

  // Register code tools
  registry.register(ripgrepTool);

  // Register system tools
  registry.register(bashTool);
  registry.register(webSearchTool);

  return registry;
}

export { ToolRegistry };

