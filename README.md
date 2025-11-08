# School Agent

AI coding assistant for students built with Claude Sonnet 4.5

## Features

- 🤖 Powered by Claude Sonnet 4.5
- 💬 Interactive terminal UI with streaming responses
- ⚡ **Slash Commands** - Quick commands for session control (`/clear`, `/exit`, `/help`)
- 🎯 **@Mentions** - Reference files, directories, and tools in your prompts
- 📁 **File System Tools**
  - Browse project directories
  - Read files with line numbers
  - Write and modify files
  - Search code with ripgrep
- 💻 **System Tools** (NEW in Phase 3!)
  - Execute bash commands
  - Search the web (DuckDuckGo)
- 🔧 Agentic tool calling (agent can use multiple tools per conversation)
- 🎓 **Student-Focused Tools**
  - Canvas LMS integration
  - Notion Calendar & Notes integration
  - DeepWiki for understanding open source repos
  - Todo management (coming soon)
- 📊 **Action Logging** (Always On)
  - Automatic logging to log.json for full observability
  - Track all agent actions, tool uses, and results
  - Automatic cleanup by size/age

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure API key**:
```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

3. **Run in development**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
npm start
```

## Usage

Start an interactive chat session:
```bash
school-agent chat
```

Ask a single question:
```bash
school-agent run "How do I create a React component?"
```

### Slash Commands

Control your chat session with built-in commands. Type `/` to see autocomplete suggestions:

```bash
/help    # Show available commands
/clear   # Clear conversation history
/exit    # Exit the chat (or /quit, /q)
```

**Autocomplete Navigation:**
- ↑/↓ arrows to navigate suggestions
- Tab or Enter to select (stays in input, does NOT execute)
- Esc to cancel
- Then press Enter again to execute the command

See [SLASH_COMMANDS.md](./SLASH_COMMANDS.md) for complete documentation.

### @Mentions

Reference files, directories, and tools directly in your prompts. Type `@` to see autocomplete suggestions:

```bash
# Mention a file - agent receives full file content
"Explain @src/cli/ui.tsx"

# Mention specific lines
"What does @src/cli/ui.tsx:50-100 do?"

# Mention a directory - agent receives file listing
"What's in @src/cli/"

# Mention a tool - incentivizes agent to use it
"Get my assignments @canvas"

# Multiple mentions
"Compare @file1.ts and @file2.ts using @deepwiki"
```

**Available Tools to Mention:**
- 📚 `@canvas` - Canvas LMS (courses, assignments, grades)
- 📝 `@notion` - Notion Notes
- 📅 `@notioncal` - Notion Calendar
- 📖 `@deepwiki` - GitHub repository documentation
- 🔍 `@websearch` - Web search

**Autocomplete Navigation:**
- Type `@` to see files, directories, and tools
- ↑/↓ arrows to navigate
- Tab or Enter to select (adds space, turns orange)
- Continue typing to filter results
- Esc to cancel

**Features:**
- Files are automatically read and added to context
- Directories show sorted listings with file sizes
- Tools descriptions are added to prompt the agent
- Supports line ranges for large files
- Orange highlighting for completed mentions

### Using DeepWiki

Ask the agent to help you understand any public GitHub repository:

```bash
# Get documentation structure
"Show me the documentation structure for facebook/react using DeepWiki"

# Ask specific questions
"Using DeepWiki, explain how React hooks work internally"

# Get full documentation
"Get the complete documentation for expressjs/express using DeepWiki"
```

See [DEEPWIKI_SETUP.md](./DEEPWIKI_SETUP.md) for detailed usage guide.

### Action Logging

The agent automatically logs all actions to `log.json` for full observability:

- User messages
- Assistant responses  
- Tool uses and results
- Errors and stack traces

Automatic cleanup keeps the file under 10MB and removes sessions older than 7 days.

See [ACTION_LOGGING.md](./ACTION_LOGGING.md) for complete documentation.

## Development Status

**Phase 1: ✅ Complete** - Foundation and terminal UI
**Phase 2: ✅ Complete** - File system tools (list, read, search)
**Phase 3: ✅ Complete** - System tools (bash, web search, write files)
**Phase 4: ✅ Complete** - Editing tools (search-replace, edit, diffs)
**Phase 5: ✅ Complete** - Patch system (apply & generate patches)

**What works now:**
- ✅ Interactive chat with Claude Sonnet 4.5
- ✅ List files and directories
- ✅ Read file contents
- ✅ Write and modify files
- ✅ Edit files with structured changes (line-based)
- ✅ Search and replace in files (with regex support)
- ✅ Apply unified diff patches (git-compatible)
- ✅ Generate patches from file changes
- ✅ Visual diffs with color coding
- ✅ Search code with ripgrep
- ✅ Execute bash commands
- ✅ Search the web
- ✅ Agentic tool calling (10 tools available)

**Phase 6: ✅ Complete** - Student-specific tools
- ✅ Canvas LMS integration
- ✅ Notion Calendar integration
- ✅ Notion Notes integration
- ✅ DeepWiki (GitHub repository documentation)
- ⏳ Todo management (coming soon)

## Requirements

- Node.js >= 18.0.0
- Anthropic API key

## License

MIT

