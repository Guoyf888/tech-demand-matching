# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-05-18

### Added

- **小米MiMo大模型接入** - 新增Provider类型`mimo`，OpenAI兼容格式，支持MiMo-7B等模型
- **商汤日日新SenseNova大模型接入** - 新增Provider类型`sensenova`，OpenAI兼容格式，支持SenseChat-5等模型
- **侧边栏导航扩展** - 需求广场、成果广场、合作管理、技能市场四个新导航入口
- **结构化需求维度标签** - 需求输入新增预算范围、时间要求、合作方式选择，自动注入需求上下文
- **分析报告可视化增强** - 行业热度进度条、技术研发路线里程碑步骤、创新建议优先级标签
- **科技成果分析概览** - 创新性评分环形图、TRL技术成熟度阶梯指示器、市场价值评分环形图
- **建议转化路径** - 成果详情新增技术转让/许可授权/合作研发三种转化路径建议
- **智能匹配面板统计** - 顶部显示技术需求/科技成果/匹配结果三个统计卡片
- **匹配进度条** - 匹配执行时显示动态进度条
- **匹配结果筛选** - 支持按最低匹配度筛选（全部/50%+/60%+/70%+/80%+）
- **匹配等级标签** - 优秀(≥85)/良好(≥70)/一般(≥50)三级颜色标识
- **匹配合作建议** - 每个匹配结果自动推荐合作方式（技术转让/许可/研发/咨询）
- **匹配关键词高亮** - 自动提取需求与成果的共同关键词并高亮展示

### Changed

- **设置面板** - 模型提供商从9个扩展到11个，网格布局从3列改为4列
- **版本号统一升级至v1.8.0** - package.json / tauri.conf.json / Cargo.toml 同步更新

## [1.7.0] - 2026-05-18

### Security

- **API Key 存储加密** - apiStore 和 searchConfigStore 的 localStorage 数据改为 XOR+Base64 编码存储，不再明文保存
- **文件上传安全校验** - documentParser 新增 10MB 大小限制 + magic bytes 校验（DOCX 验证 PK 签名，PDF 验证 %PDF 头）
- **Tavily API Key 改用 Header 传输** - 从请求体移到 Authorization: Bearer header，避免密钥出现在服务器日志
- **Prompt 注入防护** - matching.ts 对用户输入进行过滤和截断，防止通过需求/成果内容注入恶意指令
- **AI 输出 Schema 校验** - matching.ts 新增 parseMatchResponse 校验 score 范围(0-100)和类型，拒绝异常返回
- **生产环境移除 console.log** - gateway.ts 的 API 请求日志仅在 dev 模式输出

### Performance

- **路由级代码分割** - App.tsx 全部 9 个页面改为 React.lazy + Suspense 懒加载
- **大依赖动态导入** - mammoth 和 pdf-parse 改为按需 import()，初始加载体积显著降低
- **AIAgentChat 组件优化** - 提取 memo 化 MessageItem 子组件，scrollToBottom 改为 useCallback
- **匹配算法并发优化** - 从 O(N*M) 串行改为 5 并发 + 关键词预过滤 + 30s 超时
- **Vite 构建优化** - 新增 manualChunks 分离 vendor(React/Router) 和 icons(lucide-react)

### Changed

- **.gitignore 补全** - 添加 393MB 子项目目录(claude-code-source-main/hermes-agent-main/openclaw-main/src-tauri/claude-code)和 .env 等条目
- **代码卫生** - 删除空目录 src/hooks/ 和 src/services/api/providers/，src/utils/ 新增 encryptedStorage.ts
- **版本号统一升级至 v1.7.0** - package.json / tauri.conf.json / Cargo.toml 同步更新

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
