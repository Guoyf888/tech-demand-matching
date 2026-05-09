# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.60.0] - 2026-04-30

### Changed

#### UI优化 - 简化顶部导航
- **左侧导航栏** - 移除"AI对话"独立入口，首页即为AI对话
- **顶部Tab栏** - 移除AI对话、Hermes、智能Agent、AI技术经理人、Claude终端的顶部Tab
- **底部模式切换** - 整合为5个小按钮，移至输入框上方，更紧凑直观

### Previous Versions

## [1.1.0] - 2026-04-30

### Added

#### 智能Agent系统 (Smart Agent Mode)
- **HermesSkillsService**: 融合hermes-agent-main (v0.11.0) 技能系统
  - 支持Hermes SKILL.md格式 (YAML frontmatter)
  - 支持OpenClaw SKILL.md格式
  - Slash命令调用 (/skill-name)
  - 渐进式披露架构
  - 外部技能目录扩展

- **TechMatchAgent**: 技术需求/成果/团队智能匹配系统
  - `analyzeDemand()` - 技术需求深度分析
  - `analyzeTechResult()` - 技术成果评估分析
  - `performMatching()` - 需求-成果智能双向匹配
  - `matchTeam()` - 技术团队智能匹配

- **智能Agent对话模式** (AIAgentChat)
  - 新增"智能Agent" Tab
  - 🔍 需求分析 - 深度分析技术需求
  - 🔬 成果分析 - 评估技术成果价值
  - 🤝 智能匹配 - 需求-成果双向匹配
  - 👥 团队匹配 - 匹配合适团队

#### Hermes Agent核心技能
| 技能名称 | 功能 |
|---------|------|
| `baoyu-comic` | 知识漫画生成器 |
| `baoyu-infographic` | 信息图表生成器 |
| `tech-demand-analysis` | 技术需求深度分析 |
| `tech-result-analysis` | 技术成果评估分析 |
| `demand-result-matching` | 需求-成果双向匹配 |
| `policy-qa` | 政策智能问答 |
| `industry-chain-analysis` | 产业链结构分析 |

### Changed

- **AIAgentChat.tsx**: 新增智能Agent模式Tab，集成TechMatchAgent
- **HermesAgent.ts**: 扩展工具调度能力，支持技能智能路由
- **package.json**: 版本升级到1.1.0

### Technical Details

- Frontend: React 18 + TypeScript + Vite
- Desktop: Tauri v2
- AI Integration: Claude API + Hermes Agent
- Skill System: Hermes Skills (v0.11.0) + OpenClaw

---

## [1.0.5] - 2026-04-29

### Added
- AI技术经理人模式 (tech-brain)
- 政策智能问答服务
- 产业链分析服务
- 企业技术预测服务
- VSCode风格导航主题

### Changed
- 优化API错误处理
- 修复TypeScript编译错误

---

## [1.0.0] - Initial Release

### Features
- 技术需求管理
- 技术成果管理
- 智能匹配系统
- AI对话助手
- Claude Code终端集成
- OpenClaw技能系统
