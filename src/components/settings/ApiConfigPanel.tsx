import { useState } from 'react';
import { Provider, ApiConfig } from '@/services/api/types';
import { useApiStore } from '@/store/apiStore';
import { apiGateway } from '@/services/api/gateway';
import { themes, useThemeStore } from '@/store/themeStore';

const providers: { id: Provider; name: string; placeholder: string; baseUrl?: string }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...', baseUrl: 'https://api.openai.com' },
  { id: 'claude', name: 'Claude', placeholder: 'sk-ant-...', baseUrl: 'https://api.anthropic.com' },
  { id: 'qwen', name: '阿里Qwen', placeholder: 'API Key', baseUrl: 'https://dashscope.aliyuncs.com' },
  { id: 'ernie', name: '百度文心', placeholder: 'API Key', baseUrl: 'https://qianfan.baidubce.com' },
  { id: 'zhipu', name: '智谱GLM', placeholder: 'API Key', baseUrl: 'https://open.bigmodel.cn' },
  { id: 'minimax', name: 'MiniMax', placeholder: 'API Key', baseUrl: 'https://api.minimax.chat' },
  { id: 'kimi', name: 'Kimi', placeholder: 'API Key', baseUrl: 'https://api.moonshot.cn' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...', baseUrl: 'https://openrouter.ai' },
  { id: 'custom', name: '自定义', placeholder: 'API Key' },
];

export function ApiConfigPanel() {
  const { configs, activeProvider, setConfig, setActiveProvider } = useApiStore();

  const currentConfig = configs[activeProvider];
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || providers.find(p => p.id === activeProvider)?.baseUrl || '');
  const [modelId, setModelId] = useState(currentConfig?.modelId || '');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const selectedProvider = providers.find(p => p.id === activeProvider);

  /**
   * 验证配置输入
   */
  const validateInput = (): string | null => {
    if (!apiKey.trim()) {
      return '请输入API Key';
    }
    if (!baseUrl.trim()) {
      return '请输入API地址';
    }
    if (!modelId.trim()) {
      return '请输入模型ID';
    }
    // 验证URL格式
    try {
      new URL(baseUrl);
    } catch {
      return 'API地址格式不正确，请输入完整的URL（如 https://api.example.com）';
    }
    return null;
  };

  const handleSave = () => {
    const error = validateInput();
    if (error) {
      setValidationError(error);
      setTestResult(null);
      return;
    }

    setValidationError(null);

    const config: ApiConfig = {
      provider: activeProvider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim(),
    };
    setConfig(activeProvider, config);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    const error = validateInput();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setTesting(true);
    setTestResult(null);

    try {
      const config: ApiConfig = {
        provider: activeProvider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        modelId: modelId.trim(),
      };
      // 先保存配置
      setConfig(activeProvider, config);

      // 测试连接
      const response = await apiGateway.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });

      if (response.ok) {
        setTestResult({ success: true, message: '连接成功！API配置正确，可以正常使用' });
      } else {
        let errorMsg = '连接失败';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorData.error?.code || JSON.stringify(errorData.error || {}).slice(0, 100);
        } catch {
          errorMsg = response.statusText || '未知错误';
        }
        setTestResult({ success: false, message: `连接失败: ${errorMsg}` });
      }
    } catch (e: any) {
      let errorMsg = e.message || '未知错误';

      // 优化错误提示
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('无效')) {
        errorMsg = 'API密钥无效或已过期，请检查API Key是否正确';
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('拒绝')) {
        errorMsg = 'API访问被拒绝，请检查API Key是否有权限';
      } else if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('超限')) {
        errorMsg = 'API请求频率超限，请稍后重试';
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = '网络连接失败，请检查API地址是否正确，或需要代理';
      }

      setTestResult({ success: false, message: `连接失败: ${errorMsg}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 错误提示 */}
      {validationError && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: themeColors?.error + '15',
            border: `1px solid ${themeColors?.error}`,
            color: themeColors?.error,
          }}
        >
          {validationError}
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: themeColors?.text }}
        >
          选择模型提供商
        </label>
        <div className="grid grid-cols-3 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvider(p.id);
                setBaseUrl(p.baseUrl || '');
                setApiKey(configs[p.id]?.apiKey || '');
                setModelId(configs[p.id]?.modelId || '');
                setValidationError(null);
                setTestResult(null);
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:scale-[0.98]"
              style={{
                backgroundColor: activeProvider === p.id ? themeColors?.primaryLight : themeColors?.surface,
                borderColor: activeProvider === p.id ? themeColors?.primary : themeColors?.border,
                color: activeProvider === p.id ? themeColors?.primary : themeColors?.textSecondary,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: themeColors?.text }}
        >
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setValidationError(null);
            setTestResult(null);
          }}
          placeholder={selectedProvider?.placeholder}
          className="input"
          style={{
            backgroundColor: themeColors?.surface,
            borderColor: themeColors?.border,
            color: themeColors?.text,
          }}
        />
        <p
          className="text-xs mt-1"
          style={{ color: themeColors?.textHint }}
        >
          {selectedProvider?.name} 的API密钥，请从官网获取
        </p>
      </div>

      {/* API Endpoint */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: themeColors?.text }}
        >
          API 地址
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            setValidationError(null);
            setTestResult(null);
          }}
          placeholder={selectedProvider?.baseUrl || 'https://your-api.com/v1'}
          className="input"
          style={{
            backgroundColor: themeColors?.surface,
            borderColor: themeColors?.border,
            color: themeColors?.text,
          }}
        />
        <p
          className="text-xs mt-1"
          style={{ color: themeColors?.textHint }}
        >
          API请求地址，通常不需要修改
        </p>
      </div>

      {/* Model ID */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: themeColors?.text }}
        >
          模型 ID
        </label>
        <input
          type="text"
          value={modelId}
          onChange={(e) => {
            setModelId(e.target.value);
            setValidationError(null);
            setTestResult(null);
          }}
          placeholder={
            activeProvider === 'openai' ? 'gpt-4o' :
            activeProvider === 'claude' ? 'claude-3-5-sonnet-latest' :
            activeProvider === 'qwen' ? 'qwen-plus' :
            activeProvider === 'ernie' ? 'ernie-4.0-8k' :
            activeProvider === 'zhipu' ? 'glm-4' :
            activeProvider === 'minimax' ? 'abab6-chat' :
            activeProvider === 'kimi' ? 'moonshot-v1-8k' :
            '模型ID'
          }
          className="input"
          style={{
            backgroundColor: themeColors?.surface,
            borderColor: themeColors?.border,
            color: themeColors?.text,
          }}
        />
        <p
          className="text-xs mt-1"
          style={{ color: themeColors?.textHint }}
        >
          输入要使用的模型名称，如 gpt-4o、claude-3-5-sonnet-latest 等
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={testing}
          className="btn-primary px-6"
        >
          {saved ? '✓ 已保存' : '保存配置'}
        </button>
        <button
          onClick={handleTest}
          disabled={!apiKey.trim() || !baseUrl.trim() || !modelId.trim() || testing}
          className="btn-primary px-6"
          style={{ backgroundColor: testing ? themeColors?.textHint : themeColors?.success }}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: testResult.success
              ? themeColors?.success + '15'
              : themeColors?.error + '15',
            border: `1px solid ${testResult.success ? themeColors?.success : themeColors?.error}`,
            color: testResult.success ? themeColors?.success : themeColors?.error,
          }}
        >
          <pre className="text-sm whitespace-pre-wrap">{testResult.message}</pre>
        </div>
      )}
    </div>
  );
}
