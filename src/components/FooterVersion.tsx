/**
 * 底部版本组件：自动同步设置页「关于」的版本号
 */
import React from 'react';
import { useVersion } from '@/config/versionConfig';
import './FooterVersion.css';

const FooterVersion: React.FC = () => {
  const { versionInfo } = useVersion();

  return (
    <div className="footer-version-container">
      <div className="status-info">
        <span className="status-item">✅ 已连接 MINIMAX</span>
        <span className="status-item">💰 API已配置</span>
        <span className="status-item">💾 本地存储</span>
      </div>

      <div className="version-info">
        {versionInfo.version} AI技术经理人
      </div>
    </div>
  );
};

export default FooterVersion;
