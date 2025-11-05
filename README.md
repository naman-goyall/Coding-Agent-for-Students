# School Agent

AI coding assistant for students built with Claude Sonnet 4.5

## Features

- 🤖 Powered by Claude Sonnet 4.5
- 💬 Interactive terminal UI with streaming responses
- 📁 **File System Tools**
  - Browse project directories
  - Read files with line numbers
  - Write and modify files
  - Search code with ripgrep
- 💻 **System Tools** (NEW in Phase 3!)
  - Execute bash commands
  - Search the web (DuckDuckGo)
- 🔧 Agentic tool calling (agent can use multiple tools per conversation)
- 🎓 Student-focused features
- 📚 Coming soon: Code editing, patches, Canvas integration, todo management

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

## Development Status

**Phase 1: ✅ Complete** - Foundation and terminal UI
**Phase 2: ✅ Complete** - File system tools (list, read, search)
**Phase 3: ✅ Complete** - System tools (bash, web search, write files)

**What works now:**
- ✅ Interactive chat with Claude Sonnet 4.5
- ✅ List files and directories
- ✅ Read file contents
- ✅ Write and modify files
- ✅ Search code with ripgrep
- ✅ Execute bash commands
- ✅ Search the web
- ✅ Agentic tool calling (6 tools available)

**Coming soon (Phase 4+):**
- Code editing (search & replace)
- Patch system (apply diffs)
- Canvas LMS integration
- Todo management
- GitHub documentation (DeepWiki)

## Requirements

- Node.js >= 18.0.0
- Anthropic API key

## License

MIT

