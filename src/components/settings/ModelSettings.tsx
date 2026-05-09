/**
 * 模型设置页面：设置全局默认模型、配置API密钥/地址
 */

import { useState } from 'react';
import { useGlobalModelConfig, ModelType } from '@/config/modelConfig';
import { themes, useThemeStore } from '@/store/themeStore';

export function ModelSettings() {
  const { modelConfigs, setDefaultModel, getDefaultModel, updateModelConfig } = useGlobalModelConfig();
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const [editingKey, setEditingKey] = useState<string>('');
  const [editingUrl, setEditingUrl] = useState<string>('');
  const [editingVersion, setEditingVersion] = useState<string>('');

  const defaultModel = getDefaultModel();

  // 保存模型配置
  const handleSave = (modelType: ModelType) => {
    const updates: { apiKey?: string; apiUrl?: string; modelVersion?: string } = {};

    if (editingKey !== '') {
      updates.apiKey = editingKey;
      setEditingKey('');
    }
    if (editingUrl !== '') {
      updates.apiUrl = editingUrl;
      setEditingUrl('');
    }
    if (editingVersion !== '') {
      updates.modelVersion = editingVersion;
      setEditingVersion('');
    }

    if (Object.keys(updates).length > 0) {
      updateModelConfig(modelType, updates);
    }
  };

  // 开始编辑
  const handleEdit = (config: typeof modelConfigs[0]) => {
    setEditingKey(config.apiKey);
    setEditingUrl(config.apiUrl);
    setEditingVersion(config.modelVersion);
  };

  return (
    <div
      className="model-settings-container"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <h3 style={{ color: themeColors?.text, marginBottom: '20px' }}>
        大模型配置
      </h3>

      {/* 当前默认模型提示 */}
      <div
        className="default-model-hint"
        style={{
          backgroundColor: themeColors?.surfaceHover,
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          color: themeColors?.textSecondary,
          fontSize: '14px',
        }}
      >
        当前默认模型：<span style={{ color: themeColors?.primary, fontWeight: 'bold' }}>{defaultModel.model}</span>
        （{defaultModel.modelVersion || '未设置版本'})
      </div>

      <div className="model-config-list">
        {modelConfigs
          .filter(config => config.model !== '默认')
          .map(config => (
            <div
              key={config.model}
              className="model-config-item"
              style={{
                backgroundColor: themeColors?.surfaceHover,
                border: `1px solid ${themeColors?.border}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div className="model-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="model-name" style={{ fontSize: '16px', fontWeight: 'bold', color: themeColors?.text }}>
                  {config.model}
                </span>
                <label className="default-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.isDefault}
                    onChange={() => setDefaultModel(config.model)}
                    style={{ width: '16px', height: '16px', accentColor: themeColors?.primary }}
                  />
                  <span style={{ color: themeColors?.textSecondary, fontSize: '14px' }}>设为默认模型</span>
                </label>
              </div>

              <div className="model-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ width: '80px', color: themeColors?.textSecondary, fontSize: '14px' }}>API密钥：</label>
                  <input
                    type="password"
                    value={editingKey !== '' ? editingKey : config.apiKey}
                    onChange={(e) => setEditingKey(e.target.value)}
                    onFocus={() => handleEdit(config)}
                    placeholder={`输入${config.model} API密钥`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: `1px solid ${themeColors?.border}`,
                      borderRadius: '4px',
                      backgroundColor: themeColors?.surface,
                      color: themeColors?.text,
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div className="form-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ width: '80px', color: themeColors?.textSecondary, fontSize: '14px' }}>接口地址：</label>
                  <input
                    type="text"
                    value={editingUrl !== '' ? editingUrl : config.apiUrl}
                    onChange={(e) => setEditingUrl(e.target.value)}
                    onFocus={() => handleEdit(config)}
                    placeholder={`输入${config.model} API地址`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: `1px solid ${themeColors?.border}`,
                      borderRadius: '4px',
                      backgroundColor: themeColors?.surface,
                      color: themeColors?.text,
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div className="form-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ width: '80px', color: themeColors?.textSecondary, fontSize: '14px' }}>模型版本：</label>
                  <input
                    type="text"
                    value={editingVersion !== '' ? editingVersion : config.modelVersion}
                    onChange={(e) => setEditingVersion(e.target.value)}
                    onFocus={() => handleEdit(config)}
                    placeholder={`输入${config.model} 模型版本`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: `1px solid ${themeColors?.border}`,
                      borderRadius: '4px',
                      backgroundColor: themeColors?.surface,
                      color: themeColors?.text,
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => handleSave(config.model)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: themeColors?.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="settings-hint" style={{ color: themeColors?.textHint, fontSize: '12px', marginTop: '16px' }}>
        注：设置「默认模型」后，系统所有界面将默认使用该模型的API配置
      </div>
    </div>
  );
}

export default ModelSettings;
