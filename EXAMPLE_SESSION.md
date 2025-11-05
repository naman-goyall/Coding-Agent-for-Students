# Example Session

Here's what a typical interaction looks like with School Agent!

---

## Starting the Agent

```bash
$ npm run dev chat
```

---

## Example Chat Session

```
╭─────────────────────────────────────────────────────────────╮
│ 🎓 School Agent | Powered by Claude Sonnet 4.5 | ~150 tokens │
╰─────────────────────────────────────────────────────────────╯

ℹ️  Welcome to School Agent! Type your question and press Enter. Press Ctrl+C to exit.

👤 You: 
→ What is a React component?█

⏳ Thinking...

🤖 Agent: 
  A React component is a reusable piece of code that defines how a part 
  of your user interface should appear and behave. Think of components as 
  building blocks for your web application.

  There are two main types:

  1. **Function Components** (modern approach):
  ```javascript
  function Welcome(props) {
    return <h1>Hello, {props.name}!</h1>;
  }
  ```

  2. **Class Components** (older approach):
  ```javascript
  class Welcome extends React.Component {
    render() {
      return <h1>Hello, {this.props.name}!</h1>;
    }
  }
  ```

  Key concepts:
  - Components can accept inputs called "props"
  - They return JSX (HTML-like syntax)
  - They can manage their own state
  - They're reusable throughout your app

  Would you like me to explain any of these concepts in more detail?

👤 You: 
→ How do I use useState hook?█
```

---

## Single Command Example

```bash
$ npm run dev run "What is async/await?"

🤖 Agent: Thinking...

🤖 Agent: Async/await is a modern JavaScript syntax for handling 
asynchronous operations. It makes asynchronous code look and behave 
more like synchronous code, which is easier to read and understand.

**Async functions** return a Promise:
```javascript
async function fetchData() {
  return "data";
}
```

**Await** pauses execution until a Promise resolves:
```javascript
async function getData() {
  const result = await fetchData();
  console.log(result); // "data"
}
```

This is much cleaner than using .then() chains!
```

---

## Help Topics

```bash
$ npm run dev help-topics

🎓 School Agent - Help Topics

GETTING STARTED:
  school-agent chat              Start interactive chat
  school-agent run "question"    Ask a single question

EXAMPLES:
  # Start a chat session
  school-agent chat

  # Ask a quick question
  school-agent run "How do I create a React component?"
  
  # Get help with an error
  school-agent run "What does 'Cannot read property of undefined' mean?"

TIPS:
  - Be specific with your questions
  - You can ask for explanations, code examples, or debugging help
  - The agent remembers context within a chat session
  - Press Ctrl+C to exit at any time

More features coming soon:
  - File operations (read, write, search)
  - Canvas LMS integration
  - Todo management
  - Web search
  - And more!
```

---

## Real-World Student Use Cases

### 1. Understanding Concepts
```
👤 You: Explain what a linked list is

🤖 Agent: A linked list is a data structure where elements (called nodes)
are connected via pointers. Unlike arrays, elements aren't stored in 
contiguous memory...
```

### 2. Debugging Help
```
👤 You: I'm getting "TypeError: map is not a function" what does this mean?

🤖 Agent: This error means you're trying to use .map() on something that 
isn't an array. Common causes:
1. The variable is undefined or null
2. It's an object, not an array
3. An async function hasn't resolved yet...
```

### 3. Code Examples
```
👤 You: Show me how to make an API call in React

🤖 Agent: Here's how to fetch data from an API in React using hooks:

```javascript
import { useState, useEffect } from 'react';

function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('https://api.example.com/user')
      .then(response => response.json())
      .then(data => setUser(data));
  }, []);
  
  if (!user) return <div>Loading...</div>;
  
  return <div>{user.name}</div>;
}
```

This pattern:
1. Creates state with useState
2. Fetches on component mount with useEffect
3. Shows loading state while fetching
4. Displays data when ready
```

### 4. Assignment Help
```
👤 You: I need to write a function that finds the factorial of a number

🤖 Agent: Here's a factorial function with explanation:

```javascript
function factorial(n) {
  // Base case: factorial of 0 or 1 is 1
  if (n <= 1) return 1;
  
  // Recursive case: n! = n * (n-1)!
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120
```

Explanation:
- factorial(5) = 5 × 4 × 3 × 2 × 1 = 120
- Uses recursion: function calls itself with smaller input
- Base case prevents infinite recursion

Alternative iterative approach:
```javascript
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
```
```

---

## UI Features Demonstrated

✨ **Color Coding:**
- 👤 User messages in green
- 🤖 Assistant messages in white
- ℹ️ System messages in gray

✨ **Real-time Streaming:**
- Text appears as Claude generates it
- No waiting for full response

✨ **Status Information:**
- Shows current token usage
- Model information in header
- Processing indicators

✨ **Keyboard Controls:**
- Type naturally to input text
- Backspace/Delete to edit
- Enter to send
- Ctrl+C to exit

---

## Performance Notes

- **First response**: Usually 1-2 seconds
- **Streaming**: Tokens appear in real-time
- **Long responses**: Stream smoothly without blocking
- **Token counting**: Updates after each exchange

---

## What's Next?

Once you test Phase 1 and verify it works, we can move to Phase 2:

**Phase 2 will add:**
- 📁 `list_files` - Browse project directories
- 📖 `read_file` - Read file contents with line numbers
- 🔍 `ripgrep` - Fast code search

These tools will let the agent:
- Explore your project structure
- Read your code files
- Search for specific patterns
- Understand your codebase context

---

**Ready to try it? Set up your API key and start chatting!** 🚀

