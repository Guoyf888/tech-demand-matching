# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-09-05

### Added

- **专业匹配工作台** - 可选择单个已分析需求生成完整候选清单，集中完成研判与复核
- **四维解释评分** - 展示技术能力、应用场景、成熟条件和交付可行性，并保留综合理由
- **证据与风险卡片** - 分开展示匹配依据、待核实风险和建议下一步，材料不足时明确提示人工核验
- **人工复核闭环** - 支持待复核、认可进入对接、驳回三种结论及复核备注，按需求与成果组合持久化
- **历史批次回看** - 匹配运行记录保存需求、成果、评分和解释快照，可回看最近 50 个批次

### Changed

- **匹配范围控制** - 专业工作台按单个需求评估成果候选，并可查看低于默认阈值的有效结果
- **匹配提示词** - 要求模型仅依据材料输出结构化分项评分、依据、风险和下一步，不得补造事实
- **数据备份** - 人工复核记录纳入业务数据导出，继续排除 API 密钥
- **桌面测试版发布** - 使用 MSVC x64 与 NSIS 生成 Windows 安装程序及便携测试程序；本版本按计划不构建 Android APK
- **版本日志工具** - 支持通过 `--version` 明确登记跨次版本，避免只能递增补丁号
- **版本号同步** - package.json、package-lock.json、Cargo.toml、Cargo.lock、tauri.conf.json、versionConfig、关于页、README 与修改记录统一至 v2.2.0

## [2.1.7] - 2026-09-04

### Added

- **匹配运行审计** - 保存运行状态、起止时间、耗时、模型来源、候选数量、有效评估数、失败数和错误原因，最多保留最近 50 次
- **可信度回归测试** - 覆盖 API 未配置、候选评估失败、有效空结果、成果解析失败、业务数据备份和企业调查来源标记

### Fixed

- **匹配配置异步判断** - 正确等待 API 配置检查，未配置时不再继续发起候选评估
- **成果分析假完成** - 上传分析统一复用严格解析服务，缺少内容或 JSON 异常时写入失败状态，不再进入成果广场和匹配流程
- **匹配失败误报无结果** - 区分未配置、无候选、全部失败、部分完成和有效空结果，并在界面展示具体原因
- **备份键漂移** - 导出当前实际使用的技能、Hermes 会话记忆和匹配审计记录，移除失效技能键

### Changed

- **匹配进度真实性** - 移除随机生成的匹配百分比，改为不虚构进度的运行状态提示
- **企业调查来源提示** - 演示数据和联网失败在报告界面显式展示，避免空报告或模拟内容被误认为真实尽调
- **版本号同步** - package.json、package-lock.json、Cargo.toml、Cargo.lock、tauri.conf.json、versionConfig、页脚、关于页、README 与修改记录统一至 v2.1.7

## [2.1.6] - 2026-09-04

### Added

- **Hermes 工具循环回归测试** - 覆盖 LLM 失败、非法工具调用、普通代码块、工具超时、迭代上限与大结果截断场景
- **搜索结果来源标记** - 模拟搜索和企业调研结果显式标记为演示数据，调用方可通过 `isMock` 判断来源

### Fixed

- **Hermes 假成功状态** - LLM 调用失败、非法工具调用、工具超时和达到迭代上限时返回明确失败与退出原因
- **工具超时取消** - `AbortSignal` 从工具循环传递至 Claude API 和联网搜索请求，超时会主动取消可中断请求
- **工具结果截断不可见** - 发送给模型的长结果增加截断提示，同时执行记录保留完整输出
- **真实搜索静默降级** - Tavily 请求失败时不再自动返回模拟内容，避免把演示数据误认为联网结果
- **版本日志顺序** - 更新脚本从最新日志递增版本并将新记录插入首部，保持版本历史顺序一致

### Changed

- **Hermes 身份说明** - 设置页明确当前集成为项目内置 TypeScript 适配层，并分别展示兼容协议版本与已核对上游版本
- **版本号同步** - package.json、package-lock.json、Cargo.toml、Cargo.lock、tauri.conf.json、versionConfig、页脚、关于页、README 与修改记录统一至 v2.1.6

## [2.1.5] - 2026-07-29

### Added

- **草稿批量分析** - 我的需求和我的成果草稿页新增单选、全选和“一键提交分析”，批量任务按顺序执行并实时回写分析状态
- **统一草稿分析服务** - 复用现有行业标签和科研技能规则，兼容 OpenAI、Claude、Gemini 与通义响应格式

### Fixed

- **需求列表状态标题重叠** - 移除“全部”和“已分析”列表中多余的“已提交”分段行，避免遮挡首条需求
- **批量分析失败状态** - 单项失败不会中断后续草稿，错误信息会写回对应需求或成果

### Changed

- **版本号同步** - package.json、Cargo.toml、tauri.conf.json、versionConfig、页脚、关于页、README 与修改记录统一至 v2.1.5
- **发布产物归档** - Windows 安装程序、便携测试程序和 Android arm64 APK 统一存放到 `release/latest`，并在 `release/v2.1.5` 保留版本归档
- **发布前隐私核验** - 扫描 Web 前端资源、Windows 二进制文件及 APK 内全部条目，私人需求、成果标题和真实 API Key 格式均为 0 命中

## [2.1.4] - 2026-07-28

### Added

- **多条文档独立导入** - DOCX/PDF 中识别到的多项需求或成果会在确认后分别创建独立草稿，重复表头不会被误识别为内容
- **分组重命名** - 我的需求和我的成果支持直接重命名当前分组，并同步更新筛选与所有关联记录

### Fixed

- **Windows 安装器启动依赖** - Windows 发布固定使用 MSVC Rust 工具链，消除 GNU 构建对外置 `WebView2Loader.dll` 的动态依赖
- **需求与成果工作区布局** - 统一页头、状态筛选、列表和详情区尺寸，修正主操作按钮被拉伸及草稿状态显示错误
- **技能市场布局一致性** - 各技能分类统一内容宽度、卡片高度、元信息和操作按钮，并补充窄屏单列适配

### Changed

- **Windows 默认安装目标** - `npm run tauri build` 在 Windows 下默认生成 NSIS 安装程序
- **版本号同步** - package.json、Cargo.toml、tauri.conf.json、versionConfig、页脚、关于页、README 与修改记录统一至 v2.1.4

## [2.1.3] - 2026-07-28

### Fixed

- **需求 AI 状态栏对齐** - 我的需求直接复用我的成果的标题分隔线、状态徽章、图标和文字样式，已就绪/异常状态保持一致
- **已有需求固定可见** - 需求录入区改为独立滚动区域，下方“我的需求”列表在桌面首屏固定展示，移动端保持自然页面滚动

### Changed

- **版本号同步** - package.json、Cargo.toml、tauri.conf.json、versionConfig、页脚、关于页、README 与修改记录统一至 v2.1.3

## [2.1.2] - 2026-07-28

### Added

- **Office 文档图文解析** - 需求与成果上传新增 XLSX、PPTX，保留 DOCX、PDF；提取结构化文字、表格和图片，并支持多模态模型分析
- **提取内容确认** - 文档解析后先展示可编辑标题、正文和图片预览，用户确认后再回填并提交分析
- **统一状态筛选** - 我的需求、我的成果顶部统一为全部、已分析、分析中、草稿箱四类可点击筛选
- **技能中文信息** - 所有技能来源统一显示中文短描述、技能领域和技能说明，英文技能提供中文回退
- **新增测试** - 覆盖 XLSX/PPTX 解析和技能中文回退逻辑

### Changed

- **统一产品名称** - 桌面窗口、侧边栏、页脚、关于页、Android 名称和项目文档统一为“AI技术经理人”
- **紧凑工作区** - 需求与成果表单缩短，桌面页面固定为视口高度，滚动收敛到侧栏内部
- **成果提交文案** - “上传并分析”统一修改为“提交分析”
- **需求 AI 状态** - 需求录入区新增与成果页一致的“AI智能分析已就绪”状态提示

## [2.1.1] - 2026-07-28

### Added

- **资源管理操作** - 我的需求、需求广场、我的成果、成果广场新增分组、编辑、删除、置顶和星标，并持久化资源状态
- **科研技能库接入** - 自动加载 `scientific-agent-skills-main` 中的 138 项 `SKILL.md`，按领域与任务流程为首页 AI 对话推荐并注入相关方法
- **专业分析框架** - 技术需求和科技成果分析接入科研技能上下文；成果报告补充维度评分、TRL、证据、边界条件和验证建议
- **资源管理测试** - 新增资源排序/状态管理与科研技能解析、推荐测试，覆盖关键工作流

### Fixed

- **操作按钮不一致及溢出** - 统一“我的需求”和“我的成果”的保存、提交/上传分析按钮布局、尺寸和图标，窄栏下不再超出页面

### Changed

- **首页 AI 技术经理人能力升级** - AI 对话框展示科研技能状态和推荐结果，智能需求、成果分析及 Hermes 路由统一使用匹配后的技能上下文
- **版本号同步** - package.json、Cargo.toml、tauri.conf.json、versionConfig、页脚、关于页及发布文档统一至 v2.1.1

## [2.1.0] - 2026-06-22

### Fixed

- **主题切换回归** - 22 个组件从 `useThemeStore.getState().getEffectiveTheme()` 改为 `useThemeColors()` hook 订阅，新增 `useThemeIsDark()` 配套 hook
- **匹配关键词预过滤误杀同义词** - "AI/人工智能"、"5G/通信"、"IoT/物联网"等不再被判定为无交集；引入同义词字典
- **匹配响应 JSON 解析脆弱** - 优先匹配 ```json``` 代码块，fallback 到全文 slice；自动修复尾随逗号/单引号/无引号键
- **日期排序 NaN 风险** - 需求/成果列表改用 `safeDate` + `byCreatedAtDesc` / `byUpdatedAtDesc`，createdAt 缺失时不再产生未定义排序
- **Provider 列表四处硬编码** - 抽到 `config/providers.ts` 的 `ALL_PROVIDERS` / `PROVIDER_META`，新增 Provider 改一处
- **API Key 在 localStorage 明文** - 迁移到 OS Keychain（Windows DPAPI / macOS Keychain / Linux Secret Service），带 localStorage XOR 降级
- **API 失败立即抛出** - `gateway.chat()` 加入指数退避（最多 2 次，base 500ms），429/5xx 读取 `Retry-After` 头
- **gateway 旧版硬编码 Provider 列表** - 改用 `ALL_PROVIDERS` 统一源
- **gateway stream 字段从未生效** - 新增 `streamChat()` SSE 解析，`AIAgentChat` 改为逐字渲染
- **生产代码 console.warn** - 新增 `utils/logger.ts` 统一入口，DEV 模式全开，PROD 静音
- **版本号三方漂移** - package.json / Cargo.toml / tauri.conf.json / versionConfig 统一至 v2.1.0

### Added

- **OS Keychain 存储 API Key** - 通过 `keyring` crate 写入系统钥匙串；Tauri 命令 `save_secret` / `get_secret` / `delete_secret` / `has_secret`
- **流式响应（OpenAI 兼容协议）** - `streamChat(options, signal)` 返回 `AsyncIterable<string>` + `abort()`
- **数据导入/导出** - `utils/backup.ts` 打包 11 个 localStorage 键，schema 版本校验、数组去重合并；设置页新增「数据备份与恢复」面板
- **API 重试与指数退避** - 流式模式不重试避免重复推送；非流式 5xx/429 + 网络错误重试
- **单元测试** - vitest + jsdom，14 个用例覆盖 `parseMatchResponse` / `safeDate` / `encryptedStorage`
- **同义词字典** - ai/5g/iot/ev/finance/medical 等技术领域归一化
- **持久化 schema 迁移** - apiStore 升级到 v2，启动时自动把 v1 数据中的 apiKey 迁移到 Keychain

### Changed

- **API Gateway 接口异步化** - `validateConfig` / `isConfigured` / `getActiveProvider` / `getFullConfig` 改为 async（Keychain 异步 IO）
- **store/apiStore** - 持久化数据剥离 apiKey 字段，仅保留 baseUrl/modelId

## [2.0.1] - 2026-05-20

### Fixed

- **TechPage 溢出** - 移除 TechPage 与 TechDetail 双重 scroll 嵌套，flex 容器添加 minHeight:0
- **DemandPage 返回按钮失效** - 移除失效 Link 改为清除选中，flex 容器添加 minHeight:0
- **SkillsPage 乱码** - builtInSkills 所有技能补充 group 和 isBuiltIn 字段
- **三页区分化** - DemandPage/TechPage/PlatformPage 各自添加专属统计横幅与页面标识

### Changed

- **.gitignore** - 新增 openhuman-main 排除
- **版本号升级** - 同步至 v2.0.1

## [2.0.0] - 2026-05-20

### Added

- **技能执行系统全面升级** - Native / OpenClaw / Hermes 全部改为真实 LLM 执行（去除模拟）
- **HermesSkillsService.executeSkill()** - 使用 SKILL.md 内容作为 system prompt 调用 LLM
- **UnifiedSkillService 注册 Hermes 技能源** - 技能统计增加 hermes 计数
- **OpenClawService.executeSkill() 真实 LLM 化** - 移除模拟输出
- **nativeSkillTool / documentAnalysisTool LLM 驱动** - 从静态输出改为 LLM
- **Chat 模式技能注入** - `[SKILL:name]...[/SKILL]` 格式，8KB 上限
- **IntentClassifier 意图分类器** - 快速规则 + LLM 分类两阶段，5 种意图类型
- **SkillExecutionBridge 执行桥接** - 意图→技能/工具/领域分析的自动路由
- **Chat 模式智能意图分类** - 自动识别政策问答/产业链分析等意图
- **主动技能推荐 UI** - 输入时防抖检测匹配技能，可点击的推荐 chip
- **SkillInjector 3-tier 匹配** - 移植 OpenHuman inject.rs 算法

## [1.9.0] - 2026-05-19

### Fixed

- **主题切换不响应** - 6+组件从`useThemeStore.getState()`改为hook订阅，切换主题实时生效
- **自动保存重复创建草稿** - DemandInput使用稳定draftId，避免每次保存生成新草稿
- **分析失败标记为成功** - 需求分析失败时status改为`'failed'`而非`'completed'`
- **匹配超时机制失效** - gateway.chat()支持AbortSignal参数，超时可真正中断请求
- **TavilySearchProvider空URL崩溃** - 添加URL有效性检查，无效URL使用默认值
- **SearchService硬编码年份** - 企业调研和行业分析查询改为动态年份
- **MatchPanel无错误处理** - 匹配过程添加catch块，失败时显示反馈
- **gateway错误类型安全** - catch块从`any`改为`unknown`+类型守卫
- **versionConfig崩溃** - JSON.parse添加try-catch保护
- **apiStore.clear()误清除** - 改为只移除自身key，不影响其他store
- **encryptedStorage栈溢出** - 大数据编码改用`apply`避免spread溢出

### Added

- **消息Markdown渲染** - MessageItem支持粗体、列表、标题、代码块、分割线渲染
- **文档内容发送** - 上传的Word/PDF文档内容自动拼接到AI对话消息中
- **ErrorBoundary** - 全局错误边界，组件崩溃显示友好错误页而非白屏
- **404路由** - 未匹配路径显示404页面，引导返回首页
- **转化路径交互** - TechDetail转化路径卡片添加onClick提示和键盘无障碍支持
- **应用图标** - favicon从Vite默认logo替换为应用图标

### Changed

- **Vite构建优化** - 新增docs分包(jszip/mammoth/pdf-parse独立chunk)
- **代码清理** - 删除dead code(TOOL_IDS常量、重复ApiConfig类型)
- **版本号统一升级至v1.9.0** - package.json / tauri.conf.json / Cargo.toml 同步更新

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
