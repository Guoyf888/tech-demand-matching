import versionLog from '../../../version_log.json';
import { useThemeColors } from '@/store/themeStore';
import { HERMES_SOURCE_INFO } from '@/services/hermes/version';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Cpu,
  Info,
  PackageCheck,
} from 'lucide-react';
import './AboutSettings.css';

interface VersionEntry {
  version: string;
  update_time: string;
  content: string[];
}

const formatDate = (value: string) => value.split(' ')[0] || value;

const AboutSettings = () => {
  const themeColors = useThemeColors();
  const versions = versionLog as VersionEntry[];
  const latest = versions[0];

  return (
    <section
      className="about-settings-container"
      style={{
        backgroundColor: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <div className="about-heading">
        <span
          className="about-heading-icon"
          style={{ color: themeColors.primary, backgroundColor: themeColors.primaryLight }}
        >
          <Info size={19} aria-hidden="true" />
        </span>
        <div className="about-heading-copy">
          <h3 style={{ color: themeColors.text }}>关于系统</h3>
          <p style={{ color: themeColors.textSecondary }}>AI技术经理人</p>
        </div>
        <span
          className="about-status"
          style={{ color: themeColors.success, backgroundColor: themeColors.successLight }}
        >
          <span className="about-status-dot" style={{ backgroundColor: themeColors.success }} />
          运行正常
        </span>
      </div>

      <div className="about-facts" style={{ borderColor: themeColors.border }}>
        <div className="about-fact">
          <PackageCheck size={17} style={{ color: themeColors.primary }} aria-hidden="true" />
          <span style={{ color: themeColors.textHint }}>应用版本</span>
          <strong style={{ color: themeColors.text }}>{latest?.version || 'v2.1.7'}</strong>
        </div>
        <div className="about-fact">
          <CalendarDays size={17} style={{ color: themeColors.primary }} aria-hidden="true" />
          <span style={{ color: themeColors.textHint }}>更新日期</span>
          <strong style={{ color: themeColors.text }}>{formatDate(latest?.update_time || '')}</strong>
        </div>
        <div className="about-fact">
          <Cpu size={17} style={{ color: themeColors.primary }} aria-hidden="true" />
          <span style={{ color: themeColors.textHint }}>Hermes 兼容协议</span>
          <strong style={{ color: themeColors.text }}>v{HERMES_SOURCE_INFO.compatibilityVersion}</strong>
        </div>
      </div>

      <div
        className="hermes-integration"
        style={{ backgroundColor: themeColors.backgroundAlt, borderColor: themeColors.border }}
      >
        <div className="hermes-summary">
          <span
            className="hermes-agent-icon"
            style={{ color: themeColors.primary, backgroundColor: themeColors.surface }}
          >
            <Bot size={22} aria-hidden="true" />
          </span>
          <div>
            <h4 style={{ color: themeColors.text }}>Hermes TypeScript 适配层</h4>
            <p style={{ color: themeColors.textSecondary }}>
              {HERMES_SOURCE_INFO.integration}
              {' · '}已评估上游 v{HERMES_SOURCE_INFO.reviewedUpstreamVersion}
              {' · '}{HERMES_SOURCE_INFO.reviewedReleaseDate}
            </p>
          </div>
          <span
            className="hermes-integrated-badge"
            style={{ color: themeColors.primary, backgroundColor: themeColors.primaryLight }}
          >
            项目适配层
          </span>
        </div>

        <div className="hermes-capabilities">
          {HERMES_SOURCE_INFO.capabilities.map((capability) => (
            <span key={capability} style={{ color: themeColors.textSecondary }}>
              <CheckCircle2 size={14} style={{ color: themeColors.success }} aria-hidden="true" />
              {capability}
            </span>
          ))}
        </div>
      </div>

      {latest?.content?.length > 0 && (
        <details className="release-notes" style={{ borderColor: themeColors.border }}>
          <summary style={{ color: themeColors.text }}>查看 {latest.version} 更新记录</summary>
          <ul style={{ color: themeColors.textSecondary }}>
            {latest.content.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
};

export default AboutSettings;
