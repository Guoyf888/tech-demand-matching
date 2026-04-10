import { useState } from 'react';
import { Provider, ApiConfig } from '@/services/api/types';
import { useApiStore } from '@/store/apiStore';
import { apiGateway } from '@/services/api/gateway';

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
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = () => {
    const config: ApiConfig = {
      provider: activeProvider,
      apiKey,
      baseUrl: baseUrl || providers.find(p => p.id === activeProvider)?.baseUrl,
      modelId,
    };
    setConfig(activeProvider, config);
    apiGateway.setConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!apiKey || !modelId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const config: ApiConfig = {
        provider: activeProvider,
        apiKey,
        baseUrl: baseUrl || providers.find(p => p.id === activeProvider)?.baseUrl,
        modelId,
      };
      apiGateway.setConfig(config);
      const response = await apiGateway.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });
      if (response.ok) {
        setTestResult('✅ 连接成功！');
      } else {
        const error = await response.text();
        setTestResult(`❌ 连接失败: ${error}`);
      }
    } catch (e: any) {
      setTestResult(`❌ 连接失败: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === activeProvider);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">选择模型提供商</label>
        <div className="grid grid-cols-3 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvider(p.id);
                setBaseUrl(p.baseUrl || '');
                setApiKey(configs[p.id]?.apiKey || '');
                setModelId(configs[p.id]?.modelId || '');
              }}
              className={`px-4 py-2 rounded-lg border transition-all ${
                activeProvider === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={selectedProvider?.placeholder}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Endpoint</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={selectedProvider?.baseUrl || 'https://your-api.com/v1'}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">模型 ID</label>
        <input
          type="text"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder={activeProvider === 'openai' ? 'gpt-4o' : activeProvider === 'claude' ? 'claude-3-5-sonnet-latest' : '模型ID'}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {saved ? '✓ 已保存' : '保存配置'}
        </button>
        <button
          onClick={handleTest}
          disabled={!apiKey || !modelId || testing}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>

      {testResult && (
        <div className={`p-3 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
          <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
}
