# Sparky 🎓

**Your AI-powered coding assistant for students**

Built with Claude Sonnet 4.5 | Available globally via npm

Run `sparky` from any directory to get instant coding help, manage assignments, and boost your productivity!

## Quick Start

```bash
# 1. Install globally
npm install -g sparky-agent

# 2. Run setup wizard
sparky setup

# 3. Start chatting!
sparky
```

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Student Tools](#student-tools)
- [Development Status](#development-status)
- [Local Development](#local-development)

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
  - Canvas LMS integration (with automatic PDF reading!)
  - Google Workspace (Calendar, Gmail, Docs, Drive)
  - DeepWiki for understanding GitHub repos
  - Automatic OAuth authentication with token refresh
- 📊 **Action Logging** (Always On)
  - Automatic logging to log.json for full observability
  - Track all agent actions, tool uses, and results
  - Automatic cleanup by size/age

## Installation

### Global Installation (Recommended)

Install Sparky globally to use it from any directory:

```bash
npm install -g sparky-agent
```

Or use it without installing:

```bash
npx sparky-agent
```

### One-Time Setup

Run the interactive setup wizard:

```bash
sparky setup
```

The wizard will guide you through:
1. **Anthropic API Key** (required) - Get from https://console.anthropic.com
2. **Canvas LMS Integration** (optional) - Your school's Canvas domain and access token
3. **Google Workspace** (optional) - Google Calendar, Gmail, Docs integration

All credentials are stored securely in `~/.sparky/` with restricted permissions.

### Usage

Start the interactive chat:

```bash
sparky
```

That's it! Sparky works from any directory once configured.

---

## Local Development

For contributors and local development:

1. **Clone and install**:
```bash
git clone https://github.com/naman-goyall/Coding-Agent-for-Students
cd Coding-Agent-for-Students
npm install
```

2. **Configure with .env**:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Run in development**:
```bash
npm run dev
```

4. **Build and test locally**:
```bash
npm run build
npm link
sparky
```

## Usage Examples

Start an interactive chat session:
```bash
sparky
# or
sparky chat
```

Ask a single question:
```bash
sparky run "How do I create a React component?"
```

Get help:
```bash
sparky help-topics
sparky --help
```

Reset configuration:
```bash
sparky setup --reset
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

Commands are case-insensitive and support aliases.

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
- 📖 `@deepwiki` - GitHub repository documentation
- 🔍 `@websearch` - Web search
- 📅 `@googlecal` - Google Calendar (schedule, events)
- 📝 `@googledocs` - Google Docs (documents, notes)
- 📧 `@gmail` - Gmail (email management)
- 📁 `@googledrive` - Google Drive (files, PDFs)

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

## Student Tools

### Canvas LMS

Access your Canvas courses, assignments, and grades directly from Sparky:

```bash
# Get upcoming assignments
"What assignments do I have due this week?"

# Check grades
"Show me my current grades"

# Get assignment details (with automatic PDF reading!)
"Get details for my Computer Science homework"
```

**Automatic PDF Reading**: Assignment descriptions with PDF attachments are automatically downloaded and read, so the agent can help you understand the requirements.

### Google Workspace Integration

Sparky integrates with Google Calendar, Gmail, Docs, and Drive using OAuth authentication (one-time setup):

#### Google Calendar
```bash
# View your schedule
"What do I have on my calendar today?"

# Create events
"Add a study session for CS exam on Friday at 3pm"

# Check availability
"When am I free this week?"
```

#### Gmail
```bash
# Search emails
"Find emails from my professor about the project"

# Read specific emails
"Show me the latest email from career services"

# Send emails (with attachments)
"Send an email to ta@school.edu with my assignment attached"
```

#### Google Docs
```bash
# Create documents
"Create a Google Doc called 'Research Notes'"

# Add content
"Add my React component explanation to my notes doc"

# Read documents
"Show me what's in my Interview Prep document"
```

#### Google Drive
```bash
# Search files
"Find my resume PDF in Google Drive"

# Read PDFs
"Read the lecture slides from yesterday"

# List files
"What files do I have in my Homework folder?"
```

### DeepWiki

Understand any public GitHub repository with AI-powered documentation:

```bash
# Get documentation structure
"Show me the documentation structure for facebook/react"

# Ask specific questions
"How does React's reconciliation algorithm work?"

# Learn about dependencies
"Explain how to use the Express.js router"
```

### Web Search

Search the web for programming help, documentation, or research:

```bash
"Search for React best practices 2024"

"Find solutions for Python asyncio errors"

"Look up the latest TypeScript features"
```

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
- ✅ Canvas LMS integration (courses, assignments, grades)
- ✅ Google Workspace (Calendar, Gmail, Docs, Drive)
- ✅ DeepWiki (GitHub repository documentation)
- ✅ Agentic tool calling (15+ tools available)

**Phase 6: ✅ Complete** - Student-specific tools
- ✅ Canvas LMS integration (with automatic PDF reading from assignments!)
- ✅ Google Calendar (view, create, update events)
- ✅ Gmail (search, read, send emails with attachments)
- ✅ Google Docs (create, read, append content)
- ✅ Google Drive (search, read files and PDFs)
- ✅ DeepWiki (GitHub repository documentation)

**Phase 7: ✅ Complete** - Packaging & Distribution
- ✅ Global npm installation (`npm install -g sparky-agent`)
- ✅ Interactive setup wizard
- ✅ Persistent configuration in `~/.sparky/`
- ✅ Published to npm registry

## Configuration

All configuration is stored in `~/.sparky/` with secure permissions:

```
~/.sparky/
├── config.json           # API keys and settings
└── google-tokens.json    # OAuth tokens (auto-refreshed)
```

### Updating Configuration

To reconfigure or add new services:

```bash
sparky setup --reset
```

### Checking Configuration

Your config file location:
- **Global install**: `~/.sparky/config.json`
- **Local dev**: `.env` file (takes priority)

## Troubleshooting

### Setup wizard doesn't start
Make sure you're running the latest version:
```bash
npm install -g sparky-agent@latest
```

### "Command not found: sparky"
Ensure npm global bin directory is in your PATH:
```bash
npm config get prefix
# Add <prefix>/bin to your PATH
```

### Google OAuth fails
1. Check credentials in Google Cloud Console
2. Make sure redirect URI is set to `http://localhost`
3. Enable required APIs (Calendar, Gmail, Docs, Drive)

### Canvas connection issues
1. Verify your Canvas domain (e.g., `school.instructure.com`)
2. Check access token is valid (Settings → Approved Integrations)
3. Ensure token has required permissions

### Configuration reset
To start fresh:
```bash
rm -rf ~/.sparky
sparky setup
```

## Requirements

- Node.js >= 18.0.0
- Anthropic API key ([Get one here](https://console.anthropic.com))
- (Optional) Canvas LMS access token
- (Optional) Google OAuth credentials

## Contributing

Contributions welcome! Please check out the [Local Development](#local-development) section to get started.

## Links

- [npm Package](https://www.npmjs.com/package/sparky-agent)
- [GitHub Repository](https://github.com/naman-goyall/Sparky)
- [Report Issues](https://github.com/naman-goyall/Sparky/issues)

## License

MIT

