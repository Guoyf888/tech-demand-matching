import { ApiConfigPanel } from '@/components/settings/ApiConfigPanel';

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">大模型 API 配置</h3>
        <ApiConfigPanel />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">关于</h3>
        <p className="text-gray-600 dark:text-gray-400">
          技术需求智能对接系统 v1.0.0
          <br />
          基于 Tauri + React 构建
          <br />
          <br />
          支持企业（需求方）、高校/科研院所（技术方）、服务机构（平台方）三方技术需求对接
        </p>
      </div>
    </div>
  );
}
