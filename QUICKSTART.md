# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Set Up Your API Key

Create a file named `.env` in the project root and add:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

**Get your API key:** https://console.anthropic.com/

### 3️⃣ Run the Agent

```bash
npm run dev chat
```

That's it! 🎉

## Example Usage

### Interactive Chat
```bash
npm run dev chat
```

Then type questions like:
- "How do I create a React component with hooks?"
- "Explain what async/await does in JavaScript"
- "Help me debug this error: Cannot read property 'map' of undefined"

### Single Question
```bash
npm run dev run "What is the difference between let and const?"
```

## What Works Now (Phase 1 ✅)

- ✅ Interactive terminal UI
- ✅ Streaming responses from Claude Sonnet 4.5
- ✅ Conversation history management
- ✅ Token counting
- ✅ Error handling
- ✅ Beautiful terminal interface

## Coming Next (Phase 2+)

- 📁 File operations (list, read, write, edit)
- 🔍 Code search with ripgrep
- 🌐 Web search
- ✏️ Smart code editing and patching
- 📚 Canvas LMS integration
- ✅ Todo management
- 📖 GitHub documentation (DeepWiki)

## Tips

- Press **Ctrl+C** to exit anytime
- The agent remembers context during the chat session
- Be specific with your questions for best results
- Ask for code examples, explanations, or debugging help

## Need Help?

Run:
```bash
npm run dev help-topics
```

Or check out:
- `SETUP.md` - Detailed setup instructions
- `PROJECT_PLAN.md` - Full project roadmap
- `README.md` - Project overview

---

**Enjoy coding with School Agent! 🎓**

