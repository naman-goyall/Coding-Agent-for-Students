# Setup Guide

## Quick Start

Follow these steps to get School Agent running:

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create a `.env` file in the project root:

```bash
# Create .env file
touch .env
```

Add your Anthropic API key to the `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
```

**Getting an API Key:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into your `.env` file

### 3. Run the Agent

**Development mode (recommended for testing):**
```bash
npm run dev
```

**Or build and run:**
```bash
npm run build
npm start
```

## Commands

### Start Interactive Chat
```bash
npm run dev chat
```

### Ask a Single Question
```bash
npm run dev run "How do I create a React component?"
```

### Get Help
```bash
npm run dev help-topics
```

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Make sure you created a `.env` file in the project root
- Make sure your API key is correctly formatted in the `.env` file
- The file should contain: `ANTHROPIC_API_KEY=sk-ant-...`

### Module not found errors
- Run `npm install` to ensure all dependencies are installed
- Make sure you're using Node.js 18 or higher: `node --version`

### Build errors
- Run `npm run typecheck` to check for TypeScript errors
- Delete `node_modules` and run `npm install` again

## Next Steps

Once Phase 1 is working, we'll add:
- File operations (list, read, write)
- Code search with ripgrep
- Web search capabilities
- Code editing and patching
- Canvas LMS integration
- Todo management

## Current Status

✅ Phase 1 Complete:
- Basic terminal UI with Ink
- Anthropic Claude Sonnet 4.5 integration
- Streaming responses
- Interactive chat mode
- Single-command mode
- Token estimation
- Error handling

🚧 Coming Soon (Phase 2+):
- File system tools
- Code search
- System tools
- And more!

