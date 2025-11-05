# Student Coding CLI Agent - Detailed Implementation Plan

## Project Overview
A powerful CLI agent built with Claude Sonnet 4.5 that helps students with coding projects and schoolwork, featuring Canvas integration and comprehensive coding assistance capabilities.

---

## Technology Stack

### Core Technologies
- **Language**: TypeScript (Node.js)
- **AI Model**: Claude Sonnet 4.5 via Anthropic SDK
- **CLI Framework**: `ink` (React-based terminal UI) or `blessed` (lower-level control)
- **Package Manager**: pnpm (faster, more efficient)
- **Build Tool**: `tsup` or `tsc` with `tsx` for development

### Key Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "ink": "^4.x",           // Terminal UI
    "react": "^18.x",
    "commander": "^11.x",    // CLI argument parsing
    "chalk": "^5.x",         // Terminal colors
    "ora": "^7.x",           // Spinners
    "axios": "^1.x",         // HTTP requests
    "canvas-api": "^1.x",    // Canvas LMS integration
    "simple-git": "^3.x",    // Git operations
    "cheerio": "^1.x",       // Web scraping if needed
    "node-fetch": "^3.x",    // Fetch API
    "zod": "^3.x",           // Schema validation
    "dotenv": "^16.x"        // Environment variables
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "tsx": "^4.x",           // TypeScript execution
    "vitest": "^1.x",        // Testing
    "@types/react": "^18.x"
  }
}
```

---

## Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    CLI Interface                         │
│  (Command Parser + Terminal UI + User Input Handler)    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Agent Controller                            │
│  - Conversation Management                               │
│  - Tool Call Orchestration                               │
│  - Context Window Management                             │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│         Anthropic Claude Sonnet 4.5                      │
│         (Tool Use + Message API)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                 Tool Registry                            │
│  - File Operations (list, read, write, edit)             │
│  - Code Operations (ripgrep, apply_patch)                │
│  - System Operations (bash, web_search)                  │
│  - Student Tools (canvas, todo, deepwiki)                │
└──────────────────────────────────────────────────────────┘
```

### Directory Structure
```
school-agent/
├── src/
│   ├── index.ts                    # Entry point
│   ├── cli/
│   │   ├── commands.ts             # CLI commands
│   │   ├── ui.tsx                  # Terminal UI components
│   │   └── input-handler.ts       # User input processing
│   ├── agent/
│   │   ├── controller.ts           # Main agent logic
│   │   ├── conversation.ts         # Conversation state
│   │   ├── context-manager.ts     # Context window management
│   │   └── streaming.ts            # Stream handling
│   ├── tools/
│   │   ├── registry.ts             # Tool registry & definitions
│   │   ├── base.ts                 # Base tool interface
│   │   ├── file/
│   │   │   ├── list-files.ts
│   │   │   ├── read-file.ts
│   │   │   ├── write-file.ts
│   │   │   └── edit-file.ts
│   │   ├── code/
│   │   │   ├── ripgrep.ts
│   │   │   ├── apply-patch.ts
│   │   │   └── search-replace.ts
│   │   ├── system/
│   │   │   ├── bash.ts
│   │   │   └── web-search.ts
│   │   └── student/
│   │       ├── canvas.ts
│   │       ├── todo.ts
│   │       └── deepwiki.ts
│   ├── utils/
│   │   ├── file-utils.ts
│   │   ├── diff-utils.ts
│   │   └── logger.ts
│   ├── types/
│   │   ├── tool.ts
│   │   ├── message.ts
│   │   └── config.ts
│   └── config/
│       ├── default-config.ts
│       └── tools-config.ts
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   └── tool-specifications.md
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Phase-by-Phase Implementation Plan

## PHASE 1: Foundation & Basic Terminal UI

### 1.1 Project Setup
**Objective**: Initialize project with TypeScript, tooling, and basic structure

**Tasks**:
1. Initialize npm/pnpm project
2. Configure TypeScript (strict mode, proper paths)
3. Set up build pipeline (tsup/tsc)
4. Create basic directory structure
5. Configure environment variables (`.env` for API keys)
6. Set up Git ignore patterns

**Deliverables**:
- Working TypeScript build
- Development and production scripts
- Environment configuration

### 1.2 Basic Anthropic Integration
**Objective**: Establish connection with Claude and handle basic conversations

**Implementation**:
```typescript
// src/agent/controller.ts
class AgentController {
  private client: Anthropic;
  private conversationHistory: Message[] = [];
  
  async chat(userMessage: string): Promise<string> {
    // Add user message to history
    // Send to Claude API
    // Handle streaming response
    // Parse tool calls if present
    // Return assistant response
  }
  
  async handleToolCall(toolCall: ToolUse): Promise<ToolResult> {
    // Execute tool
    // Return result to Claude
  }
}
```

**Key Features**:
- Message streaming support
- Basic error handling
- Token counting and limits
- Conversation history management

### 1.3 Terminal UI (Basic)
**Objective**: Create interactive terminal interface

**Implementation using Ink**:
```typescript
// src/cli/ui.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export const AgentUI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="round" padding={1}>
        <Text bold color="cyan">🎓 School Agent</Text>
      </Box>
      
      {/* Conversation Area */}
      <Box flexDirection="column" marginY={1}>
        {messages.map((msg, i) => (
          <MessageDisplay key={i} message={msg} />
        ))}
      </Box>
      
      {/* Input Area */}
      {!isProcessing && (
        <Box>
          <Text color="green">→ </Text>
          <Text>{input}</Text>
        </Box>
      )}
      
      {/* Loading Indicator */}
      {isProcessing && <Spinner />}
    </Box>
  );
};
```

**Features**:
- User message input
- Assistant response display
- Loading indicators
- Basic conversation view
- Tool execution feedback (e.g., "Reading file...", "Searching web...")

### 1.4 Command Parser
**Objective**: Handle CLI arguments and commands

```typescript
// src/cli/commands.ts
import { Command } from 'commander';

export const program = new Command()
  .name('school-agent')
  .description('AI coding assistant for students')
  .version('1.0.0')
  
program
  .command('chat')
  .description('Start interactive chat session')
  .option('-d, --directory <path>', 'Working directory')
  .action(startChat);

program
  .command('run <prompt>')
  .description('Run single command')
  .action(runSingleCommand);
```

**Testing**:
- Test basic Q&A without tools
- Verify streaming works correctly
- Ensure UI updates smoothly

---

## PHASE 2: File System Tools

### 2.1 Tool Registry Architecture
**Objective**: Create extensible tool system

```typescript
// src/tools/registry.ts
export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute: (params: unknown) => Promise<ToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAnthropicTools(): ToolDefinition[] {
    // Convert to Anthropic's tool format
  }
}
```

### 2.2 List Files Tool
**Objective**: List directory contents

```typescript
// src/tools/file/list-files.ts
export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files and directories in a given path',
  inputSchema: z.object({
    path: z.string().default('.'),
    recursive: z.boolean().default(false),
    ignore_patterns: z.array(z.string()).optional()
  }),
  execute: async (params) => {
    // Use fs.readdir or glob
    // Apply ignore patterns
    // Return formatted list
  }
};
```

**Features**:
- Respect .gitignore patterns
- Show file sizes and types
- Handle permissions errors gracefully
- Support recursive listing

### 2.3 Read File Tool
**Objective**: Read file contents

```typescript
// src/tools/file/read-file.ts
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read contents of a file',
  inputSchema: z.object({
    path: z.string(),
    start_line: z.number().optional(),
    end_line: z.number().optional(),
    encoding: z.string().default('utf-8')
  }),
  execute: async (params) => {
    // Read file with fs.readFile
    // Handle line ranges if specified
    // Handle encoding
    // Add line numbers
    // Handle binary files gracefully
  }
};
```

**Features**:
- Support partial file reading (line ranges)
- Add line numbers to output
- Detect and handle binary files
- Show file metadata (size, modified date)

### 2.4 Ripgrep Tool
**Objective**: Fast code search

```typescript
// src/tools/code/ripgrep.ts
export const ripgrepTool: Tool = {
  name: 'ripgrep',
  description: 'Search for patterns in files using ripgrep',
  inputSchema: z.object({
    pattern: z.string(),
    path: z.string().default('.'),
    file_pattern: z.string().optional(),
    case_sensitive: z.boolean().default(true),
    context_lines: z.number().default(2)
  }),
  execute: async (params) => {
    // Execute ripgrep command
    // Parse output
    // Format results with file paths and line numbers
  }
};
```

**Implementation**:
- Use `execa` to run ripgrep binary
- Fallback to basic grep if ripgrep not available
- Parse and format results nicely
- Show context lines around matches

**Testing**:
- Test all three tools with various file types
- Verify pattern matching works
- Test edge cases (empty files, large files, binary files)

---

## PHASE 3: System Tools

### 3.1 Bash/Shell Execution Tool
**Objective**: Execute shell commands safely

```typescript
// src/tools/system/bash.ts
export const bashTool: Tool = {
  name: 'execute_bash',
  description: 'Execute bash commands',
  inputSchema: z.object({
    command: z.string(),
    timeout: z.number().default(30000),
    cwd: z.string().optional()
  }),
  execute: async (params) => {
    // Use execa to run command
    // Capture stdout and stderr
    // Handle timeouts
    // Return exit code and output
  }
};
```

**Safety Features**:
- Command timeout limits
- Sandbox mode option (restrict to project directory)
- Dangerous command warnings/confirmations
- Process isolation

**Security Considerations**:
- Prompt user for confirmation on destructive commands
- Log all executed commands
- Prevent shell injection
- Set working directory limits

### 3.2 Web Search Tool
**Objective**: Search the web for information

```typescript
// src/tools/system/web-search.ts
export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  inputSchema: z.object({
    query: z.string(),
    num_results: z.number().default(5)
  }),
  execute: async (params) => {
    // Use DuckDuckGo API or similar
    // Parse results
    // Optionally fetch page content
    // Return formatted results
  }
};
```

**Implementation Options**:
1. **DuckDuckGo HTML Scraping** (free, no API key)
2. **Brave Search API** (free tier available)
3. **Google Custom Search** (limited free tier)

**Features**:
- Return title, URL, and snippet
- Optional: fetch full page content
- Handle rate limiting
- Cache recent searches

### 3.3 Write File Tool
**Objective**: Create or overwrite files

```typescript
// src/tools/file/write-file.ts
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file',
  inputSchema: z.object({
    path: z.string(),
    content: z.string(),
    create_dirs: z.boolean().default(true),
    backup: z.boolean().default(true)
  }),
  execute: async (params) => {
    // Create backup if file exists
    // Create parent directories if needed
    // Write content
    // Return success/failure
  }
};
```

**Safety Features**:
- Automatic backups before overwriting
- Confirmation for overwriting existing files
- Create parent directories as needed
- Validate file paths (prevent writing outside project)

**Testing**:
- Test bash tool with various commands
- Test web search with different queries
- Test write file with new and existing files
- Verify safety features work

---

## PHASE 4: Editing Tools

### 4.1 Search and Replace Tool
**Objective**: Make targeted code changes

```typescript
// src/tools/code/search-replace.ts
export const searchReplaceTool: Tool = {
  name: 'search_replace',
  description: 'Search and replace text in a file',
  inputSchema: z.object({
    path: z.string(),
    search: z.string(),
    replace: z.string(),
    match_whole_word: z.boolean().default(false),
    case_sensitive: z.boolean().default(true)
  }),
  execute: async (params) => {
    // Read file
    // Perform search and replace
    // Create backup
    // Write file
    // Return changes made
  }
};
```

**Features**:
- Show preview of changes before applying
- Support regex patterns
- Count replacements made
- Handle multiple matches

### 4.2 Edit File Tool (Advanced)
**Objective**: Make structured edits with better precision

```typescript
// src/tools/file/edit-file.ts
export const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Make structured edits to a file',
  inputSchema: z.object({
    path: z.string(),
    edits: z.array(z.object({
      start_line: z.number(),
      end_line: z.number(),
      new_content: z.string()
    }))
  }),
  execute: async (params) => {
    // Read file
    // Apply edits (process in reverse order)
    // Create backup
    // Write file
    // Return diff
  }
};
```

**Features**:
- Support multiple edits in one operation
- Process edits in correct order to maintain line numbers
- Show before/after for each edit
- Validate line ranges

### 4.3 Diff Utilities
**Objective**: Helper functions for showing changes

```typescript
// src/utils/diff-utils.ts
export class DiffUtils {
  static createUnifiedDiff(
    original: string,
    modified: string,
    filename: string
  ): string {
    // Generate unified diff format
    // Use diff library or implement simple version
  }
  
  static parseDiff(diffText: string): ParsedDiff {
    // Parse diff into structured format
  }
  
  static colorDiff(diff: string): string {
    // Add colors for terminal display
    // Red for deletions, green for additions
  }
}
```

**Testing**:
- Test single and multiple replacements
- Test regex patterns
- Test line-based edits
- Verify diffs are accurate

---

## PHASE 5: Patch Application System

### 5.1 Apply Patch Tool
**Objective**: Apply unified diffs to files

```typescript
// src/tools/code/apply-patch.ts
export const applyPatchTool: Tool = {
  name: 'apply_patch',
  description: 'Apply a unified diff patch to file(s)',
  inputSchema: z.object({
    patch: z.string(),
    base_path: z.string().default('.'),
    reverse: z.boolean().default(false),
    dry_run: z.boolean().default(false)
  }),
  execute: async (params) => {
    // Parse patch
    // For each file in patch:
    //   - Read file
    //   - Apply hunks
    //   - Write file (if not dry run)
    // Return results
  }
};
```

**Implementation Details**:
```typescript
class PatchApplicator {
  parsePatch(patchText: string): Patch[] {
    // Parse unified diff format
    // Extract file paths, hunks, line numbers
  }
  
  applyHunk(
    fileLines: string[],
    hunk: Hunk
  ): { success: boolean; result: string[] } {
    // Find hunk location
    // Apply changes
    // Handle fuzzy matching if exact match fails
  }
  
  createBackup(filePath: string): void {
    // Create .bak file
  }
}
```

**Features**:
- Support unified diff format
- Fuzzy matching for patches that don't match exactly
- Dry run mode to preview changes
- Batch apply multiple patches
- Backup before applying

### 5.2 Generate Patch Tool
**Objective**: Create patches for changes

```typescript
// src/tools/code/generate-patch.ts
export const generatePatchTool: Tool = {
  name: 'generate_patch',
  description: 'Generate a patch from changes',
  inputSchema: z.object({
    original_file: z.string(),
    modified_file: z.string().optional(),
    context_lines: z.number().default(3)
  }),
  execute: async (params) => {
    // Read files
    // Generate unified diff
    // Return patch
  }
};
```

**Use Cases**:
- Agent can propose changes as patches
- User can review before applying
- Patches can be saved and applied later

**Testing**:
- Test applying simple patches
- Test patches with multiple files
- Test fuzzy matching
- Test dry run mode
- Test with git-generated patches

---

## PHASE 6: Student-Specific Tools

### 6.1 Todo Management Tool
**Objective**: Help students track tasks

```typescript
// src/tools/student/todo.ts
interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  course?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export const todoTool: Tool = {
  name: 'todo',
  description: 'Manage student tasks and todos',
  inputSchema: z.object({
    action: z.enum(['list', 'add', 'update', 'delete', 'complete']),
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    course: z.string().optional()
  }),
  execute: async (params) => {
    // Load todos from JSON file
    // Perform action
    // Save todos
    // Return result
  }
};
```

**Features**:
- Store todos in local JSON file
- Filter by course, priority, status
- Due date tracking and reminders
- Integration with Canvas assignments

### 6.2 Canvas LMS Integration
**Objective**: Access Canvas course information

```typescript
// src/tools/student/canvas.ts
export const canvasTool: Tool = {
  name: 'canvas',
  description: 'Interact with Canvas LMS',
  inputSchema: z.object({
    action: z.enum([
      'list_courses',
      'list_assignments',
      'get_assignment',
      'list_announcements',
      'get_grades'
    ]),
    course_id: z.string().optional(),
    assignment_id: z.string().optional()
  }),
  execute: async (params) => {
    // Use Canvas API
    // Handle authentication
    // Return formatted data
  }
};
```

**Canvas API Capabilities**:
1. **List Courses**: Get all enrolled courses
2. **List Assignments**: Get assignments for a course
3. **Get Assignment Details**: Due date, description, requirements
4. **Get Grades**: Current grades and feedback
5. **List Announcements**: Recent course announcements
6. **Get Files**: Access course files and materials

**Authentication**:
- Store Canvas API token in config
- Store Canvas domain (e.g., canvas.instructure.com)
- Guide user through token generation

**Implementation**:
```typescript
class CanvasClient {
  constructor(
    private apiToken: string,
    private domain: string
  ) {}
  
  async listCourses(): Promise<Course[]> {
    const response = await fetch(
      `https://${this.domain}/api/v1/courses`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      }
    );
    return response.json();
  }
  
  async getAssignment(
    courseId: string,
    assignmentId: string
  ): Promise<Assignment> {
    // Fetch assignment details
  }
}
```

### 6.3 DeepWiki Integration (GitHub Repos)
**Objective**: Get documentation for open-source projects

```typescript
// src/tools/student/deepwiki.ts
export const deepwikiTool: Tool = {
  name: 'deepwiki',
  description: 'Get documentation for GitHub repositories',
  inputSchema: z.object({
    repo: z.string(), // format: "owner/repo"
    query: z.string().optional()
  }),
  execute: async (params) => {
    // Fetch from GitHub API
    // Parse README and docs
    // Return relevant sections
  }
};
```

**Features**:
- Fetch README files
- Parse documentation structure
- Search within documentation
- Get example code from repo

**Implementation**:
```typescript
class GitHubDocsClient {
  async getRepoReadme(owner: string, repo: string): Promise<string> {
    // Use GitHub API to fetch README
  }
  
  async searchDocs(
    owner: string,
    repo: string,
    query: string
  ): Promise<SearchResult[]> {
    // Search code and docs
  }
  
  async getExamples(
    owner: string,
    repo: string
  ): Promise<CodeExample[]> {
    // Find example files
  }
}
```

**Testing**:
- Test todo CRUD operations
- Test Canvas API integration (with test account)
- Test deepwiki with popular repos
- Verify authentication flows

---

## PHASE 7: Advanced Features & Polish

### 7.1 Context Management
**Objective**: Efficiently manage token limits

```typescript
// src/agent/context-manager.ts
export class ContextManager {
  private maxTokens = 180000; // Leave room for response
  
  async compressHistory(
    messages: Message[]
  ): Promise<Message[]> {
    // Implement compression strategies:
    // 1. Summarize old conversations
    // 2. Remove redundant tool results
    // 3. Keep recent messages intact
    // 4. Keep important context (file contents being edited)
  }
  
  estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4);
  }
  
  prioritizeMessages(messages: Message[]): Message[] {
    // Keep system prompt
    // Keep recent messages
    // Keep context relevant to current task
  }
}
```

**Strategies**:
- Summarize old messages with Claude
- Keep recent N messages untouched
- Compress tool results (keep only recent/relevant)
- Smart context window sliding

### 7.2 Enhanced UI Features
**Objective**: Make UI more informative and user-friendly

**Features**:
1. **Syntax Highlighting**: Highlight code blocks in responses
2. **Markdown Rendering**: Render markdown nicely in terminal
3. **Progress Indicators**: Show what tool is being executed
4. **Keyboard Shortcuts**: 
   - Ctrl+C: Cancel current operation
   - Ctrl+D: Exit
   - Up/Down: Navigate history
5. **Command History**: Save and recall previous commands
6. **Multi-line Input**: Support for pasting code blocks

```typescript
// Enhanced UI with status panel
<Box flexDirection="column">
  {/* Status bar */}
  <Box borderStyle="single">
    <Text>Model: Claude Sonnet 4.5 | </Text>
    <Text>Tokens: {tokenCount}/200000 | </Text>
    <Text>Working Dir: {cwd}</Text>
  </Box>
  
  {/* Tool execution panel */}
  {activeTools.length > 0 && (
    <Box borderStyle="round" borderColor="yellow">
      <Text color="yellow">Executing: </Text>
      {activeTools.map(tool => (
        <Text key={tool}>{tool} </Text>
      ))}
    </Box>
  )}
  
  {/* Messages */}
  <ScrollableMessages messages={messages} />
  
  {/* Input */}
  <InputBox onSubmit={handleSubmit} />
</Box>
```

### 7.3 Configuration System
**Objective**: Allow user customization

```typescript
// src/types/config.ts
export interface AgentConfig {
  // API Configuration
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  
  // Canvas Configuration
  canvas?: {
    domain: string;
    apiToken: string;
  };
  
  // Tool Configuration
  tools: {
    bash: {
      enabled: boolean;
      requireConfirmation: boolean;
      allowedCommands?: string[];
      blockedCommands?: string[];
    };
    webSearch: {
      enabled: boolean;
      provider: 'duckduckgo' | 'brave' | 'google';
      apiKey?: string;
    };
  };
  
  // UI Configuration
  ui: {
    theme: 'dark' | 'light';
    showTokenCount: boolean;
    syntaxHighlighting: boolean;
  };
  
  // Working Directory
  workingDirectory: string;
}
```

**Config File Locations**:
1. Global: `~/.school-agent/config.json`
2. Project: `./.school-agent.json`
3. Environment: `.env` file

**Configuration Command**:
```bash
school-agent config set canvas.domain "myschool.instructure.com"
school-agent config set canvas.apiToken "token_here"
school-agent config get tools.bash.enabled
```

### 7.4 Logging & Debugging
**Objective**: Help debug issues

```typescript
// src/utils/logger.ts
export class Logger {
  private logFile: string;
  
  debug(message: string, metadata?: object): void {
    // Log debug info to file
  }
  
  info(message: string): void {
    // Log info
  }
  
  error(error: Error, context?: string): void {
    // Log errors with stack traces
  }
  
  logToolCall(toolName: string, params: object, result: object): void {
    // Log all tool executions
  }
  
  logAPICall(request: object, response: object): void {
    // Log API calls for debugging
  }
}
```

**Log Locations**:
- Default: `~/.school-agent/logs/`
- Rotate logs daily
- Keep last 7 days

### 7.5 Error Handling & Recovery
**Objective**: Graceful error handling

```typescript
// Error handling strategy
class ErrorHandler {
  handleToolError(error: Error, toolName: string): ToolResult {
    // Return error to Claude so it can try again
    return {
      type: 'error',
      error: error.message,
      is_error: true
    };
  }
  
  handleAPIError(error: APIError): void {
    // Handle rate limits
    // Handle network errors
    // Handle authentication errors
    if (error.status === 429) {
      // Implement exponential backoff
    }
  }
  
  handleUnexpectedError(error: Error): void {
    // Log error
    // Show user-friendly message
    // Offer recovery options
  }
}
```

**Testing**:
- Test context compression
- Test enhanced UI features
- Test configuration loading
- Test error scenarios

---

## PHASE 8: Testing & Documentation

### 8.1 Unit Tests
**Objective**: Test individual components

```typescript
// tests/unit/tools/read-file.test.ts
describe('read_file tool', () => {
  it('should read entire file', async () => {
    // Test
  });
  
  it('should read file with line range', async () => {
    // Test
  });
  
  it('should handle non-existent file', async () => {
    // Test error handling
  });
});
```

**Test Coverage Goals**:
- All tools: 80%+ coverage
- Core agent logic: 90%+ coverage
- Utils: 85%+ coverage

### 8.2 Integration Tests
**Objective**: Test end-to-end flows

```typescript
// tests/integration/agent.test.ts
describe('Agent Integration', () => {
  it('should handle file reading workflow', async () => {
    // User asks to read file
    // Agent calls list_files tool
    // Agent calls read_file tool
    // Agent responds with summary
  });
  
  it('should handle code editing workflow', async () => {
    // User asks to edit file
    // Agent reads file
    // Agent generates patch
    // Agent applies patch
  });
});
```

### 8.3 Documentation

**User Documentation**:
1. **README.md**: Quick start guide
2. **INSTALLATION.md**: Detailed installation
3. **CONFIGURATION.md**: Config options
4. **CANVAS_SETUP.md**: Canvas integration setup
5. **TOOLS.md**: Complete tool reference
6. **EXAMPLES.md**: Common use cases

**Developer Documentation**:
1. **ARCHITECTURE.md**: System design
2. **CONTRIBUTING.md**: Contribution guidelines
3. **TOOL_DEVELOPMENT.md**: How to add new tools
4. **API.md**: Internal API reference

**README.md Structure**:
```markdown
# School Agent

AI coding assistant for students built with Claude Sonnet 4.5

## Features
- 📁 File operations
- 🔍 Code search
- ✏️ Smart editing
- 🌐 Web search
- 📚 Canvas LMS integration
- ✅ Todo management

## Quick Start
...

## Usage Examples
...

## Configuration
...
```

---

## Security Considerations

### 1. API Key Management
- Never hardcode API keys
- Use environment variables
- Provide clear setup instructions
- Validate keys before use

### 2. File System Safety
- Restrict operations to project directory by default
- Warn on operations outside project
- Validate file paths (prevent path traversal)
- Automatic backups before destructive operations

### 3. Command Execution Safety
- Warn on dangerous commands (rm -rf, etc.)
- Require user confirmation for destructive operations
- Timeout limits on commands
- Sandbox option to restrict commands

### 4. Canvas API Security
- Store tokens securely
- Use HTTPS only
- Don't log sensitive information
- Respect API rate limits

---

## Performance Optimizations

### 1. Caching
- Cache file contents for recently read files
- Cache web search results
- Cache Canvas API responses (with TTL)

### 2. Streaming
- Stream Claude responses for better UX
- Show tool execution in real-time
- Progressive rendering of long responses

### 3. Concurrency
- Execute independent tools in parallel
- Batch similar operations
- Async I/O for all file operations

### 4. Token Efficiency
- Compress old conversation history
- Remove redundant tool results
- Use shorter system prompts
- Implement smart context windowing

---

## User Experience Enhancements

### 1. First-Time Setup Wizard
```bash
school-agent init
# Prompts for:
# - Anthropic API key
# - Working directory preference
# - Canvas domain and token (optional)
# - Tool preferences
```

### 2. Help System
```bash
school-agent help              # General help
school-agent help canvas       # Canvas tool help
school-agent tools             # List all tools
school-agent examples          # Show examples
```

### 3. Conversation Management
```bash
school-agent chat              # Start new chat
school-agent resume            # Resume last chat
school-agent history           # Show chat history
school-agent clear             # Clear history
```

### 4. Quick Commands
```bash
school-agent ask "How do I use React hooks?"
school-agent read src/main.ts
school-agent search "TODO"
school-agent canvas assignments
```

---

## Roadmap & Future Enhancements

### Short Term (Post-MVP)
- [ ] Git integration (commit, diff, branch)
- [ ] Code formatting tools (prettier, eslint)
- [ ] Project templates (create new projects)
- [ ] Multi-file refactoring
- [ ] Code review mode

### Medium Term
- [ ] Jupyter notebook support
- [ ] Database query tools
- [ ] API testing tools
- [ ] Documentation generation
- [ ] Code quality metrics

### Long Term
- [ ] Multi-agent collaboration
- [ ] Visual workflow builder
- [ ] Browser automation for Canvas
- [ ] Assignment auto-submission
- [ ] Peer code review integration
- [ ] Learning analytics dashboard

---

## Success Metrics

### Technical Metrics
- Response time < 2s for simple queries
- Tool execution success rate > 95%
- Zero data loss (backups work)
- Uptime > 99% (no crashes)

### User Experience Metrics
- Time to first response < 1s
- User satisfaction with responses
- Task completion rate
- Feature usage statistics

### Code Quality Metrics
- Test coverage > 80%
- No critical security issues
- Documentation completeness
- Code maintainability score

---

## Development Timeline Estimate

### Phase 1-2: Foundation & File Tools (1-2 weeks)
- Project setup: 2 days
- Basic agent + UI: 3 days
- File tools: 3-4 days
- Testing: 2 days

### Phase 3: System Tools (1 week)
- Bash execution: 2 days
- Web search: 2 days
- Write file: 1 day
- Testing: 2 days

### Phase 4-5: Editing & Patches (1.5 weeks)
- Search & replace: 2 days
- Edit file: 2 days
- Patch system: 3 days
- Testing: 3 days

### Phase 6: Student Tools (1.5 weeks)
- Todo system: 2 days
- Canvas integration: 4 days
- DeepWiki: 2 days
- Testing: 2 days

### Phase 7-8: Polish & Testing (1 week)
- Context management: 2 days
- Enhanced UI: 2 days
- Documentation: 2 days
- Final testing: 1 day

**Total Estimated Time**: 6-7 weeks for full implementation

---

## Getting Started (Development)

### Initial Setup
```bash
# Clone repo
git clone <repo-url>
cd school-agent

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Add API key to .env
echo "ANTHROPIC_API_KEY=your_key_here" >> .env

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run built version
pnpm start
```

### Development Workflow
1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. Run tests: `pnpm test`
5. Check types: `pnpm typecheck`
6. Format code: `pnpm format`
7. Create PR

---

## Conclusion

This plan provides a comprehensive roadmap for building a powerful, student-focused CLI coding agent. The phased approach allows for:

1. **Incremental Development**: Each phase builds on the previous
2. **Early Testing**: Test each phase before moving on
3. **User Feedback**: Can release early phases for feedback
4. **Flexibility**: Easy to adjust priorities based on needs

The combination of Claude Sonnet 4.5's intelligence with carefully designed tools will create a powerful assistant that truly helps students with their coding projects and coursework.

Key Success Factors:
- ✅ Clean, modular architecture
- ✅ Comprehensive tool set
- ✅ Student-specific features (Canvas, todo)
- ✅ Excellent error handling
- ✅ User-friendly terminal UI
- ✅ Strong security measures
- ✅ Thorough testing
- ✅ Good documentation

The agent will be a valuable tool for students, helping them learn, code more efficiently, and stay organized with their coursework.

