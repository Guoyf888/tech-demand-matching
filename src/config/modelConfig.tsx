/**
 * 全局大模型配置模块
 * 新增功能：默认模型设置、全局模型切换、配置持久化
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 模型类型定义
export type ModelType = 'MiniMax' | 'Claude' | 'GPT' | '默认';

export interface ModelConfig {
  model: ModelType;
  isDefault: boolean;
  apiKey: string;
  apiUrl: string;
  modelVersion: string;
}

// 初始模型配置
const INIT_MODEL_CONFIGS: ModelConfig[] = [
  {
    model: 'MiniMax',
    isDefault: true,
    apiKey: import.meta.env.VITE_MINIMAX_API_KEY || '',
    apiUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    modelVersion: 'abab6.5s-chat'
  },
  {
    model: 'Claude',
    isDefault: false,
    apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    modelVersion: 'claude-3-sonnet-20240229'
  },
  {
    model: 'GPT',
    isDefault: false,
    apiKey: import.meta.env.VITE_GPT_API_KEY || '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    modelVersion: 'gpt-3.5-turbo'
  },
  {
    model: '默认',
    isDefault: false,
    apiKey: '',
    apiUrl: '',
    modelVersion: ''
  }
];

// 全局模型配置上下文
export const ModelConfigContext = createContext<{
  modelConfigs: ModelConfig[];
  getDefaultModel: () => ModelConfig;
  setDefaultModel: (modelType: ModelType) => void;
  getModelConfig: (selectedModel: ModelType) => ModelConfig;
  updateModelConfig: (modelType: ModelType, updates: Partial<ModelConfig>) => void;
}>({
  modelConfigs: INIT_MODEL_CONFIGS,
  getDefaultModel: () => INIT_MODEL_CONFIGS[0],
  setDefaultModel: () => {},
  getModelConfig: () => INIT_MODEL_CONFIGS[0],
  updateModelConfig: () => {}
});

// 全局模型配置Hook
export const useModelConfig = () => {
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(() => {
    try {
      const saved = localStorage.getItem('modelConfigs');
      return saved ? JSON.parse(saved) : INIT_MODEL_CONFIGS;
    } catch {
      return INIT_MODEL_CONFIGS;
    }
  });

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('modelConfigs', JSON.stringify(modelConfigs));
  }, [modelConfigs]);

  // 获取当前默认模型
  const getDefaultModel = useCallback((): ModelConfig => {
    const defaultModel = modelConfigs.find(item => item.isDefault);
    return defaultModel || modelConfigs[0];
  }, [modelConfigs]);

  // 设置默认模型
  const setDefaultModel = useCallback((modelType: ModelType) => {
    setModelConfigs(prev => prev.map(config => ({
      ...config,
      isDefault: config.model === modelType
    })));
  }, []);

  // 获取指定模型的配置（若选「默认」则返回默认模型配置）
  const getModelConfig = useCallback((selectedModel: ModelType): ModelConfig => {
    if (selectedModel === '默认') {
      return getDefaultModel();
    }
    return modelConfigs.find(item => item.model === selectedModel) || getDefaultModel();
  }, [modelConfigs, getDefaultModel]);

  // 更新模型配置
  const updateModelConfig = useCallback((modelType: ModelType, updates: Partial<ModelConfig>) => {
    setModelConfigs(prev => prev.map(config =>
      config.model === modelType ? { ...config, ...updates } : config
    ));
  }, []);

  return {
    modelConfigs,
    getDefaultModel,
    setDefaultModel,
    getModelConfig,
    updateModelConfig
  };
};

// 模型配置提供者
export const ModelConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const config = useModelConfig();

  return (
    <ModelConfigContext.Provider value={config}>
      {children}
    </ModelConfigContext.Provider>
  );
};

// 便捷hook（组件内使用）
export const useGlobalModelConfig = () => useContext(ModelConfigContext);
