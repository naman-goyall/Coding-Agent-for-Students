# 🎓 START HERE - School Agent

## Phase 1 is Complete! ✅

Your student coding CLI agent is ready for testing. Here's everything you need to know.

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Add Your API Key
Create a `.env` file in the project root:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-your-actual-key-here" > .env
```

> Get your API key at: https://console.anthropic.com/

### Step 2: Run the Agent
```bash
npm run dev chat
```

That's it! Start asking questions. 🚀

---

## 📚 What You Have Now

### ✅ Working Features
- **Interactive Chat**: Full conversation with Claude Sonnet 4.5
- **Streaming Responses**: See answers appear in real-time
- **Beautiful UI**: Color-coded terminal interface
- **Single Commands**: Quick one-off questions
- **Smart Memory**: Conversation history with automatic cleanup
- **Token Tracking**: See token usage in real-time

### 📁 Project Structure
```
school-agent/
├── src/
│   ├── agent/          # AI controller & conversation logic
│   ├── cli/            # Terminal UI & commands
│   ├── config/         # Configuration loading
│   ├── types/          # TypeScript types
│   └── utils/          # Logger and utilities
├── dist/               # Compiled JavaScript (after build)
└── docs/               # You're reading them!
```

---

## 🎯 Try These Examples

### Example 1: Learn a Concept
```bash
npm run dev chat
```
Then ask:
> "What are React hooks and how do I use them?"

### Example 2: Debug an Error
```bash
npm run dev run "What does 'undefined is not a function' mean?"
```

### Example 3: Get Code Help
In chat mode, ask:
> "Show me how to create a Python class with inheritance"

---

## 📖 Documentation Guide

| File | Purpose |
|------|---------|
| `START_HERE.md` | ⭐ You are here! |
| `QUICKSTART.md` | Fast setup instructions |
| `SETUP.md` | Detailed setup guide |
| `PHASE1_COMPLETE.md` | What was built in Phase 1 |
| `EXAMPLE_SESSION.md` | See the UI in action |
| `PROJECT_PLAN.md` | Full roadmap (all phases) |
| `README.md` | Project overview |

---

## 🔧 Available Commands

```bash
# Development (recommended)
npm run dev chat                    # Start interactive chat
npm run dev run "your question"     # Single question
npm run dev help-topics             # Show help

# Production Build
npm run build                       # Compile TypeScript
npm start chat                      # Run compiled version

# Development Tools
npm run typecheck                   # Check TypeScript types
npm run format                      # Format code with Prettier
```

---

## ✨ What Makes This Special

1. **Student-Focused**: Designed for learning and school projects
2. **Real-time Streaming**: Fast, responsive UI
3. **Type-Safe**: Full TypeScript with strict mode
4. **Modular**: Easy to extend with new features
5. **Well-Documented**: Comprehensive guides and examples

---

## 🚀 What's Coming Next

### Phase 2: File System Tools 📁
- `list_files` - Browse directories
- `read_file` - Read file contents
- `ripgrep` - Search code

### Phase 3: System Tools 🔧
- `bash` - Execute commands
- `web_search` - Search the web
- `write_file` - Create/edit files

### Phase 4: Code Editing ✏️
- Smart editing tools
- Search & replace
- Multi-file refactoring

### Phase 5: Patches 🩹
- Generate diffs
- Apply patches
- Review changes

### Phase 6: Student Tools 🎓
- Canvas LMS integration
- Todo management
- GitHub documentation (DeepWiki)

---

## 🧪 Testing Checklist

Before moving to Phase 2, verify:

- [ ] Agent starts without errors
- [ ] Can send messages and get responses
- [ ] Streaming works (text appears gradually)
- [ ] Conversation history works (ask follow-up questions)
- [ ] Token count updates
- [ ] Can exit with Ctrl+C
- [ ] Single command mode works (`run` command)
- [ ] Error messages are clear

---

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Make sure `.env` file exists in project root
- Check the format: `ANTHROPIC_API_KEY=sk-ant-...`
- No quotes or spaces around the key

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
npm run typecheck  # See what's wrong
npm run build      # Try building again
```

### UI looks weird
- Make sure your terminal supports colors
- Try a different terminal (iTerm2, Hyper, Windows Terminal)
- Check terminal width (needs at least 80 characters)

---

## 💡 Pro Tips

1. **Be Specific**: "How do I add error handling to a fetch request?" works better than "How does fetch work?"

2. **Use Context**: In chat mode, ask follow-up questions. The agent remembers the conversation.

3. **Ask for Examples**: "Show me an example of..." usually gives you code you can use.

4. **Debug Together**: Paste error messages and ask "What does this mean?"

5. **Learn Incrementally**: Start with basics, then ask deeper questions.

---

## 🎓 Perfect For Students

This tool helps with:
- ✅ Understanding new concepts
- ✅ Debugging code errors
- ✅ Learning best practices
- ✅ Getting unstuck on assignments
- ✅ Exploring new technologies
- ✅ Code reviews and improvements

**Coming soon:** Direct integration with Canvas for assignment help!

---

## 📊 Current Status

```
Phase 1: Foundation ✅ COMPLETE
  ├── Project setup ✅
  ├── Anthropic integration ✅
  ├── Terminal UI ✅
  └── CLI commands ✅

Phase 2: File Tools 🔜 NEXT
Phase 3: System Tools 📅 PLANNED
Phase 4: Code Editing 📅 PLANNED
Phase 5: Patches 📅 PLANNED
Phase 6: Student Tools 📅 PLANNED
```

---

## 🤝 Development Workflow

When you're ready to add features:

1. **Read** `PROJECT_PLAN.md` for the full roadmap
2. **Check** `PHASE1_COMPLETE.md` to see what's done
3. **Follow** the phase-by-phase approach
4. **Test** each feature before moving on

---

## 🎉 You're Ready!

Everything is set up and working. Time to test it!

```bash
# Set your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env

# Start chatting!
npm run dev chat
```

**Have fun building and learning!** 🚀

---

## 📞 Need Help?

- Check the documentation files listed above
- Review `PROJECT_PLAN.md` for architecture details
- Look at `EXAMPLE_SESSION.md` for usage examples

**Ready for Phase 2?** Just let me know and I'll implement the file system tools!

