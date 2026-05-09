import { useState, useEffect, useRef } from 'react';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { skillStore } from '@/services/skills/skillStore';
import { Skill } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';
import { importSkillsFromZip, skillStorage } from '@/services/hermes/skillManager';
import { getOpenClawService } from '@/services/openclaw/OpenClawService';
import { parseSkillFile, validateSkillFile, generateSampleSkillFile } from '@/services/skills/SkillFileParser';

/**
 * 格式化文件预览内容，根据文件类型进行美化展示
 */
function formatFilePreview(content: string, _fileName: string): { html: string; isBinary: boolean } {
  const trimmed = content.trim();
  const isJson = trimmed.startsWith('{') && trimmed.endsWith('}');
  const isMarkdown = trimmed.startsWith('---') || trimmed.includes('```');

  // 检查是否为二进制内容（包含大量不可打印字符）
  const nonPrintableRatio = [...content].filter(c => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\r' && c !== '\t').length / content.length;
  if (nonPrintableRatio > 0.1) {
    return { html: '', isBinary: true };
  }

  // 限制预览长度
  const preview = content.slice(0, 800);
  const truncated = content.length > 800;

  if (isJson) {
    try {
      // 尝试格式化JSON
      const parsed = JSON.parse(trimmed);
      const formatted = JSON.stringify(parsed, null, 2);
      const displayContent = formatted.slice(0, 800) + (formatted.length > 800 ? '\n\n... (内容已截断)' : '');
      return {
        html: `<pre class="text-xs overflow-x-auto whitespace-pre-wrap" style="color: #333;">${escapeHtml(displayContent)}</pre>`,
        isBinary: false
      };
    } catch {
      // JSON格式错误，直接显示原文本
      return {
        html: `<pre class="text-xs overflow-x-auto whitespace-pre-wrap" style="color: #333;">${escapeHtml(preview)}${truncated ? '\n\n... (内容已截断)' : ''}</pre>`,
        isBinary: false
      };
    }
  }

  if (isMarkdown) {
    // Markdown格式，简单转义显示
    return {
      html: `<pre class="text-xs overflow-x-auto whitespace-pre-wrap" style="color: #333; line-height: 1.6;">${escapeHtml(preview)}${truncated ? '\n\n... (内容已截断)' : ''}</pre>`,
      isBinary: false
    };
  }

  // 普通文本
  return {
    html: `<pre class="text-xs overflow-x-auto whitespace-pre-wrap" style="color: #333;">${escapeHtml(preview)}${truncated ? '\n\n... (内容已截断)' : ''}</pre>`,
    isBinary: false
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('全部');
  const [isImporting, setIsImporting] = useState(false);
  const [skillParseError, setSkillParseError] = useState<string | null>(null);
  const [skillParseSuccess, setSkillParseSuccess] = useState<Skill | null>(null);
  const [filePreview, setFilePreview] = useState<{ html: string; isBinary: boolean } | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [detectWarning, setDetectWarning] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<Skill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  useEffect(() => {
    const builtIn = getBuiltInSkills();
    const custom = skillStorage.getAll();
    const openClaw = getOpenClawService().getAllSkills();
    const allSkills = [...builtIn];

    for (const skill of openClaw) {
      if (!allSkills.find(s => s.name === skill.name)) {
        allSkills.push(skill);
      }
    }

    for (const skill of custom) {
      if (!allSkills.find(s => s.name === skill.name)) {
        allSkills.push(skill);
      }
    }

    setSkills(allSkills);
  }, []);

  const handleDeleteSkill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (skill?.isBuiltIn) {
      alert('内置技能不能删除');
      return;
    }
    skillStore.delete(skillId);
    setSkills(skills.filter((s) => s.id !== skillId));
  };

  const handleTogglePin = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    const updatedSkill = { ...skill, pinned: !skill.pinned };
    skillStore.save(updatedSkill);
    setSkills(skills.map((s) => (s.id === skillId ? updatedSkill : s)));
  };

  const handleChangeGroup = (skillId: string, newGroup: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    const updatedSkill = { ...skill, group: newGroup || undefined };
    skillStore.save(updatedSkill);
    setSkills(skills.map((s) => (s.id === skillId ? updatedSkill : s)));
  };

  const handleToggleEnabled = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    const updatedSkill = { ...skill, enabled: !skill.enabled };
    skillStore.save(updatedSkill);
    setSkills(skills.map((s) => (s.id === skillId ? updatedSkill : s)));
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('请上传 ZIP 文件');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { imported, failed } = await importSkillsFromZip(arrayBuffer);

      if (imported.length === 0 && failed.length > 0) {
        alert(`导入失败：未找到有效的技能配置文件。\n请确保ZIP包含 skill.json、manifest.json 或 SKILL.md 文件。`);
      } else {
        skillStorage.saveAll(imported);

        setSkills(prev => {
          const merged = [...prev];
          for (const skill of imported) {
            if (!merged.find(s => s.name === skill.name)) {
              merged.push(skill);
            }
          }
          return merged;
        });

        setImportResult({ success: imported.length, failed: failed.length });

        if (failed.length > 0) {
          setTimeout(() => {
            alert(`成功导入 ${imported.length} 个技能。\n${failed.length} 个文件解析失败。`);
          }, 100);
        } else {
          setTimeout(() => {
            alert(`成功导入 ${imported.length} 个技能！`);
          }, 100);
        }
      }

      setShowUploadModal(false);
    } catch (error: any) {
      alert(`导入失败: ${error.message}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const detectFileExtension = (fileName: string): { ext: string; detectedName: string } => {
    const name = fileName.split(/[/\\]/).pop() || fileName;
    const lowerName = name.toLowerCase();

    if (lowerName.endsWith('.skill.json')) return { ext: 'skill.json', detectedName: name };
    if (lowerName.endsWith('.skill.md')) return { ext: 'skill.md', detectedName: name };
    if (lowerName.endsWith('.skill')) return { ext: 'skill', detectedName: name };
    if (lowerName.endsWith('.json')) return { ext: 'json', detectedName: name };
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) return { ext: 'md', detectedName: name };

    return { ext: 'unknown', detectedName: name };
  };

  const validateExtensionContentMatch = (ext: string, content: string): { valid: boolean; warning?: string } => {
    const trimmed = content.trim();
    const isJsonContent = trimmed.startsWith('{') && trimmed.endsWith('}');
    const isFrontmatterContent = trimmed.startsWith('---');

    if (ext === 'md' && isJsonContent) {
      return { valid: true, warning: '提示：文件扩展名为.md，但内容看起来像JSON格式，已自动按JSON处理' };
    }
    if (ext === 'json' && isFrontmatterContent) {
      return { valid: true, warning: '提示：文件扩展名为.json，但内容看起来像Markdown格式，已自动按Markdown处理' };
    }

    return { valid: true };
  };

  const handleSkillFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSkillParseError(null);
    setSkillParseSuccess(null);
    setDetectWarning(null);
    setFilePreview(null);
    setCurrentFileName(file.name);

    const { ext, detectedName } = detectFileExtension(file.name);

    if (ext === 'unknown') {
      try {
        const content = await file.text();
        const preview = formatFilePreview(content, file.name);
        setFilePreview(preview);

        const validateResult = validateSkillFile(content);
        if (!validateResult.success) {
          setSkillParseError(`无法识别的文件格式。扩展名 "${detectedName}" 不在支持列表中。\n\n支持格式：.skill、.skill.json、.skill.md、.json、.md\n\n如果您的文件是有效的技能配置文件，请将其重命名为正确的扩展名。`);
          return;
        }

        const parseResult = parseSkillFile(detectedName, content);
        if (parseResult.success) {
          setDetectWarning(`文件格式有效，但扩展名 "${detectedName}" 不标准。建议重命名为标准扩展名以避免潜在问题。`);
          setSkillParseSuccess(parseResult.data!);
        } else {
          setSkillParseError(`文件验证通过但解析失败：${parseResult.error}`);
        }
        return;
      } catch (error: any) {
        setSkillParseError(`读取文件失败：${error.message}`);
        return;
      }
    }

    let content: string;
    try {
      content = await file.text();
    } catch (error: any) {
      setSkillParseError(`读取文件失败：${error.message}`);
      return;
    }

    // 格式化预览内容
    const preview = formatFilePreview(content, file.name);
    if (preview.isBinary) {
      setFilePreview({ html: '<div class="text-sm text-gray-500">此文件为二进制格式，无法预览</div>', isBinary: true });
    } else {
      setFilePreview(preview);
    }

    const matchResult = validateExtensionContentMatch(ext, content);
    if (matchResult.warning) {
      setDetectWarning(matchResult.warning);
    }

    setIsImporting(true);

    try {
      const validateResult = validateSkillFile(content);
      if (!validateResult.success) {
        let errorMsg = validateResult.error || '未知验证错误';

        if (content.trim().startsWith('{')) {
          errorMsg = `JSON格式错误：\n${errorMsg}\n\n请检查：\n- 引号是否正确闭合\n- 逗号位置是否正确\n- 括号是否匹配`;
        } else if (content.trim().startsWith('---')) {
          errorMsg = `Markdown/Frontmatter格式错误：\n${errorMsg}\n\n请检查：\n- 是否以 --- 开头和结尾\n- 键值对格式是否正确`;
        }

        setSkillParseError(errorMsg);
        return;
      }

      const parseResult = parseSkillFile(detectedName, content);
      if (!parseResult.success) {
        let errorMsg = parseResult.error || '未知解析错误';

        if (errorMsg.includes('JSON')) {
          errorMsg = `JSON语法错误：\n${errorMsg}\n\n常见问题：\n- 尾部多余逗号（如 "key": "value", }）\n- 单引号应用双引号替换\n- 注释不允许在JSON中`;
        } else if (errorMsg.includes('名称')) {
          errorMsg = `必填字段缺失：\n${errorMsg}\n\n请确保文件包含：\n- name: 技能名称\n- description: 技能描述`;
        }

        setSkillParseError(errorMsg);
        return;
      }

      if (parseResult.warnings && parseResult.warnings.length > 0) {
        setDetectWarning(parseResult.warnings.join('\n'));
      }

      setSkillParseSuccess(parseResult.data!);

    } catch (error: any) {
      setSkillParseError(`处理文件时发生错误：${error.message}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleConfirmSkillImport = () => {
    if (!skillParseSuccess) return;

    const exists = skills.find(s => s.name === skillParseSuccess.name);
    if (exists) {
      setSkillParseError(`技能 "${skillParseSuccess.name}" 已存在，请先删除或重命名后再试。`);
      return;
    }

    skillStore.save(skillParseSuccess);
    setSkills(prev => [...prev, skillParseSuccess]);

    const importedSkill = skillParseSuccess;
    setSkillParseSuccess(null);
    setSkillParseError(null);
    setDetectWarning(null);
    setFilePreview(null);
    setShowUploadModal(false);
    setShowSuccessModal(importedSkill);
  };

  const handleDownloadSampleSkillFile = () => {
    const sample = generateSampleSkillFile();
    const blob = new Blob([sample], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-skill.skill.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSkillParseError(null);
    setSkillParseSuccess(null);
    setDetectWarning(null);
    setFilePreview(null);
    setCurrentFileName('');
  };

  const groupedSkills = {
    '内置技能': skills.filter(s => s.isBuiltIn && ['内置', '分析类', '工具类', '资源类'].includes(s.group || '')),
    '分析类': skills.filter(s => ['find-skills', 'summarize', 'deep-research', '数据分析'].includes(s.name)),
    '开发工具': skills.filter(s => ['Skill Creator', '代码助手', '智能搜索', 'coding-agent', 'github'].includes(s.name)),
    'OpenClaw': skills.filter(s => s.source === 'openclaw'),
  };

  const groups = ['全部', '内置', '自定义', ...new Set(skills.filter((s) => s.group && !['内置', '自定义'].includes(s.group)).map((s) => s.group!))];

  const filteredSkills = selectedGroup === '全部'
    ? skills
    : selectedGroup === '自定义'
      ? skills.filter((s) => !s.isBuiltIn && !s.group)
      : skills.filter((s) => s.group === selectedGroup);

  const sortedSkills = [...filteredSkills].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: themeColors?.text }}>技能市场</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:shadow-md"
          style={{ backgroundColor: themeColors?.primary }}
        >
          + 上传技能
        </button>
      </div>

      {/* Group Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: selectedGroup === group ? themeColors?.primary : themeColors?.primaryLight,
              color: selectedGroup === group ? '#fff' : themeColors?.primary,
            }}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="space-y-6">
        {selectedGroup === '全部' && Object.entries(groupedSkills).map(([category, categorySkills]) => (
          categorySkills.length > 0 && (
            <div key={category}>
              <div className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: themeColors?.text }}>
                <span>{category}</span>
                <span className="flex-1 h-px" style={{ backgroundColor: themeColors?.border }}></span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {categorySkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-xl p-4 transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: themeColors?.surface,
                      border: `1px solid ${themeColors?.border}`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{skill.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium" style={{ color: themeColors?.text }}>{skill.name}</h4>
                            {skill.pinned && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: themeColors?.primary, color: '#fff' }}>
                                置顶
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-1" style={{ color: themeColors?.textHint }}>{skill.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleEnabled(skill.id)}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-95"
                        style={{
                          backgroundColor: skill.enabled ? themeColors?.success + '20' : themeColors?.surfaceHover,
                          color: skill.enabled ? themeColors?.success : themeColors?.textHint,
                        }}
                      >
                        {skill.enabled ? '已启用' : '已禁用'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-3 pt-3" style={{ color: themeColors?.textHint, borderTop: `1px solid ${themeColors?.border}` }}>
                      <span>v{skill.version}</span>
                      <span>·</span>
                      <span>使用 {skill.metadata.usageCount} 次</span>
                      <span>·</span>
                      <span>成功率 {skill.metadata.successRate}%</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleTogglePin(skill.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: themeColors?.primaryLight,
                          color: themeColors?.primary,
                        }}
                      >
                        {skill.pinned ? '取消置顶' : '置顶'}
                      </button>
                      <select
                        value={skill.group || ''}
                        onChange={(e) => handleChangeGroup(skill.id, e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs border"
                        style={{
                          backgroundColor: themeColors?.surface,
                          borderColor: themeColors?.border,
                          color: themeColors?.text,
                        }}
                      >
                        <option value="">无分组</option>
                        <option value="分析类">分析类</option>
                        <option value="工具类">工具类</option>
                        <option value="资源类">资源类</option>
                      </select>
                      {!skill.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-95"
                          style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}

        {/* Custom/Ungrouped Skills */}
        {selectedGroup !== '全部' && sortedSkills.map((skill) => (
          <div
            key={skill.id}
            className="rounded-xl p-4 transition-all hover:shadow-lg"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{skill.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium" style={{ color: themeColors?.text }}>{skill.name}</h4>
                    {skill.pinned && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: themeColors?.primary, color: '#fff' }}>
                        置顶
                      </span>
                    )}
                    {skill.isBuiltIn && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: themeColors?.primaryLight, color: themeColors?.primary }}>
                        内置
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: themeColors?.textHint }}>{skill.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleEnabled(skill.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-95"
                style={{
                  backgroundColor: skill.enabled ? themeColors?.success + '20' : themeColors?.surfaceHover,
                  color: skill.enabled ? themeColors?.success : themeColors?.textHint,
                }}
              >
                {skill.enabled ? '已启用' : '已禁用'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs mt-3 pt-3" style={{ color: themeColors?.textHint, borderTop: `1px solid ${themeColors?.border}` }}>
              <span>v{skill.version}</span>
              <span>·</span>
              <span>使用 {skill.metadata.usageCount} 次</span>
              <span>·</span>
              <span>成功率 {skill.metadata.successRate}%</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleTogglePin(skill.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: themeColors?.primaryLight,
                  color: themeColors?.primary,
                }}
              >
                {skill.pinned ? '取消置顶' : '置顶'}
              </button>
              <select
                value={skill.group || ''}
                onChange={(e) => handleChangeGroup(skill.id, e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs border"
                style={{
                  backgroundColor: themeColors?.surface,
                  borderColor: themeColors?.border,
                  color: themeColors?.text,
                }}
              >
                <option value="">无分组</option>
                <option value="分析类">分析类</option>
                <option value="工具类">工具类</option>
                <option value="资源类">资源类</option>
              </select>
              {!skill.isBuiltIn && (
                <button
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-95"
                  style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div
            className="w-[520px] max-h-[85vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-scale-in"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E8E8' }}>
              <h3 className="text-lg font-bold" style={{ color: '#333333' }}>上传技能文件</h3>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-gray-100"
                style={{ color: '#666666' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* File Upload Area */}
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4"
                style={{
                  borderColor: skillParseError ? '#FF4D4F' : '#1677FF',
                  backgroundColor: skillParseError ? '#FFF5F5' : '#FAFBFF',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isImporting ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full" style={{ backgroundColor: '#E6F4FF' }} />
                    <div className="text-sm" style={{ color: '#666666' }}>正在解析技能文件...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-3">📤</div>
                    <div className="font-medium mb-1" style={{ color: '#333333' }}>点击选择 .skill 文件</div>
                    <div className="text-sm" style={{ color: '#666666' }}>
                      支持 .skill、.skill.json、.skill.md、.json、.md 格式
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="skill-upload"
                  type="file"
                  className="hidden"
                  accept=".skill,.skill.json,.skill.md,.json,.md,.markdown"
                  onChange={handleSkillFileUpload}
                  disabled={isImporting}
                />
              </div>

              {/* Uploaded File Name */}
              {currentFileName && !skillParseSuccess && !skillParseError && (
                <div className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#F5F7FA' }}>
                  <span className="text-lg">📄</span>
                  <span className="text-sm font-medium" style={{ color: '#333333' }}>{currentFileName}</span>
                </div>
              )}

              {/* Warning Display */}
              {detectWarning && (
                <div
                  className="mb-4 p-3 rounded-lg flex items-start gap-2"
                  style={{ backgroundColor: '#FFFBE6', border: '1px solid #FFE58F' }}
                >
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <div>
                    <p className="font-medium text-amber-700 text-sm">温馨提示</p>
                    <p className="text-sm text-amber-600 mt-1">{detectWarning}</p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {skillParseError && (
                <div
                  className="mb-4 p-4 rounded-xl"
                  style={{ backgroundColor: '#FFF1F0', border: '1px solid #FFCCC7' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">❌</span>
                    <div className="flex-1">
                      <p className="font-semibold text-red-600">导入失败</p>
                      <p className="text-sm text-red-500 mt-2 whitespace-pre-line">{skillParseError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Preview */}
              {skillParseSuccess && (
                <div
                  className="mb-4 p-5 rounded-xl"
                  style={{ backgroundColor: '#F0F5FF', border: '1px solid #ADC6FF' }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{skillParseSuccess.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg" style={{ color: '#333333' }}>{skillParseSuccess.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#1677FF', color: '#fff' }}>
                          v{skillParseSuccess.version}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#666666' }}>{skillParseSuccess.description}</p>

                      {skillParseSuccess.triggers && skillParseSuccess.triggers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {skillParseSuccess.triggers.slice(0, 5).map((t, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ backgroundColor: '#fff', color: '#666666', border: '1px solid #E8E8E8' }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleConfirmSkillImport}
                        className="w-full mt-4 py-2.5 rounded-xl font-semibold text-white transition-all hover:shadow-md"
                        style={{ backgroundColor: '#1677FF' }}
                      >
                        确认导入此技能
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Preview */}
              {filePreview && !filePreview.isBinary && !skillParseSuccess && !skillParseError && (
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2" style={{ color: '#999999' }}>文件内容预览：</p>
                  <div
                    className="p-3 rounded-lg overflow-x-auto"
                    style={{ backgroundColor: '#F5F7FA', border: '1px solid #E8E8E8' }}
                    dangerouslySetInnerHTML={{ __html: filePreview.html }}
                  />
                </div>
              )}

              {filePreview && filePreview.isBinary && !skillParseSuccess && !skillParseError && (
                <div className="mt-4 p-4 rounded-lg text-center" style={{ backgroundColor: '#F5F7FA' }}>
                  <span className="text-2xl">📦</span>
                  <p className="text-sm mt-2" style={{ color: '#666666' }}>此文件为二进制格式，无法预览</p>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ backgroundColor: '#E8E8E8' }}></div>
                <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#F5F7FA', color: '#999999' }}>或</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E8E8E8' }}></div>
              </div>

              {/* ZIP Upload Section */}
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:shadow-md"
                style={{ borderColor: '#E8E8E8' }}
                onClick={() => document.getElementById('zip-upload')?.click()}
              >
                <div className="text-4xl mb-2">📦</div>
                <div className="font-medium mb-1" style={{ color: '#333333' }}>批量导入 ZIP 文件</div>
                <div className="text-sm" style={{ color: '#666666' }}>
                  包含多个 SKILL.md 或 skill.json 的压缩包
                </div>
                <input
                  id="zip-upload"
                  type="file"
                  className="hidden"
                  accept=".zip"
                  onChange={handleZipUpload}
                  disabled={isImporting}
                />
              </div>

              {/* Supported Formats */}
              <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: '#FAFBFF' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#333333' }}>支持的格式：</p>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#666666' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#E6F4FF', color: '#1677FF' }}>.skill</span>
                    <span>标准技能文件</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#E6F4FF', color: '#1677FF' }}>.json</span>
                    <span>JSON格式</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#E6F4FF', color: '#1677FF' }}>.md</span>
                    <span>Markdown格式</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: '#E6F4FF', color: '#1677FF' }}>.zip</span>
                    <span>批量导入</span>
                  </div>
                </div>
              </div>

              {/* Download Sample */}
              <button
                onClick={handleDownloadSampleSkillFile}
                className="w-full mt-4 py-2.5 rounded-xl font-medium transition-all hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#F5F7FA',
                  color: '#333333',
                  border: '1px solid #E8E8E8',
                }}
              >
                <span>📥</span>
                <span>下载示例 .skill.json 文件</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div
            className="w-[400px] rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Success Icon */}
            <div className="pt-8 pb-4 text-center" style={{ backgroundColor: '#F0F5FF' }}>
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#1677FF' }}
              >
                <span className="text-3xl text-white">✓</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h3 className="text-xl font-bold mb-2" style={{ color: '#333333' }}>技能导入成功！</h3>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="text-2xl">{showSuccessModal.icon}</span>
                <span className="font-medium" style={{ color: '#333333' }}>{showSuccessModal.name}</span>
              </div>
              <p className="text-sm mt-3" style={{ color: '#666666' }}>
                技能已成功导入并可以使用
              </p>
            </div>

            {/* Button */}
            <div className="p-4" style={{ borderTop: '1px solid #E8E8E8' }}>
              <button
                onClick={() => setShowSuccessModal(null)}
                className="w-full py-2.5 rounded-xl font-semibold text-white transition-all hover:shadow-md"
                style={{ backgroundColor: '#1677FF' }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}