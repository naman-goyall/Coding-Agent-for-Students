# @Mention Implementation Plan

## Overview
Implement @mention functionality to allow users to reference files, directories, and tools in their prompts. When a user types `@`, they'll see autocomplete suggestions for:
- Files in the workspace
- Directories in the workspace
- Student tools (Canvas, Google Calendar, Google Docs, DeepWiki, Web Search)

The mentioned items will be automatically added to the agent's context.

---

## Research Summary

### Gemini CLI Implementation
- **Detection**: `parseAllAtCommands` function finds unescaped `@` symbols and parses paths
- **Autocomplete**: `useAtCompletion` hook performs recursive file/directory search
- **Context Addition**: Uses `read_many_files` tool to read file contents and appends to LLM context
- **Filtering**: Respects `.gitignore` and `.geminiignore` rules
- **Path Resolution**: Supports glob patterns if direct path not found

### OpenCode Implementation
- **Autocomplete**: Completion dialog shows files, symbols, and agents when `@` is typed
- **File Provider**: `filesContextGroup` fetches file status and provides suggestions
- **Context Addition**: Files are added as `FilePart` with `file://` URLs and line ranges
- **Directory Handling**: Uses `ListTool` for directory listings
- **File Reading**: Uses `ReadTool` to read file contents
- **Line Selection**: Supports `@file.ts:10-20` syntax for specific line ranges

---

## Implementation Phases

### Phase 1: Core @Mention Detection and Parsing ✅ PLAN
**Goal**: Detect when user types `@` and parse the mention

**Files to Create/Modify**:
- `src/cli/at-mention-parser.ts` (NEW)
- `src/cli/ui.tsx` (MODIFY)

**Tasks**:
1. Create parser to detect `@` in input
2. Parse different mention types:
   - `@filename.ts` - file mention
   - `@directory/` - directory mention (trailing slash)
   - `@filename.ts:10-20` - file with line range
   - `@canvas` - tool mention
3. Handle escaped `@` symbols (`\@`)
4. Extract mention text for autocomplete filtering

**Implementation Details**:
```typescript
interface AtMention {
  type: 'file' | 'directory' | 'tool';
  path?: string;
  toolName?: string;
  lineRange?: { start: number; end: number };
  startIndex: number;
  endIndex: number;
  raw: string;
}

function parseAtMentions(input: string): AtMention[]
function getCurrentAtMention(input: string, cursorPos: number): string | null
```

---

### Phase 2: File/Directory Autocomplete ✅ PLAN
**Goal**: Show file and directory suggestions when user types `@`

**Files to Create/Modify**:
- `src/cli/at-mention-suggestions.tsx` (NEW)
- `src/cli/ui.tsx` (MODIFY)
- `src/utils/file-scanner.ts` (NEW)

**Tasks**:
1. Create file scanner utility:
   - Recursively scan workspace directories
   - Respect `.gitignore` patterns
   - Cache results for performance
   - Watch for file system changes
2. Create suggestion component:
   - Display files with icons/indicators
   - Show relative paths from workspace root
   - Highlight directories with trailing `/`
   - Support fuzzy matching
3. Integrate with UI:
   - Detect `@` in input
   - Show suggestions below input (like slash commands)
   - Filter as user types
   - Navigate with arrow keys
   - Select with Tab/Enter

**Suggestion Display Format** (inspired by Gemini CLI):
```
@
 src/cli/ui.tsx                    Modified 2 hours ago
 src/agent/controller.ts           Modified 1 day ago
 src/tools/                        Directory
 README.md                         Modified 3 days ago
```

---

### Phase 3: Tool Mention Autocomplete ✅ PLAN
**Goal**: Allow mentioning student tools like `@canvas`, `@notion`, etc.

**Files to Create/Modify**:
- `src/cli/at-mention-suggestions.tsx` (MODIFY)
- `src/cli/tool-mentions.ts` (NEW)

**Tasks**:
1. Define available tools for mention:
   ```typescript
   const MENTIONABLE_TOOLS = [
     { name: 'canvas', description: 'Canvas LMS integration', icon: '📚' },
     { name: 'notion', description: 'Notion Notes', icon: '📝' },
     { name: 'notioncal', description: 'Notion Calendar', icon: '📅' },
     { name: 'deepwiki', description: 'GitHub repo documentation', icon: '📖' },
     { name: 'websearch', description: 'Web search', icon: '🔍' },
   ];
   ```
2. Show tools in autocomplete when `@` is typed
3. Filter tools based on user input
4. Visual distinction between files and tools

**Combined Suggestion Display**:
```
@can
 📚 canvas                         Canvas LMS integration
 src/tools/student/canvas.ts      File
```

---

### Phase 4: Context Injection - File Content ✅ PLAN
**Goal**: Read mentioned files and add their content to agent context

**Files to Create/Modify**:
- `src/agent/context-builder.ts` (NEW)
- `src/agent/controller.ts` (MODIFY)
- `src/types/message.ts` (MODIFY)

**Tasks**:
1. Create context builder utility:
   - Read file contents
   - Handle line ranges (`@file.ts:10-20`)
   - Format file content for LLM
   - Handle binary files gracefully
2. Modify message type to support file attachments:
   ```typescript
   interface Message {
     role: 'user' | 'assistant' | 'system';
     content: string;
     attachments?: FileAttachment[];
   }
   
   interface FileAttachment {
     type: 'file' | 'directory';
     path: string;
     content: string;
     lineRange?: { start: number; end: number };
   }
   ```
3. Process @mentions before sending to agent:
   - Parse mentions from user message
   - Read file contents
   - Inject into message context
4. Format for Claude:
   ```
   User message: "Explain this code @src/cli/ui.tsx:50-100"
   
   Context sent to Claude:
   ---
   File: src/cli/ui.tsx (lines 50-100)
   ```typescript
   [file content here]
   ```
   ---
   
   User question: Explain this code
   ```

---

### Phase 5: Context Injection - Directory Listings ✅ PLAN
**Goal**: List directory contents when directory is mentioned

**Files to Create/Modify**:
- `src/agent/context-builder.ts` (MODIFY)
- `src/tools/file/list-files.ts` (USE EXISTING)

**Tasks**:
1. Detect directory mentions (trailing `/` or is directory)
2. Use existing `list_files` tool to get directory contents
3. Format directory listing for context:
   ```
   Directory: src/tools/
   - file/
     - list-files.ts
     - read-file.ts
     - write-file.ts
   - student/
     - canvas.ts
     - notion-calendar.ts
   ```
4. Limit depth and size to avoid context overflow

---

### Phase 6: Context Injection - Tool Mentions ✅ PLAN
**Goal**: Add tool descriptions and capabilities to context when mentioned

**Files to Create/Modify**:
- `src/agent/context-builder.ts` (MODIFY)
- `src/tools/tool-descriptions.ts` (NEW)

**Tasks**:
1. Create tool descriptions:
   ```typescript
   const TOOL_DESCRIPTIONS = {
     canvas: {
       name: 'Canvas LMS',
       capabilities: [
         'List courses',
         'Get assignments',
         'View grades',
         'Check announcements'
       ],
       usage: 'Use this tool to interact with Canvas LMS...'
     },
     // ... other tools
   };
   ```
2. When tool is mentioned, inject description into context
3. Tell agent which tools are available
4. Format for Claude:
   ```
   Tool Available: Canvas LMS (@canvas)
   Capabilities:
   - List courses
   - Get assignments
   - View grades
   
   You can use the canvas_* tools to help the user with Canvas-related tasks.
   ```

---

### Phase 7: UI/UX Polish ✅ PLAN
**Goal**: Make @mentions feel natural and intuitive

**Files to Create/Modify**:
- `src/cli/ui.tsx` (MODIFY)
- `src/cli/at-mention-suggestions.tsx` (MODIFY)

**Tasks**:
1. Visual indicators for mentioned items: ✅ COMPLETED
   - ✅ Show mentioned files in user message with magenta color (like Gemini CLI)
   - ✅ Display file icon/emoji before file name (in autocomplete)
   - ✅ Show tool icon before tool name (in autocomplete)
2. Inline preview:
   - Show first few lines of file content in suggestion
   - Show file size and last modified date
3. Error handling:
   - File not found
   - Permission denied
   - File too large
4. Performance optimization:
   - Debounce file scanning
   - Cache file contents
   - Limit suggestion count
5. Keyboard shortcuts:
   - `@` to trigger mentions
   - Arrow keys to navigate
   - Tab/Enter to select
   - Esc to cancel
   - Backspace to remove mention

---

### Phase 8: Advanced Features ✅ PLAN
**Goal**: Add advanced @mention capabilities

**Files to Create/Modify**:
- `src/cli/at-mention-parser.ts` (MODIFY)
- `src/agent/context-builder.ts` (MODIFY)

**Tasks**:
1. **Glob patterns**: `@src/**/*.ts` to mention multiple files
2. **Exclude patterns**: `@src/ -node_modules/` to exclude directories
3. **Recent files**: Show recently edited files at top
4. **Git integration**: Show git status (modified, staged, etc.)
5. **Smart context**: Automatically include related files (imports, etc.)
6. **Context limits**: Warn when context is getting too large
7. **Multiple mentions**: Support multiple `@` in one message

---

## Implementation Order

### Sprint 1: Foundation (Phases 1-2)
1. ✅ Create at-mention parser
2. ✅ Create file scanner utility
3. ✅ Build suggestion component
4. ✅ Integrate with UI for basic file autocomplete

**Deliverable**: User can type `@` and see file suggestions, select with Tab/Enter

---

### Sprint 2: Tool Mentions (Phase 3)
1. ✅ Define mentionable tools
2. ✅ Add tools to autocomplete
3. ✅ Visual distinction between files and tools

**Deliverable**: User can mention both files and tools with autocomplete

---

### Sprint 3: Context Injection (Phases 4-6)
1. ✅ Create context builder
2. ✅ Read file contents and inject into context
3. ✅ Handle directory listings
4. ✅ Add tool descriptions to context
5. ✅ Modify agent to use enhanced context

**Deliverable**: Agent receives file contents and tool info when mentioned

---

### Sprint 4: Polish & Advanced (Phases 7-8)
1. ✅ UI/UX improvements
2. ✅ Error handling
3. ✅ Performance optimization
4. ✅ Advanced features (glob, git, etc.)

**Deliverable**: Production-ready @mention system

---

## Technical Architecture

```
User Input: "Explain @src/cli/ui.tsx"
     ↓
[at-mention-parser.ts]
  - Detects @mention
  - Parses path: "src/cli/ui.tsx"
     ↓
[at-mention-suggestions.tsx]
  - Shows autocomplete (if incomplete)
  - User selects file
     ↓
[context-builder.ts]
  - Reads file content
  - Formats for LLM
     ↓
[controller.ts]
  - Injects file content into message
  - Sends to Claude with context
     ↓
Claude receives:
  "File: src/cli/ui.tsx
   ```typescript
   [file content]
   ```
   
   User: Explain this file"
```

---

## File Structure

```
src/
├── cli/
│   ├── at-mention-parser.ts          # Parse @mentions from input
│   ├── at-mention-suggestions.tsx    # Autocomplete component
│   ├── tool-mentions.ts              # Tool definitions
│   └── ui.tsx                        # Main UI (integrate @mentions)
├── agent/
│   ├── context-builder.ts            # Build context from mentions
│   └── controller.ts                 # Agent controller (use context)
├── utils/
│   └── file-scanner.ts               # Scan workspace for files
└── types/
    └── message.ts                    # Message types with attachments
```

---

## Testing Strategy

### Unit Tests
- `at-mention-parser.test.ts`: Test parsing logic
- `file-scanner.test.ts`: Test file scanning and filtering
- `context-builder.test.ts`: Test context building

### Integration Tests
- Test autocomplete with real file system
- Test context injection with agent
- Test tool mentions

### Manual Testing Scenarios
1. Type `@` and verify suggestions appear
2. Type `@src/` and verify directory filtering
3. Select file and verify it's added to message
4. Send message and verify agent receives file content
5. Mention tool and verify description is added
6. Test with multiple mentions in one message
7. Test with non-existent files
8. Test with large files
9. Test with binary files

---

## Success Metrics

- ✅ User can autocomplete files with `@`
- ✅ User can autocomplete tools with `@`
- ✅ Agent receives file contents in context
- ✅ Agent receives tool descriptions in context
- ✅ Autocomplete is fast (<100ms)
- ✅ File scanning respects .gitignore
- ✅ UI is intuitive and responsive
- ✅ Error messages are clear and helpful

---

## Future Enhancements

1. **Symbol mentions**: `@file.ts#functionName` to mention specific functions
2. **Line highlighting**: Show specific lines in file preview
3. **Diff mentions**: `@file.ts (changes)` to show git diff
4. **URL mentions**: `@https://...` to fetch web content
5. **Clipboard mentions**: `@clipboard` to include clipboard content
6. **Screenshot mentions**: `@screenshot` to include terminal screenshot
7. **Memory mentions**: `@memory:topic` to include saved context
8. **Command output**: `@$(ls -la)` to include command output

---

## Notes

- Inspired by Gemini CLI and OpenCode implementations
- Focus on student use cases (Canvas, Notion, etc.)
- Keep UI consistent with slash commands
- Prioritize performance and UX
- Start simple, iterate based on feedback
