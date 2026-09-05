# AI技术经理人智能对接系统

> **AI技术经理人** — 基于 AI Agent 架构的科技成果转化智能匹配平台

[![Version](https://img.shields.io/badge/version-v2.3.0-blue)]()
[![Tauri](https://img.shields.io/badge/Tauri-v2.x-FFC131)]()
[![React](https://img.shields.io/badge/React-18-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 项目简介

AI技术经理人是一款面向企业、高校、科研院所和技术服务机构的**智能技术需求对接平台**。系统集成 AI 对话、任务规划、技能市场、联网搜索等能力，通过 AI 自动完成企业技术需求分析与成果库智能匹配，解决科技成果转化中"找不到对的人"的核心痛点。

## 核心功能

| 模块 | 功能 |
|------|------|
| **AI 对话** | 通用 AI 问答、多模型支持（OpenAI / Claude / Qwen / 文心 / MiniMax / Kimi / MiMo / SenseNova 等 11 个 Provider） |
| **Hermes 任务规划** | 智能需求分析、自动计划生成、多工具调度 |
| **AI 技术经理人** | 政策问答、产业链分析、技术预测、双向匹配 |
| **Claude 终端** | 命令行操作、技能执行、历史命令 |
| **需求管理** | 需求发布、AI 分析、结构化维度标签（预算/时间/合作方式）、标签分类 |
| **成果管理** | 科技成果上传、详情展示、TRL 成熟度评估、建议转化路径 |
| **专业匹配工作台** | 单需求候选评估、四维解释评分、依据与风险、人工复核、备注及批次回看 |
| **对接项目推进台** | 认可结果一键建档、阶段推进、负责人、下一步行动、截止日与逾期提醒 |
| **技能市场** | 技能上传/下载、分组管理、启用禁用 |
| **草稿箱** | 多类型草稿保存和恢复 |
| **文档解析** | 支持 Word/PDF 文档上传，自动提取内容并智能分类 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri 2.x](https://v2.tauri.app/)（Rust 后端） |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 图标 | Lucide React |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Tauri CLI Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 安装

```bash
# 克隆仓库
git clone https://github.com/Guoyf888/tech-demand-matching.git
cd tech-demand-matching

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器（含 Tauri 桌面窗口）
npm run tauri dev

# 仅启动前端开发服务器
npm run dev
```

### 构建

```bash
# 构建桌面应用
npm run tauri build

# 仅构建前端
npm run build
```

## 项目结构

```
src/
├── main.tsx                    # 入口文件
├── App.tsx                     # 主应用（路由、布局、主题、ErrorBoundary）
├── components/
│   ├── agent/                  # AI 对话组件
│   │   ├── AIAgentChat.tsx     # 统一对话容器（4 种模式）
│   │   └── MessageItem.tsx     # 消息气泡（支持 Markdown 渲染）
│   ├── common/                 # 通用组件
│   │   └── ErrorBoundary.tsx   # 全局错误边界
│   ├── demand/                 # 需求管理
│   │   ├── DemandInput.tsx     # 需求输入表单
│   │   └── AnalysisReport.tsx  # AI 分析报告
│   ├── tech/                   # 成果管理
│   │   └── TechDetail.tsx      # 成果详情
│   ├── platform/               # 智能匹配
│   │   ├── MatchPanel.tsx      # 匹配评估面板
│   │   └── MatchProjectBoard.tsx # 对接项目推进台
│   ├── layout/                 # 布局组件
│   │   └── AppSidebar.tsx      # 侧边栏导航
│   ├── settings/               # 设置
│   │   └── ApiConfigPanel.tsx  # API 配置面板
│   └── ...
├── services/
│   ├── api/                    # API 网关（12 Provider 统一调用，支持 AbortSignal）
│   ├── hermes/                 # Hermes Agent 任务规划系统
│   ├── matching.ts             # 匹配算法（并发 + 超时）
│   ├── documentParser.ts       # 文档解析（Word/PDF）
│   └── search/                 # 联网搜索
├── store/                      # Zustand 状态管理（加密持久化）
├── types/                      # TypeScript 类型定义
├── config/                     # 版本、模型配置
└── utils/                      # 工具函数
    └── encryptedStorage.ts     # XOR + Base64 加密存储
src-tauri/                      # Tauri Rust 后端
public/                         # 静态资源
```

## 安全特性

- **API Key 加密存储** — localStorage 数据经 XOR + Base64 编码，不保存明文
- **文件上传校验** — 10MB 大小限制 + magic bytes 二进制验证
- **Prompt 注入防护** — 用户输入过滤和截断，防止恶意指令注入
- **AI 输出校验** — 返回结果 Schema 校验，拒绝异常数据
- **全局错误边界** — ErrorBoundary 防止组件崩溃导致白屏
- **请求超时保护** — 匹配评估支持 AbortSignal，30 秒超时自动中断

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| v2.3.0 | 2026-09-05 | 建设对接项目推进台，支持认可结果建档、六阶段跟进、负责人、行动截止日与逾期提醒 |
| v2.2.0 | 2026-09-05 | 建设专业匹配工作台，支持单需求候选池、四维解释、人工复核与历史批次回看 |
| v2.1.7 | 2026-09-04 | 修复匹配与成果分析假状态，补充运行审计、真实备份键和演示数据标识 |
| v2.1.6 | 2026-09-04 | 加固 Hermes 工具循环与取消语义，区分真实/模拟搜索数据，并明确 TypeScript 适配层边界 |
| v2.1.5 | 2026-07-29 | 需求与成果草稿支持多选、全选和一键提交分析，移除需求列表重叠的“已提交”状态行 |
| v2.1.4 | 2026-07-28 | 优化需求/成果与技能市场布局，支持多条文档拆分、分组重命名，并修复 Windows 安装器启动依赖 |
| v2.1.3 | 2026-07-28 | 需求页复用成果页 AI 状态栏样式，并固定显示已有需求列表 |
| v2.1.2 | 2026-07-28 | 统一 AI技术经理人品牌，完善需求/成果状态筛选，支持 DOCX/PDF/XLSX/PPTX 图文提取确认并补充技能中文说明 |
| v2.1.1 | 2026-07-28 | 统一需求/成果操作区，新增分组、编辑、删除、置顶、星标，并将 138 项科研技能接入 AI 对话和分析流程 |
| v2.1.0 | 2026-06-22 | 全面修复 22+ 历史 Bug：主题订阅 / JSON 解析 / 关键词预过滤；新增 OS Keychain 存储、流式响应、数据导入导出、API 重试退避、单元测试 |
| v2.0.1 | 2026-05-20 | 修复 TechPage 溢出 / DemandPage 返回按钮 / SkillsPage 乱码；区分三页面差异化统计 |
| v2.0.0 | 2026-05-20 | 技能执行系统升级：Hermes/OpenClaw/native 全链路真实 LLM 执行；OpenHuman 3-tier 注入 |
| v1.9.0 | 2026-05-19 | 全面查漏补缺：22项Bug修复、ErrorBoundary、Markdown渲染、AbortSignal超时 |

完整版本日志见 [version_log.json](./version_log.json)。

## 许可证

MIT License
