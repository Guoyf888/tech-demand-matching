# AI技术经理人智能对接系统

> **TechMatch AI** — 基于 AI Agent 架构的科技成果转化智能匹配平台

[![Version](https://img.shields.io/badge/version-v1.9.0-blue)]()
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
| **智能匹配** | 需求-成果 AI 匹配度分析、进度条、分数筛选、等级标签、合作建议 |
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
│   │   └── MatchPanel.tsx      # 匹配面板
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
| v1.9.0 | 2026-05-19 | 全面查漏补缺：22项Bug修复、ErrorBoundary、Markdown渲染、AbortSignal超时 |
| v1.8.0 | 2026-05-18 | 新增 MiMo/SenseNova 大模型、侧边栏扩展、结构化需求标签、匹配面板重构 |
| v1.7.0 | 2026-05-18 | 安全加固（API 加密、文件校验、注入防护）、性能优化（懒加载、并发匹配） |
| v1.6.0 | 2026-04-30 | 优化 AI 对话界面，简化模式切换 |
| v1.5.0 | 2026-04-26 | 企业级 UI 改版、CSS 设计令牌系统、Lucide 图标库 |
| v1.0.0 | 2026-04-12 | 初始版本 |

完整版本日志见 [version_log.json](./version_log.json)。

## 许可证

MIT License
