import { useEffect, useState } from 'react';
import { useApiStore } from '@/store/apiStore';
import { apiGateway } from '@/services/api/gateway';
import { useThemeColors } from '@/store/themeStore';
import { PROVIDER_META, type Provider } from '@/config/providers';
import { secretStore } from '@/utils/secretStore';
import { LockKeyhole } from 'lucide-react';

const providerList = (Object.values(PROVIDER_META) as Array<{ id: Provider; name: string; placeholder?: string; baseUrl?: string }>)
  .filter((p) => p.id !== 'gemini' || p.baseUrl)
  .map((p) => ({ id: p.id, name: p.name, placeholder: p.placeholder ?? 'API Key', baseUrl: p.baseUrl }));

export function ApiConfigPanel() {
  const { configs, activeProvider, setConfig, setActiveProvider } = useApiStore();

  const currentConfig = configs[activeProvider];
  const [apiKey, setApiKey] = useState(''); // 实际值来自 Keychain
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || providerList.find(p => p.id === activeProvider)?.baseUrl || '');
  const [modelId, setModelId] = useState(currentConfig?.modelId || '');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  const themeColors = useThemeColors();

  const selectedProvider = providerList.find(p => p.id === activeProvider);

  // 从 Keychain 拉取当前 provider 的 API Key；切换 provider 时重新加载
  useEffect(() => {
    let cancelled = false;
    void secretStore.get(activeProvider).then((value) => {
      if (cancelled) return;
      setApiKey(value ?? '');
      setHasSavedKey(value !== null && value.length > 0);
    });
    return () => { cancelled = true; };
  }, [activeProvider, currentConfig?.baseUrl, currentConfig?.modelId]);

  /**
   * 验证配置输入
   */
  const validateInput = (): string | null => {
    if (!apiKey.trim()) return '请输入API Key';
    if (!baseUrl.trim()) return '请输入API地址';
    if (!modelId.trim()) return '请输入模型ID';
    try {
      new URL(baseUrl);
    } catch {
      return 'API地址格式不正确，请输入完整的URL（如 https://api.example.com）';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateInput();
    if (error) {
      setValidationError(error);
      setTestResult(null);
      return;
    }

    setValidationError(null);

    // 元数据持久化到 localStorage（不含 apiKey）
    setConfig(activeProvider, {
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim(),
    });
    // apiKey 单独写入 Keychain
    await secretStore.save(activeProvider, apiKey.trim());
    setHasSavedKey(true);
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
      // 先写入内存 + Keychain
      setConfig(activeProvider, {
        baseUrl: baseUrl.trim(),
        modelId: modelId.trim(),
      });
      await secretStore.save(activeProvider, apiKey.trim());

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

      {/* 存储后端提示 */}
      <div
        className="p-2 rounded text-xs"
        style={{
          backgroundColor: themeColors?.primaryLight,
          color: themeColors?.primary,
        }}
      >
        <span className="inline-flex items-center gap-2">
          <LockKeyhole size={15} aria-hidden="true" />
          API Key 存储于：{secretStore.isUsingKeychain() ? `系统钥匙串（${hasSavedKey ? '已配置' : '未配置'}）` : '本地存储（降级模式）'}
        </span>
      </div>

      {/* Provider Selection */}
      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: themeColors?.text }}
        >
          选择模型提供商
        </label>
        <div className="grid grid-cols-4 gap-2">
          {providerList.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvider(p.id);
                setBaseUrl(p.baseUrl || '');
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
          {hasSavedKey && <span style={{ color: themeColors?.success, marginLeft: 8 }}>✓ 已保存</span>}
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
          {selectedProvider?.name} 的API密钥，将加密存入系统钥匙串
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
          placeholder={PROVIDER_META[activeProvider]?.defaultModel ?? '模型ID'}
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
