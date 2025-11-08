import { ToolRegistry } from './registry.js';
import { listFilesTool } from './file/list-files.js';
import { readFileTool } from './file/read-file.js';
import { writeFileTool } from './file/write-file.js';
import { editFileTool } from './file/edit-file.js';
import { ripgrepTool } from './code/ripgrep.js';
import { searchReplaceTool } from './code/search-replace.js';
import { applyPatchTool } from './code/apply-patch.js';
import { generatePatchTool } from './code/generate-patch.js';
import { bashTool } from './system/bash.js';
import { webSearchTool } from './system/web-search.js';
import { canvasTool } from './student/canvas.js';
import { deepwikiTool } from './student/deepwiki.js';
import { googleCalendarTool } from './student/google-calendar.js';
import { googleDocsTool } from './student/google-docs.js';

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register file tools
  registry.register(listFilesTool);
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(editFileTool);

  // Register code tools
  registry.register(ripgrepTool);
  registry.register(searchReplaceTool);
  registry.register(applyPatchTool);
  registry.register(generatePatchTool);

  // Register system tools
  registry.register(bashTool);
  registry.register(webSearchTool);

  // Register student tools
  registry.register(canvasTool);
  registry.register(deepwikiTool);
  registry.register(googleCalendarTool);
  registry.register(googleDocsTool);

  return registry;
}

export { ToolRegistry };
