import { useState, useRef } from 'react';
import { apiGateway } from '@/services/api/gateway';
import { useApiStore } from '@/store/apiStore';
import { themes, useThemeStore } from '@/store/themeStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const modelOptions = [
  { id: 'openai', name: 'OpenAI GPT-4' },
  { id: 'claude', name: 'Claude 3.5' },
  { id: 'qwen', name: '阿里 Qwen' },
  { id: 'ernie', name: '百度 文心一言' },
  { id: 'zhipu', name: '智谱 GLM-4' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'kimi', name: 'Kimi' },
  { id: 'openrouter', name: 'OpenRouter' },
];

export function AIAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { configs, activeProvider, setActiveProvider } = useApiStore();
  const { theme } = useThemeStore();

  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 切换到选中的模型
    if (selectedModel !== activeProvider) {
      setActiveProvider(selectedModel as any);
    }

    try {
      if (!apiGateway.isConfigured()) {
        const config = configs[selectedModel as keyof typeof configs];
        if (config) {
          apiGateway.setConfig(config);
        }
      }

      const response = await apiGateway.chat({
        messages: [
          {
            role: 'system',
            content: '你是技术经理人的AI助手，可以帮助分析技术需求、技术成果，提供创新建议，促成技术对接。用专业但易懂的语言回答。',
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],
      });

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantContent, timestamp: new Date() },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${error.message}`, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: `[导入文件: ${file.name}]\n${content.slice(0, 2000)}`, timestamp: new Date() },
      ]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      {/* 模型选择器 */}
      <div className="relative px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: themeColors?.border, backgroundColor: themeColors?.backgroundAlt }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: themeColors?.text }}>AI 对话</span>
          {messages.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
            >
              {messages.filter((m) => m.role === 'user').length} 条对话
            </span>
          )}
        </div>
        <div className="relative">
          <button
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: themeColors?.surfaceHover,
              color: themeColors?.text,
            }}
            onClick={() => setShowModelPicker(!showModelPicker)}
          >
            {modelOptions.find((m) => m.id === selectedModel)?.name || '选择模型'}
            <span>▼</span>
          </button>
          {showModelPicker && (
            <div
              className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg shadow-lg z-10"
              style={{
                backgroundColor: themeColors?.surface,
                border: `1px solid ${themeColors?.border}`,
              }}
            >
              {modelOptions.map((model) => (
                <button
                  key={model.id}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-50"
                  style={{
                    backgroundColor: selectedModel === model.id ? themeColors?.primaryHover : 'transparent',
                    color: themeColors?.text,
                  }}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelPicker(false);
                  }}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🤖</div>
            <div className="text-lg font-medium mb-2" style={{ color: themeColors?.text }}>
              您好，我是技术经理人AI助手
            </div>
            <div className="text-sm" style={{ color: themeColors?.textSecondary }}>
              可以帮您分析技术需求、成果，或进行技术对接咨询
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] p-3 rounded-lg"
              style={
                msg.role === 'user'
                  ? { backgroundColor: themeColors?.primary, color: '#fff' }
                  : { backgroundColor: themeColors?.surfaceHover, color: themeColors?.text }
              }
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div
                className="text-xs mt-1 opacity-60"
              >
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: themeColors?.surfaceHover }}
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: themeColors?.primary }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: themeColors?.primary, animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: themeColors?.primary, animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t" style={{ borderColor: themeColors?.border }}>
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
            style={{ backgroundColor: themeColors?.surfaceHover, color: themeColors?.textSecondary }}
          >
            <span>📎</span>
            <input type="file" className="hidden" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFileImport} />
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，按 Enter 发送..."
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: themeColors?.background,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`,
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
          >
            发送
          </button>
        </div>
        <div className="mt-2 text-xs text-center" style={{ color: themeColors?.textSecondary }}>
          AI 助手可能会产生不准确的信息，请以实际验证为准
        </div>
      </div>
    </div>
  );
}
