import { useApiStore } from '@/store/apiStore';

export function Footer() {
  const { configs, activeProvider } = useApiStore();
  const currentConfig = configs[activeProvider];

  return (
    <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {currentConfig?.apiKey ? '✅' : '⚠️'} 已连接 {activeProvider.toUpperCase()}
          </span>
          <span className="flex items-center gap-1">
            🔑 {currentConfig?.apiKey ? 'API已配置' : 'API未配置'}
          </span>
          <span>📦 本地存储</span>
        </div>
        <div>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
