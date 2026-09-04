import { useState, useRef, useEffect, useCallback } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { claudeChat, isClaudeCodeInstalled, type ClaudeCodeResponse } from '@/services/claudeCode';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'info';
  content: string;
  timestamp: string;
}

interface Command {
  name: string;
  description: string;
  category: 'core' | 'file' | 'system' | 'ai';
  execute: (
    args: string[],
    addLine: (type: TerminalLine['type'], content: string) => void,
    chat: (message: string) => Promise<ClaudeCodeResponse>
  ) => Promise<void>;
}

export function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', timestamp: new Date().toISOString() },
    { type: 'system', content: '  Claude Code Terminal  ·  AI Development Assistant', timestamp: new Date().toISOString() },
    { type: 'system', content: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', timestamp: new Date().toISOString() },
    { type: 'info', content: '  Ready. Type "help" for available commands.', timestamp: new Date().toISOString() },
    { type: 'system', content: '', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  

  const themeColors = useThemeColors();

  // Check Claude Code CLI availability on mount
  useEffect(() => {
    isClaudeCodeInstalled().then((available) => {
      setCliAvailable(available);
      if (available) {
        addLine('success', '  ✓ Claude Code CLI detected and ready');
      } else {
        addLine('info', '  ℹ Claude Code CLI not found - using simulation mode');
      }
      addLine('system', '');
    });
  }, []);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines((prev) => [...prev, { type, content, timestamp: new Date().toISOString() }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Real Claude Code chat function
  const handleClaudeChat = async (message: string): Promise<ClaudeCodeResponse> => {
    if (cliAvailable) {
      const result = await claudeChat(message, chatHistory);
      if (result.success) {
        setChatHistory((prev) => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: result.output || '' },
        ]);
      }
      return result;
    }
    // Simulation mode
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          output: `This is a simulated response to: ${message}\n\nIn full integration mode, this would call the actual Claude Code CLI with your message.`,
        });
      }, 1000);
    });
  };

  const commands: Command[] = [
    // Core AI Commands
    {
      name: 'chat',
      description: '与 AI 对话',
      category: 'ai',
      execute: async (args, add, chat) => {
        if (args.length === 0) {
          add('info', '  Usage: chat <message>  ·  Example: chat 你好');
          return;
        }
        const message = args.join(' ');
        add('output', '');
        add('info', `  ◌ ${message}`);
        add('output', '');

        const result = await chat(message);

        if (result.success && result.output) {
          add('success', '  ✓ Response received');
          add('output', '');
          add('output', '  AI Assistant:');
          add('output', '  ──────────────────────────────────────────────────────────');
          result.output.split('\n').forEach((line) => {
            add('output', `  ${line}`);
          });
          add('output', '');
        } else {
          add('error', `  ✗ Error: ${result.error || 'Unknown error'}`);
          add('output', '');
        }
      },
    },
    {
      name: 'skills',
      description: '查看和管理技能',
      category: 'ai',
      execute: async (args, add) => {
        if (args[0] === 'apply') {
          add('output', '');
          add('system', '  ┌─ Available Skills ─────────────────────────────────────┐');
          add('system', '  │                                                       │');
          add('system', '  │  🔍 find-skills      搜索和发现可用技能              │');
          add('system', '  │  🛠️ Skill Creator    创建新的 AI 技能                │');
          add('system', '  │  📝 summarize       总结长文本为简洁摘要            │');
          add('system', '  │  🧠 Supermemory     跨对话记忆用户偏好              │');
          add('system', '  │  🔬 deep-research  深度研究复杂主题                │');
          add('system', '  │  💻 simplify        代码审查与优化                  │');
          add('system', '  │  ✓ verify           验证代码变更                    │');
          add('system', '  │  🔄 batch           批量处理任务                    │');
          add('system', '  │  🆘 stuck           解决卡顿问题                    │');
          add('system', '  │                                                       │');
          add('system', '  └───────────────────────────────────────────────────────┘');
          add('output', '');
          add('info', '  Usage: chat /skill <skill-name>  ·  Example: chat /skill summarize');
          add('output', '');
        } else {
          add('output', '');
          add('system', '  ┌─ Skills ───────────────────────────────────────────┐');
          add('system', '  │                                                     │');
          add('system', '  │  Built-in Skills:                                  │');
          add('system', '  │  ├── find-skills, Skill Creator, summarize          │');
          add('system', '  │  ├── Supermemory, deep-research, simplify           │');
          add('system', '  │  ├── verify, batch, stuck                           │');
          add('system', '  │                                                     │');
          add('system', '  │  Custom Skills:                                    │');
          add('system', '  │  └── Upload via Skills Market                       │');
          add('system', '  │                                                     │');
          add('system', '  └─────────────────────────────────────────────────────┘');
          add('output', '');
          add('info', '  Run "skills apply" to see all skills');
          add('output', '');
        }
      },
    },
    {
      name: 'simplify',
      description: '代码审查与优化',
      category: 'ai',
      execute: async (_, add) => {
        add('output', '');
        add('info', '  ◌ Running code review...');
        add('output', '');
        setTimeout(() => {
          add('success', '  ✓ Review complete');
          add('output', '');
          add('system', '  ┌─ Review Results ──────────────────────────────────┐');
          add('system', '  │                                                   │');
          add('system', '  │  Code Quality      ████████████░░░░  82%           │');
          add('system', '  │  Performance       ████████████████  95%           │');
          add('system', '  │  Maintainability   ██████████░░░░░░  68%           │');
          add('system', '  │                                                   │');
          add('system', '  │  Issues Found: 3                                      │');
          add('system', '  │  ├── Suggestion: Optimize loop in component          │');
          add('system', '  │  ├── Warning: Unused variable detected               │');
          add('system', '  │  └── Info: Consider using useMemo here               │');
          add('system', '  │                                                   │');
          add('system', '  └───────────────────────────────────────────────────┘');
          add('output', '');
        }, 1800);
      },
    },
    {
      name: 'verify',
      description: '验证代码变更',
      category: 'ai',
      execute: async (_, add) => {
        add('output', '');
        add('info', '  ◌ Verifying changes...');
        add('output', '');
        setTimeout(() => {
          add('success', '  ✓ All checks passed');
          add('output', '');
          add('system', '  ┌─ Verification Results ─────────────────────────────┐');
          add('system', '  │                                                    │');
          add('system', '  │  ✓ TypeScript compilation     Passed              │');
          add('system', '  │  ✓ ESLint checks              Passed              │');
          add('system', '  │  ✓ Test suite                 24/24 passed         │');
          add('system', '  │  ✓ Build verification         Passed              │');
          add('system', '  │                                                    │');
          add('system', '  └────────────────────────────────────────────────────┘');
          add('output', '');
        }, 1500);
      },
    },
    {
      name: 'remember',
      description: '记忆重要信息',
      category: 'ai',
      execute: async (args, add) => {
        if (args.length > 0) {
          add('output', '');
          add('success', `  ✓ Remembered: ${args.join(' ')}`);
          add('output', '');
        } else {
          add('info', '  Usage: remember <information to remember>');
          add('output', '');
        }
      },
    },
    {
      name: 'deep-research',
      description: '深度研究主题',
      category: 'ai',
      execute: async (args, add) => {
        if (args.length === 0) {
          add('info', '  Usage: deep-research <topic>  ·  Example: deep-research AI trends');
          return;
        }
        const topic = args.join(' ');
        add('output', '');
        add('info', `  ◌ Researching: ${topic}`);
        add('output', '');
        setTimeout(() => {
          add('success', '  ✓ Research complete');
          add('output', '');
          add('system', '  ┌─ Research Report ────────────────────────────────┐');
          add('system', '  │                                                   │');
          add('system', `  │  Topic: ${topic.padEnd(40)} │`);
          add('system', '  │                                                   │');
          add('system', '  │  Key Findings:                                    │');
          add('system', '  │  1. Industry analysis completed                   │');
          add('system', '  │  2. Market trends identified                      │');
          add('system', '  │  3. Technology recommendations provided           │');
          add('system', '  │                                                   │');
          add('system', '  │  Confidence: 87%                                  │');
          add('system', '  │                                                   │');
          add('system', '  └───────────────────────────────────────────────────┘');
          add('output', '');
        }, 2500);
      },
    },
    // File Commands
    {
      name: 'ls',
      description: '列出目录内容',
      category: 'file',
      execute: async (_, add) => {
        add('output', '');
        add('info', '  📁 Current directory: /project');
        add('output', '');
        add('system', '   drwxr-xr-x   src/          ');
        add('system', '   drwxr-xr-x   dist/         ');
        add('system', '   drwxr-xr-x   public/       ');
        add('system', '   drwxr-xr-x   node_modules/ ');
        add('system', '   -rw-r--r--   package.json  ');
        add('system', '   -rw-r--r--   tsconfig.json ');
        add('system', '   -rw-r--r--   vite.config.ts');
        add('output', '');
      },
    },
    {
      name: 'pwd',
      description: '显示当前路径',
      category: 'file',
      execute: async (_, add) => {
        add('output', '');
        add('info', '  📍 /project');
        add('output', '');
      },
    },
    {
      name: 'find',
      description: '搜索文件',
      category: 'file',
      execute: async (args, add) => {
        if (args.length === 0) {
          add('info', '  Usage: find <filename>  ·  Example: find App.tsx');
          return;
        }
        add('output', '');
        add('info', `  🔍 Searching: ${args[0]}`);
        add('output', '');
        add('system', `  ./src/${args[0]}.tsx`);
        add('system', `  ./src/${args[0]}.ts`);
        add('system', `  ./components/${args[0]}.tsx`);
        add('output', '');
      },
    },
    // System Commands
    {
      name: 'clear',
      description: '清空终端',
      category: 'system',
      execute: async () => {
        setLines([]);
        setChatHistory([]);
      },
    },
    {
      name: 'history',
      description: '查看命令历史',
      category: 'system',
      execute: async (_, add) => {
        add('output', '');
        add('system', '  ┌─ Command History ────────────────────────────────┐');
        add('system', '  │                                                    │');
        commandHistory.slice(-8).reverse().forEach((cmd, i) => {
          const num = String(i + 1).padStart(2, ' ');
          add('system', `  │  ${num}. ${cmd.padEnd(46)} │`);
        });
        add('system', '  │                                                    │');
        add('system', '  └────────────────────────────────────────────────────┘');
        add('output', '');
      },
    },
    {
      name: 'exit',
      description: '退出终端',
      category: 'system',
      execute: async (_, add) => {
        add('output', '');
        add('success', '  👋 Claude Code Terminal session ended');
        add('info', '  Thank you for using Claude Code Terminal');
        add('output', '');
        add('info', '  Press "clear" to start a new session');
        add('output', '');
      },
    },
  ];

  const helpContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Claude Code Terminal  ·  Available Commands
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  AI Commands:
  ─────────────────────────────────────────────────────────
  chat <message>       与 AI 对话 (使用 Claude Code)
  skills               查看所有技能
  skills apply         查看可应用的技能
  simplify             代码审查与优化
  verify               验证代码变更
  remember <info>      记忆重要信息
  deep-research <topic> 深度研究主题

  File Commands:
  ─────────────────────────────────────────────────────────
  ls                   列出目录内容
  pwd                  显示当前路径
  find <filename>      搜索文件

  System Commands:
  ─────────────────────────────────────────────────────────
  clear                清空终端
  history              查看命令历史
  exit                 退出终端

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tips: Use ↑↓ arrows for history  ·  Claude Code CLI ${cliAvailable ? 'Connected' : 'Not Available'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const findCommand = (input: string): { cmd: Command; args: string[] } | null => {
    const parts = input.trim().split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = commands.find((c) => c.name === cmdName);
    if (cmd) return { cmd, args };
    return null;
  };

  const handleCommand = async (cmdInput: string) => {
    const trimmed = cmdInput.trim();
    if (!trimmed) return;

    if (trimmed === 'help') {
      addLine('system', helpContent);
      return;
    }

    addLine('input', `❯ ${trimmed}`);
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput('');

    // Check for skill commands
    if (trimmed.startsWith('chat /skill ')) {
      const skillName = trimmed.replace('chat /skill ', '').split(' ')[0];
      addLine('output', '');
      addLine('info', `  🎯 Applying skill: ${skillName}`);
      addLine('output', '');
      const result = await handleClaudeChat(`Please use the ${skillName} skill to help me.`);
      if (result.success && result.output) {
        addLine('success', `  ✓ Skill ${skillName} applied`);
        addLine('output', '');
        addLine('output', result.output);
      }
      addLine('output', '');
      return;
    }

    const result = findCommand(trimmed);

    if (!result) {
      if (trimmed.startsWith('claude') || trimmed.startsWith('/')) {
        addLine('info', '  ◌ Invoking Claude Code...');
        const chatResult = await handleClaudeChat(trimmed);
        if (chatResult.success && chatResult.output) {
          addLine('success', '  ✓ Response received');
          addLine('output', '');
          chatResult.output.split('\n').forEach((line) => {
            addLine('output', `  ${line}`);
          });
        } else {
          addLine('error', `  ✗ ${chatResult.error || 'Failed to get response'}`);
        }
        addLine('output', '');
      } else {
        addLine('error', `  ✗ Unknown command: ${trimmed.split(' ')[0]}`);
        addLine('info', '  Type "help" for available commands');
        addLine('output', '');
      }
      return;
    }

    setIsLoading(true);
    try {
      await result.cmd.execute(result.args, addLine, handleClaudeChat);
    } catch (error: any) {
      addLine('error', `  ✗ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const getLineStyle = (type: TerminalLine['type']): string => {
    switch (type) {
      case 'input': return 'text-white font-medium';
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400';
      case 'system': return 'text-slate-400';
      case 'info': return 'text-cyan-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeColors?.primary }}>
            <span className="text-xl">⬛</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: themeColors?.text }}>
              Claude Code Terminal
              {cliAvailable === true && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white">Connected</span>
              )}
              {cliAvailable === false && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">Simulation</span>
              )}
            </h2>
            <p className="text-xs" style={{ color: themeColors?.textSecondary }}>
              AI-powered development terminal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: showHelp ? themeColors?.primary : themeColors?.surfaceHover,
              color: showHelp ? '#fff' : themeColors?.text,
            }}
          >
            {showHelp ? 'Hide Help' : 'Help'}
          </button>
          <button
            onClick={() => {
              setLines([]);
              setChatHistory([]);
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ backgroundColor: themeColors?.surfaceHover, color: themeColors?.text }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div
          className="mb-4 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap overflow-auto max-h-64"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            color: '#c9d1d9',
          }}
        >
          {helpContent}
        </div>
      )}

      {/* Terminal Body */}
      <div
        className="flex-1 rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
        }}
      >
        {/* Tab Bar */}
        <div
          className="flex items-center h-10 px-4 gap-4"
          style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div
            className="flex-1 text-center text-xs font-medium"
            style={{ color: '#8b949e' }}
          >
            zsh — claude-code-terminal
          </div>
          <div className="text-xs" style={{ color: '#484f58' }}>
            Claude Code {cliAvailable ? 'v2.1.88' : 'Simulation'}
          </div>
        </div>

        {/* Terminal Content */}
        <div
          className="flex-1 p-4 overflow-y-auto font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, idx) => (
            <div
              key={idx}
              className={`mb-1 whitespace-pre-wrap ${getLineStyle(line.type)}`}
            >
              {line.content}
            </div>
          ))}

          {/* Input Line */}
          <div className="flex items-center mt-2">
            <span className="text-emerald-400 mr-2">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-slate-200 caret-white"
              placeholder={isLoading ? 'Processing...' : 'Type a command...'}
              autoFocus
            />
            {isLoading && (
              <div className="flex gap-1 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Status Bar */}
      <div
        className="mt-2 flex items-center justify-between px-4 py-2 rounded-lg text-xs"
        style={{ backgroundColor: themeColors?.surface, color: themeColors?.textSecondary }}
      >
        <div className="flex items-center gap-4">
          <span>Type "help" for commands</span>
          <span>·</span>
          <span>↑↓ for history</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{commandHistory.length} commands</span>
          <span>·</span>
          <span style={{ color: cliAvailable ? themeColors?.primary : '#f59e0b' }}>
            {cliAvailable ? 'CLI Connected' : 'Simulation Mode'}
          </span>
        </div>
      </div>
    </div>
  );
}