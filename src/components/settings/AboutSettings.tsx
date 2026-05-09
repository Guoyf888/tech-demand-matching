/**
 * 设置页「关于」模块：自动同步version_log.json中的最新版本号
 */
import React, { useState, useEffect } from 'react';
import versionLog from '../../../version_log.json';
import { themes, useThemeStore } from '@/store/themeStore';
import './AboutSettings.css';

interface VersionEntry {
  version: string;
  update_time: string;
  content: string[];
}

const AboutSettings: React.FC = () => {
  const versions = versionLog as VersionEntry[];
  const latestVersion = versions[0]?.version || 'v1.0.0';
  const latestUpdateTime = versions[0]?.update_time || '';

  const [editVersion, setEditVersion] = useState<string>(latestVersion);
  const [editDesc, setEditDesc] = useState<string>(
    versions[0]?.content?.join('；') || ''
  );

  const effectiveTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[effectiveTheme as keyof typeof themes]?.colors;

  // 每次组件挂载时从version_log.json同步最新版本
  useEffect(() => {
    setEditVersion(latestVersion);
    setEditDesc(versions[0]?.content?.join('；') || '');
  }, [latestVersion]);

  const handleSave = () => {
    // 保存到localStorage作为当前版本信息（供其他地方使用）
    localStorage.setItem('systemVersion', JSON.stringify({
      version: editVersion,
      updateTime: new Date().toLocaleDateString(),
      description: editDesc
    }));
    alert('版本信息已更新！注意：正式版本号需在version_log.json中修改');
  };

  return (
    <div className="about-settings-container">
      <h3 className="about-title" style={{ color: themeColors?.text }}>
        关于技术需求智能对接系统
      </h3>

      <div className="version-form" style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
        borderRadius: '12px'
      }}>
        <div className="form-item">
          <label style={{ color: themeColors?.textSecondary }}>当前版本号：</label>
          <input
            type="text"
            value={editVersion}
            onChange={(e) => setEditVersion(e.target.value)}
            placeholder="如v1.0.1"
            className="version-input"
            style={{
              backgroundColor: themeColors?.background,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`
            }}
          />
        </div>

        <div className="form-item">
          <label style={{ color: themeColors?.textSecondary }}>更新说明：</label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="输入版本更新说明"
            rows={3}
            className="version-textarea"
            style={{
              backgroundColor: themeColors?.background,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`
            }}
          />
        </div>

        <div className="form-item">
          <label style={{ color: themeColors?.textSecondary }}>最后更新时间：</label>
          <span className="readonly-text" style={{ color: themeColors?.text }}>
            {latestUpdateTime}
          </span>
        </div>

        <button
          className="save-btn"
          onClick={handleSave}
          style={{
            backgroundColor: themeColors?.primary,
            color: '#fff'
          }}
        >
          保存版本信息
        </button>
      </div>

      <div className="about-hint" style={{ color: themeColors?.textHint }}>
        注：修改版本号后，系统底部的版本显示会自动同步更新
      </div>
    </div>
  );
};

export default AboutSettings;
