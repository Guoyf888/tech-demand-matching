/**
 * TechDemandChat - AI技术经理人对话框组件
 *
 * 功能：
 * - 5大科技服务：政策问答/政策汇编/产业链分析/技术预测/双向匹配
 * - 深度思考模式切换
 * - 快捷提问按钮
 * - 结构化结果展示
 * - 完善的加载状态和错误提示
 * - 全局模型选择（默认/MiniMax/Claude/GPT）
 *
 * 使用方式：
 * <TechDemandChat />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { themes, useThemeStore } from '@/store/themeStore';
import { apiGateway } from '@/services/api/gateway';
import {
  executePolicyQA,
  executePolicyCompilation,
  executeIndustryChainAnalysis,
  executeEnterpriseTechPrediction,
  executeResultDemandMatching,
  type TechServiceResult
} from '@/services/skills/techServiceSkills';
import { ModelConfigContext, ModelType } from '@/config/modelConfig';
import './TechDemandChat.css';

// ==================== 类型定义 ====================

type ServiceType = 'policy-qa' | 'policy-compilation' | 'industry-chain' | 'tech-prediction' | 'matching';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'error' | 'system';
  content: string;
  timestamp: string;
  meta?: {
    title?: string;
    tags?: string[];
    error?: string;
    searchProvider?: string;
  };
}

interface ExecutionState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

// ==================== 常量定义 ====================

// 服务类型配置
const SERVICE_TYPES: { id: ServiceType; label: string; icon: string; description: string }[] = [
  { id: 'policy-qa', label: '政策问答', icon: '📋', description: '政策智能问答' },
  { id: 'policy-compilation', label: '政策汇编', icon: '📚', description: '政策汇总整理' },
  { id: 'industry-chain', label: '产业链分析', icon: '🔗', description: '产业链分析' },
  { id: 'tech-prediction', label: '技术预测', icon: '🔮', description: '企业技术预测' },
  { id: 'matching', label: '双向匹配', icon: '🤝', description: '成果需求匹配' },
];

// 快捷提问配置
const QUICK_QUESTIONS: Record<ServiceType, string[]> = {
  'policy-qa': [
    '最新科技政策有哪些？',
    '研发费用加计扣除条件是什么？',
    '高新技术企业所得税优惠',
  ],
  'policy-compilation': [
    '科技创新政策汇编',
    '人工智能产业政策',
    '新能源补贴政策',
  ],
  'industry-chain': [
    '新能源汽车产业链',
    '半导体产业链分析',
    '人工智能产业链',
  ],
  'tech-prediction': [
    '华为技术发展方向',
    '比亚迪技术创新预测',
    '宁德时代技术布局',
  ],
  'matching': [
    '需求：图像识别技术',
    '成果：深度学习算法',
    '技术对接：智能制造',
  ],
};

// ==================== 组件定义 ====================

export function TechDemandChat() {
  // 状态
  const [serviceType, setServiceType] = useState<ServiceType>('policy-qa');
  const [deepThinking, setDeepThinking] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [executionState, setExecutionState] = useState<ExecutionState>({ status: 'idle' });
  const [selectedModel, setSelectedModel] = useState<ModelType>('默认');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Theme
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  // API状态检查
  const apiValidation = apiGateway.validateConfig();

  // 模型配置
  const modelConfigContext = React.useContext(ModelConfigContext);
  const { getModelConfig, getDefaultModel } = modelConfigContext;
  const currentModelConfig = getModelConfig(selectedModel);

  // ==================== 滚动逻辑 ====================

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ==================== 消息处理 ====================

  /**
   * 添加用户消息
   */
  const addUserMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  /**
   * 添加AI结果消息
   */
  const addResultMessage = useCallback((result: TechServiceResult) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: result.error ? 'error' : 'ai',
      content: result.error || result.analysisResult,
      timestamp: new Date().toISOString(),
      meta: {
        title: result.meta.title,
        tags: result.meta.tags,
        error: result.error,
        searchProvider: result.searchProvider,
      },
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  /**
   * 添加系统消息
   */
  const addSystemMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'system',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // ==================== 服务执行 ====================

  /**
   * 执行科技服务
   */
  const executeService = async (inputText: string): Promise<TechServiceResult> => {
    switch (serviceType) {
      case 'policy-qa':
        return executePolicyQA(inputText, deepThinking, currentModelConfig);
      case 'policy-compilation':
        return executePolicyCompilation(inputText, deepThinking, currentModelConfig);
      case 'industry-chain':
        return executeIndustryChainAnalysis(inputText, deepThinking, currentModelConfig);
      case 'tech-prediction':
        return executeEnterpriseTechPrediction(inputText, deepThinking, currentModelConfig);
      case 'matching':
        return executeResultDemandMatching(inputText, deepThinking, currentModelConfig);
      default:
        return {
          type: serviceType,
          input: inputText,
          analysisResult: '',
          error: `未知服务类型: ${serviceType}`,
          meta: { title: '错误', subtitle: '', tags: [] },
        };
    }
  };

  /**
   * 发送消息处理
   */
  const handleSend = async () => {
    if (!input.trim() || executionState.status === 'loading') return;

    // 检查API配置
    if (!apiValidation.valid) {
      addSystemMessage(`⚠️ ${apiValidation.error}`);
      return;
    }

    const userInput = input.trim();
    setInput('');
    addUserMessage(userInput);

    setExecutionState({ status: 'loading', message: '正在分析...' });

    try {
      const result = await executeService(userInput);
      addResultMessage(result);

      if (result.error) {
        setExecutionState({ status: 'error', message: result.error });
      } else {
        setExecutionState({ status: 'success', message: '分析完成' });
        // 3秒后重置状态
        setTimeout(() => setExecutionState({ status: 'idle' }), 3000);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addSystemMessage(`❌ 执行失败: ${errorMsg}`);
      setExecutionState({ status: 'error', message: errorMsg });
    }
  };

  /**
   * 键盘事件处理
   * - Enter: 发送消息
   * - Shift+Enter: 换行
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 自动调整输入框高度
   */
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  /**
   * 快捷提问处理
   */
  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // ==================== 渲染 ====================

  return (
    <div
      className="tech-demand-chat"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      {/* 服务类型选择 */}
      <div
        className="chat-service-header"
        style={{ borderBottom: `1px solid ${themeColors?.border}` }}
      >
        <div className="service-tabs">
          {SERVICE_TYPES.map((service) => (
            <button
              key={service.id}
              className={`service-tab ${serviceType === service.id ? 'active' : ''}`}
              onClick={() => setServiceType(service.id)}
              style={serviceType === service.id ? {
                backgroundColor: themeColors?.primary,
                color: '#fff',
              } : {
                backgroundColor: themeColors?.surface,
                color: themeColors?.textSecondary,
                borderColor: themeColors?.border,
              }}
            >
              <span className="tab-icon">{service.icon}</span>
              <span className="tab-label">{service.label}</span>
            </button>
          ))}
        </div>

        {/* 深度思考开关 */}
        <div className="thinking-toggle">
          <span className="toggle-label" style={{ color: themeColors?.textHint }}>
            {deepThinking ? '🧠 深度思考' : '💡 基础响应'}
          </span>
          <button
            className={`toggle-btn ${deepThinking ? 'active' : ''}`}
            onClick={() => setDeepThinking(!deepThinking)}
            style={{
              backgroundColor: deepThinking ? '#9333EA' : themeColors?.surfaceHover,
              color: deepThinking ? '#fff' : themeColors?.textSecondary,
              borderColor: deepThinking ? '#9333EA' : themeColors?.border,
            }}
          >
            {deepThinking ? '🧠' : '💡'}
          </button>
        </div>

        {/* 模型选择器 */}
        <div className="model-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="model-label" style={{ color: themeColors?.textHint, fontSize: '13px' }}>
            模型:
          </span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelType)}
            disabled={executionState.status === 'loading'}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: `1px solid ${themeColors?.border}`,
              backgroundColor: themeColors?.surface,
              color: themeColors?.text,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="默认">默认({getDefaultModel().model})</option>
            <option value="MiniMax">MiniMax</option>
            <option value="Claude">Claude</option>
            <option value="GPT">GPT</option>
          </select>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <div className="empty-title">AI技术经理人</div>
            <div className="empty-description">
              {SERVICE_TYPES.find(s => s.id === serviceType)?.description || '科技服务'}
            </div>

            {/* 快捷提问 */}
            <div className="quick-questions">
              {QUICK_QUESTIONS[serviceType].map((q, i) => (
                <button
                  key={i}
                  className="quick-btn"
                  onClick={() => handleQuickQuestion(q)}
                  style={{
                    backgroundColor: themeColors?.surface,
                    borderColor: themeColors?.border,
                    color: themeColors?.textSecondary,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* API状态提示 */}
            {!apiValidation.valid && (
              <div className="api-warning">
                ⚠️ {apiValidation.error}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type}-message`}>
            <div className="message-content">
              {msg.meta?.title && (
                <div className="message-header">
                  <span className="message-title">{msg.meta.title}</span>
                  {msg.meta.tags?.map((tag, i) => (
                    <span key={i} className="message-tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="message-text">{msg.content}</div>
              {msg.meta?.searchProvider && (
                <div className="message-footer">
                  数据来源: {msg.meta.searchProvider}
                </div>
              )}
            </div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {/* 加载状态 */}
        {executionState.status === 'loading' && (
          <div className="message ai-message loading">
            <div className="loading-indicator">
              <span className="loading-dot">●</span>
              <span className="loading-dot">●</span>
              <span className="loading-dot">●</span>
            </div>
            <div className="loading-text">🧠 {executionState.message || 'AI技术经理人分析中...'}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div
        className="chat-input-area"
        style={{ borderTop: `1px solid ${themeColors?.border}` }}
      >
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={adjustTextareaHeight}
          onKeyDown={handleKeyDown}
          placeholder={
            apiValidation.valid
              ? `输入问题，按 Enter 发送，Shift+Enter 换行...`
              : `请先配置API密钥后使用...`
          }
          rows={2}
          disabled={executionState.status === 'loading'}
          style={{
            backgroundColor: themeColors?.surface,
            color: themeColors?.text,
            borderColor: themeColors?.border,
          }}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || executionState.status === 'loading'}
          style={{
            backgroundColor: '#9333EA',
            opacity: (!input.trim() || executionState.status === 'loading') ? 0.5 : 1,
          }}
        >
          {executionState.status === 'loading' ? '分析中...' : '发送'}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="chat-tip" style={{ color: themeColors?.textHint }}>
        💡 AI技术经理人融合政策库、企业数据库和技术趋势分析，提供专业的科技服务
      </div>
    </div>
  );
}

export default TechDemandChat;
