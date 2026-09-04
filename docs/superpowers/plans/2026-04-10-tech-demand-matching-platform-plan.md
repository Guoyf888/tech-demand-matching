# AI技术经理人 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Tauri 的 AI技术经理人桌面应用，支持企业（需求方）、高校/科研院所（技术方）、服务机构（平台方）三方对接

**Architecture:** Tauri 桌面应用（React + TypeScript 前端 + Rust 后端），借鉴 Hermes Agent 的技能系统和记忆持久化设计

**Tech Stack:** Tauri 2.x + React 18 + TypeScript + Vite + Tailwind CSS + SQLite/FTS5

---

## 项目结构

```
tech-demand-matching/
├── src/                          # React 前端
│   ├── components/                # UI 组件
│   │   ├── common/               # 通用组件（Button、Input、Card等）
│   │   ├── layout/               # 布局组件（Header、Sidebar、Footer）
│   │   ├── demand/               # 需求方模块组件
│   │   ├── tech/                 # 技术方模块组件
│   │   ├── platform/             # 平台方模块组件
│   │   └── settings/             # 设置相关组件
│   ├── pages/                    # 页面
│   │   ├── DemandPage.tsx        # 需求方首页
│   │   ├── TechPage.tsx          # 技术方首页
│   │   ├── PlatformPage.tsx      # 平台方首页
│   │   └── SettingsPage.tsx      # 设置页
│   ├── hooks/                    # 自定义Hooks
│   ├── services/                 # 服务层
│   │   ├── api/                  # 大模型API网关
│   │   ├── storage/              # 数据存储服务
│   │   └── skills/               # Skill系统
│   ├── store/                    # 状态管理
│   ├── types/                    # TypeScript类型定义
│   ├── utils/                    # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── commands/            # Tauri命令
│   │   │   ├── mod.rs
│   │   │   ├── file.rs          # 文件操作
│   │   │   └── db.rs           # 数据库操作
│   │   └── db/                  # 数据库模块
│   │       ├── mod.rs
│   │       ├── schema.rs        # 表结构
│   │       └── fts.rs           # FTS5搜索
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Phase 1: 基础框架搭建

### Task 1: 初始化 Tauri 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "tech-demand-matching",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0",
    "zustand": "^4.5.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```

- [ ] **Step 2: 创建 TypeScript 配置 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 Vite 配置 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: 创建 Tailwind 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI技术经理人</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 React 入口 src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: 创建全局样式 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #213547;
  background-color: #fafafa;
}

.dark {
  color: #f9fafb;
  background-color: #1a1a1a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

- [ ] **Step 8: 创建基础 App.tsx**

```typescript
import { useState } from 'react';

type Role = 'demand' | 'tech' | 'platform';

function App() {
  const [currentRole, setCurrentRole] = useState<Role>('demand');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">AI技术经理人</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p>当前角色: {currentRole}</p>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 9: 创建 Rust Cargo.toml**

```toml
[package]
name = "tech-demand-matching"
version = "1.0.0"
description = "AI技术经理人"
authors = ["you"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
```

- [ ] **Step 10: 创建 Tauri 配置 src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AI技术经理人",
  "version": "1.0.0",
  "identifier": "com.techdemand.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "AI技术经理人",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

- [ ] **Step 11: 创建 Rust 入口 src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 12: 创建 build.rs**

```rust
fn main() {
    tauri_build::build();
}
```

- [ ] **Step 13: 初始化项目并安装依赖**

```bash
cd tech-demand-matching
npm install
cd src-tauri && cargo build
```

**Expected:** 项目编译成功，无错误

- [ ] **Step 14: 提交代码**

```bash
git add -A
git commit -m "feat: 初始化Tauri项目基础框架"
```

---

### Task 2: 实现角色切换系统

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/common/RoleSwitcher.tsx`
- Create: `src/store/roleStore.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建角色状态管理 src/store/roleStore.ts**

```typescript
import { create } from 'zustand';

export type Role = 'demand' | 'tech' | 'platform';

interface RoleState {
  currentRole: Role;
  setRole: (role: Role) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  currentRole: 'demand',
  setRole: (role) => set({ currentRole: role }),
}));
```

- [ ] **Step 2: 创建角色切换器组件 src/components/common/RoleSwitcher.tsx**

```typescript
import { Role } from '@/store/roleStore';

const roleConfig = {
  demand: { label: '需求方', icon: '🏢', description: '企业技术需求' },
  tech: { label: '技术方', icon: '🎓', description: '高校/科研院所' },
  platform: { label: '平台方', icon: '🔧', description: '服务机构' },
};

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="flex gap-2">
      {(Object.keys(roleConfig) as Role[]).map((role) => (
        <button
          key={role}
          onClick={() => onRoleChange(role)}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentRole === role
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <span className="mr-2">{roleConfig[role].icon}</span>
          {roleConfig[role].label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 Header 组件 src/components/layout/Header.tsx**

```typescript
import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { Role, useRoleStore } from '@/store/roleStore';

export function Header() {
  const { currentRole, setRole } = useRoleStore();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary-600">技术需求对接</h1>
          <RoleSwitcher currentRole={currentRole} onRoleChange={setRole} />
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            ⚙️ 设置
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: 创建 Sidebar 组件 src/components/layout/Sidebar.tsx**

```typescript
import { Role } from '@/store/roleStore';

const menuItems: Record<Role, { label: string; icon: string }[]> = {
  demand: [
    { label: '技术需求输入', icon: '📝' },
    { label: '我的需求', icon: '📋' },
    { label: '分析报告', icon: '📊' },
  ],
  tech: [
    { label: '上传成果', icon: '📤' },
    { label: '我的成果', icon: '📚' },
    { label: '团队展示', icon: '👥' },
  ],
  platform: [
    { label: '需求广场', icon: '🏢' },
    { label: '技术广场', icon: '🎓' },
    { label: '智能匹配', icon: '🔗' },
    { label: '合作管理', icon: '🤝' },
  ],
};

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const currentRole = useRoleStore((s) => s.currentRole);
  const items = menuItems[currentRole];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
      <nav className="p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onMenuChange(item.label)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                  activeMenu === item.label
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 5: 更新 App.tsx**

```typescript
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRoleStore } from '@/store/roleStore';

function App() {
  const [activeMenu, setActiveMenu] = useState('技术需求输入');
  const currentRole = useRoleStore((s) => s.currentRole);

  const getWelcomeMessage = () => {
    switch (currentRole) {
      case 'demand':
        return '欢迎来到需求方工作台，在这里您可以输入技术需求，获得AI分析和创新建议。';
      case 'tech':
        return '欢迎来到技术方工作台，在这里您可以上传技术成果，展示团队实力。';
      case 'platform':
        return '欢迎来到平台方工作台，在这里您可以促成需求方与技术方的合作。';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <main className="flex-1 p-8">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">{activeMenu}</h2>
            <p className="text-gray-600 dark:text-gray-400">{getWelcomeMessage()}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 6: 运行验证**

```bash
npm run dev
```

**Expected:** 页面显示角色切换器和侧边栏，切换角色时侧边栏菜单变化

- [ ] **Step 7: 提交代码**

```bash
git add -A
git commit -m "feat: 实现角色切换系统"
```

---

## Phase 2: 大模型 API 网关

### Task 3: 实现大模型 API 网关

**Files:**
- Create: `src/services/api/types.ts`
- Create: `src/services/api/gateway.ts`
- Create: `src/services/api/providers/openai.ts`
- Create: `src/services/api/providers/claude.ts`
- Create: `src/services/api/providers/ernie.ts`
- Create: `src/services/api/providers/qwen.ts`
- Create: `src/services/api/providers/custom.ts`
- Create: `src/store/apiStore.ts`
- Create: `src/components/settings/ApiConfigPanel.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: 创建 API 类型定义 src/services/api/types.ts**

```typescript
export type Provider = 'openai' | 'claude' | 'gemini' | 'ernie' | 'qwen' | 'zhipu' | 'minimax' | 'kimi' | 'openrouter' | 'custom';

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsStreaming?: boolean;
}

export interface TokenUsage {
  used: number;
  limit: number;
  resetAt?: Date;
}

export interface ApiConfig {
  provider: Provider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
```

- [ ] **Step 2: 创建 API 网关核心 src/services/api/gateway.ts**

```typescript
import { ApiConfig, ChatMessage, ChatCompletionOptions } from './types';

const providerHandlers: Record<string, (config: ApiConfig) => Promise<Response>> = {};

export class ApiGateway {
  private config: ApiConfig | null = null;

  setConfig(config: ApiConfig) {
    this.config = config;
  }

  getConfig(): ApiConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  async chat(options: ChatCompletionOptions): Promise<Response> {
    if (!this.config) {
      throw new Error('API未配置');
    }

    const { provider, apiKey, baseUrl, modelId } = this.config;

    let endpoint = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: Record<string, unknown> = {
      model: modelId,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    };

    switch (provider) {
      case 'openai':
        endpoint = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      case 'claude':
        endpoint = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`;
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        delete headers['Content-Type'];
        body = {
          model: modelId,
          messages: options.messages.filter((m) => m.role !== 'system'),
          system: options.messages.find((m) => m.role === 'system')?.content,
          max_tokens: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.7,
        };
        break;

      case 'custom':
        endpoint = `${baseUrl}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;

      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  async chatStream(options: ChatCompletionOptions): Promise<ReadableStream> {
    const response = await this.chat({ ...options, stream: true });
    return response.body!;
  }
}

export const apiGateway = new ApiGateway();
```

- [ ] **Step 3: 创建 API 配置状态管理 src/store/apiStore.ts**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiConfig, Provider } from '@/services/api/types';

interface ApiState {
  configs: Record<Provider, ApiConfig | null>;
  activeProvider: Provider;
  setConfig: (provider: Provider, config: ApiConfig | null) => void;
  setActiveProvider: (provider: Provider) => void;
  getActiveConfig: () => ApiConfig | null;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      configs: {
        openai: null,
        claude: null,
        gemini: null,
        ernie: null,
        qwen: null,
        zhipu: null,
        minimax: null,
        kimi: null,
        openrouter: null,
        custom: null,
      },
      activeProvider: 'openai',
      setConfig: (provider, config) =>
        set((state) => ({
          configs: { ...state.configs, [provider]: config },
        })),
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      getActiveConfig: () => {
        const state = get();
        return state.configs[state.activeProvider];
      },
    }),
    {
      name: 'api-config-storage',
    }
  )
);
```

- [ ] **Step 4: 创建 API 配置面板组件 src/components/settings/ApiConfigPanel.tsx**

```typescript
import { useState } from 'react';
import { Provider, ApiConfig } from '@/services/api/types';
import { useApiStore } from '@/store/apiStore';
import { apiGateway } from '@/services/api/gateway';

const providers: { id: Provider; name: string; placeholder: string }[] = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'claude', name: 'Claude', placeholder: 'sk-ant-...' },
  { id: 'qwen', name: '阿里Qwen', placeholder: 'sk-...' },
  { id: 'ernie', name: '百度文心', placeholder: 'API Key' },
  { id: 'zhipu', name: '智谱GLM', placeholder: 'API Key' },
  { id: 'minimax', name: 'MiniMax', placeholder: 'API Key' },
  { id: 'kimi', name: 'Kimi', placeholder: 'API Key' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
  { id: 'custom', name: '自定义', placeholder: 'API Key' },
];

export function ApiConfigPanel() {
  const { configs, activeProvider, setConfig, setActiveProvider } = useApiStore();
  const currentConfig = configs[activeProvider];
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || '');
  const [modelId, setModelId] = useState(currentConfig?.modelId || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const config: ApiConfig = {
      provider: activeProvider,
      apiKey,
      baseUrl: baseUrl || undefined,
      modelId,
    };
    setConfig(activeProvider, config);
    apiGateway.setConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">选择模型提供商</label>
        <div className="grid grid-cols-3 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                activeProvider === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={providers.find((p) => p.id === activeProvider)?.placeholder}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {activeProvider === 'custom' && (
        <div>
          <label className="block text-sm font-medium mb-2">API Endpoint</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-api.com/v1"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">模型 ID</label>
        <input
          type="text"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder="如: gpt-4o, claude-3-5-sonnet"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        {saved ? '✓ 已保存' : '保存配置'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: 创建设置页面 src/pages/SettingsPage.tsx**

```typescript
import { ApiConfigPanel } from '@/components/settings/ApiConfigPanel';

export function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">大模型 API 配置</h3>
        <ApiConfigPanel />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">关于</h3>
        <p className="text-gray-600 dark:text-gray-400">
          AI技术经理人 v1.0.0
          <br />
          基于 Tauri + React 构建
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 测试 API 调用**

```bash
# 配置API Key后测试调用
```

**Expected:** 能够成功调用配置的模型API

- [ ] **Step 7: 提交代码**

```bash
git add -A
git commit -m "feat: 实现大模型API网关"
```

---

## Phase 3: 需求方模块

### Task 4: 实现技术需求输入和分析

**Files:**
- Create: `src/components/demand/DemandInput.tsx`
- Create: `src/components/demand/DemandList.tsx`
- Create: `src/components/demand/AnalysisReport.tsx`
- Create: `src/services/storage/demandStorage.ts`
- Create: `src/pages/DemandPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建需求存储服务 src/services/storage/demandStorage.ts**

```typescript
import { Demand } from '@/types';

const STORAGE_KEY = 'demands';

export const demandStorage = {
  getAll(): Demand[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(demand: Demand) {
    const demands = this.getAll();
    const index = demands.findIndex((d) => d.id === demand.id);
    if (index >= 0) {
      demands[index] = demand;
    } else {
      demands.push(demand);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  },

  delete(id: string) {
    const demands = this.getAll().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  },

  generateId(): string {
    return `demand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
```

- [ ] **Step 2: 创建类型定义 src/types/index.ts**

```typescript
export interface Demand {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'analyzing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  analysis?: {
    enterpriseInfo?: string;
    industryAnalysis?: string;
    techRoadmap?: string;
    suggestions?: string;
  };
}

export interface TechResult {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  teamMembers: TeamMember[];
  documents: string[];
  status: 'draft' | 'processing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
}

export interface Match {
  id: string;
  demandId: string;
  techId: string;
  score: number;
  reason: string;
  status: 'pending' | 'contacted' | 'cooperating' | 'completed';
  createdAt: Date;
}
```

- [ ] **Step 3: 创建需求输入组件 src/components/demand/DemandInput.tsx**

```typescript
import { useState } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { apiGateway } from '@/services/api/gateway';

interface DemandInputProps {
  onDemandCreated: (demand: Demand) => void;
}

export function DemandInput({ onDemandCreated }: DemandInputProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    const demand: Demand = {
      id: demandStorage.generateId(),
      title,
      content,
      tags: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    demandStorage.save(demand);
    onDemandCreated(demand);

    // 开始AI分析
    if (apiGateway.isConfigured()) {
      setIsAnalyzing(true);
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `你是一个技术需求分析助手。请分析以下技术需求：
1. 提取关键词和标签
2. 分析需求的核心技术方向
3. 给出简短的技术研发建议

请以JSON格式返回：
{
  "tags": ["标签1", "标签2"],
  "industryAnalysis": "行业分析...",
  "techRoadmap": "技术路线...",
  "suggestions": "创新建议..."
}`,
            },
            { role: 'user', content },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const analysis = JSON.parse(data.choices[0].message.content);
          demand.tags = analysis.tags || [];
          demand.analysis = {
            enterpriseInfo: '基于您输入的需求分析',
            industryAnalysis: analysis.industryAnalysis,
            techRoadmap: analysis.techRoadmap,
            suggestions: analysis.suggestions,
          };
          demand.status = 'completed';
          demand.updatedAt = new Date();
          demandStorage.save(demand);
          onDemandCreated(demand);
        }
      } catch (error) {
        console.error('分析失败:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">输入技术需求</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">需求标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：新能源汽车电池管理系统开发"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">需求详情</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述您的技术需求，包括技术指标、预期目标、预算范围等..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isAnalyzing}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '分析中...' : '提交分析'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建需求列表组件 src/components/demand/DemandList.tsx**

```typescript
import { Demand } from '@/types';

interface DemandListProps {
  demands: Demand[];
  onSelect: (demand: Demand) => void;
  selectedId?: string;
}

export function DemandList({ demands, onSelect, selectedId }: DemandListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">我的需求 ({demands.length})</h3>
      </div>

      <div className="divide-y dark:divide-gray-700">
        {demands.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无需求，点击上方输入框添加
          </div>
        ) : (
          demands.map((demand) => (
            <button
              key={demand.id}
              onClick={() => onSelect(demand)}
              className={`w-full text-left p-4 transition-colors ${
                selectedId === demand.id
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{demand.title}</h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {demand.content}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {demand.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    demand.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : demand.status === 'analyzing'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {demand.status === 'completed'
                    ? '已完成'
                    : demand.status === 'analyzing'
                    ? '分析中'
                    : '草稿'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建分析报告组件 src/components/demand/AnalysisReport.tsx**

```typescript
import { Demand } from '@/types';

interface AnalysisReportProps {
  demand: Demand;
}

export function AnalysisReport({ demand }: AnalysisReportProps) {
  if (!demand.analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">暂无分析报告</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {demand.analysis.industryAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            📊 行业分析
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.industryAnalysis}
          </p>
        </div>
      )}

      {demand.analysis.techRoadmap && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            🛤️ 技术研发路线
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.techRoadmap}
          </p>
        </div>
      )}

      {demand.analysis.suggestions && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            💡 创新建议
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.suggestions}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 创建需求页面 src/pages/DemandPage.tsx**

```typescript
import { useState, useEffect } from 'react';
import { DemandInput } from '@/components/demand/DemandInput';
import { DemandList } from '@/components/demand/DemandList';
import { AnalysisReport } from '@/components/demand/AnalysisReport';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';

export function DemandPage() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  useEffect(() => {
    setDemands(demandStorage.getAll());
  }, []);

  const handleDemandCreated = (demand: Demand) => {
    setDemands([...demands.filter((d) => d.id !== demand.id), demand]);
    setSelectedDemand(demand);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      <div className="w-80 flex flex-col gap-4">
        <DemandInput onDemandCreated={handleDemandCreated} />
        <DemandList
          demands={demands}
          selectedId={selectedDemand?.id}
          onSelect={setSelectedDemand}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedDemand ? (
          <div>
            <h3 className="text-xl font-bold mb-4">{selectedDemand.title}</h3>
            <AnalysisReport demand={selectedDemand} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            选择一个需求查看分析报告
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 更新 App.tsx 路由**

```typescript
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRoleStore } from '@/store/roleStore';
import { DemandPage } from '@/pages/DemandPage';

function App() {
  const [activeMenu, setActiveMenu] = useState('技术需求输入');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <main className="flex-1 p-6 overflow-auto">
          <DemandPage />
        </main>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 8: 提交代码**

```bash
git add -A
git commit -m "feat: 实现需求方模块"
```

---

## Phase 4: 技术方模块

### Task 5: 实现技术成果上传和展示

**Files:**
- Create: `src/components/tech/TechUpload.tsx`
- Create: `src/components/tech/TechResultList.tsx`
- Create: `src/components/tech/TeamCard.tsx`
- Create: `src/services/storage/techStorage.ts`
- Create: `src/pages/TechPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建技术成果存储 src/services/storage/techStorage.ts**

```typescript
import { TechResult } from '@/types';

const STORAGE_KEY = 'tech_results';

export const techStorage = {
  getAll(): TechResult[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(result: TechResult) {
    const results = this.getAll();
    const index = results.findIndex((r) => r.id === result.id);
    if (index >= 0) {
      results[index] = result;
    } else {
      results.push(result);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  delete(id: string) {
    const results = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },

  generateId(): string {
    return `tech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
```

- [ ] **Step 2: 创建技术成果上传组件 src/components/tech/TechUpload.tsx**

```typescript
import { useState } from 'react';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult, TeamMember } from '@/types';
import { apiGateway } from '@/services/api/gateway';

interface TechUploadProps {
  onUploaded: (result: TechResult) => void;
}

export function TechUpload({ onUploaded }: TechUploadProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    const result: TechResult = {
      id: techStorage.generateId(),
      title,
      content,
      summary: '',
      tags: [],
      teamMembers,
      documents: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    techStorage.save(result);
    onUploaded(result);

    if (apiGateway.isConfigured()) {
      setIsProcessing(true);
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `你是一个技术成果分析助手。请分析以下技术成果：
1. 提取关键词和标签
2. 用通俗易懂的语言提炼成果概要（适合非专业人士阅读）
3. 识别团队的核心成员和专长

请以JSON格式返回：
{
  "tags": ["标签1", "标签2"],
  "summary": "通俗易懂的成果概要...",
  "teamAnalysis": "团队分析..."
}`,
            },
            { role: 'user', content },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const analysis = JSON.parse(data.choices[0].message.content);
          result.tags = analysis.tags || [];
          result.summary = analysis.summary || '';
          result.status = 'completed';
          result.updatedAt = new Date();
          techStorage.save(result);
          onUploaded(result);
        }
      } catch (error) {
        console.error('处理失败:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">上传技术成果</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">成果标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：基于深度学习的图像识别算法"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">成果详情</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述您的技术成果，包括技术原理、应用场景、创新点、已获成果等..."
            rows={8}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isProcessing}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isProcessing ? '处理中...' : '提交分析'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建团队卡片组件 src/components/tech/TeamCard.tsx**

```typescript
import { TeamMember } from '@/types';

interface TeamCardProps {
  members: TeamMember[];
}

export function TeamCard({ members }: TeamCardProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h4 className="font-semibold mb-4">👥 团队成员</h4>
      <div className="grid grid-cols-2 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-lg">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} />
              ) : (
                member.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-gray-500">{member.role}</div>
              <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                {member.bio}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建技术成果列表 src/components/tech/TechResultList.tsx**

```typescript
import { TechResult } from '@/types';

interface TechResultListProps {
  results: TechResult[];
  onSelect: (result: TechResult) => void;
  selectedId?: string;
}

export function TechResultList({ results, onSelect, selectedId }: TechResultListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">我的成果 ({results.length})</h3>
      </div>

      <div className="divide-y dark:divide-gray-700">
        {results.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无成果</div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelect(result)}
              className={`w-full text-left p-4 transition-colors ${
                selectedId === result.id
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <h4 className="font-medium truncate">{result.title}</h4>
              {result.summary && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {result.summary}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {result.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建技术方页面 src/pages/TechPage.tsx**

```typescript
import { useState, useEffect } from 'react';
import { TechUpload } from '@/components/tech/TechUpload';
import { TechResultList } from '@/components/tech/TechResultList';
import { TeamCard } from '@/components/tech/TeamCard';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';

export function TechPage() {
  const [results, setResults] = useState<TechResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TechResult | null>(null);

  useEffect(() => {
    setResults(techStorage.getAll());
  }, []);

  const handleUploaded = (result: TechResult) => {
    setResults([...results.filter((r) => r.id !== result.id), result]);
    setSelectedResult(result);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      <div className="w-80 flex flex-col gap-4">
        <TechUpload onUploaded={handleUploaded} />
        <TechResultList
          results={results}
          selectedId={selectedResult?.id}
          onSelect={setSelectedResult}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedResult ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">{selectedResult.title}</h3>

            {selectedResult.summary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h4 className="font-semibold mb-3">📋 成果概要</h4>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {selectedResult.summary}
                </p>
              </div>
            )}

            <TeamCard members={selectedResult.teamMembers} />

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h4 className="font-semibold mb-3">📄 详细内容</h4>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {selectedResult.content}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            选择一个成果查看详情
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 更新 App.tsx**

```typescript
import { useRoleStore } from '@/store/roleStore';
import { DemandPage } from '@/pages/DemandPage';
import { TechPage } from '@/pages/TechPage';

function App() {
  const [activeMenu, setActiveMenu] = useState('上传成果');
  const currentRole = useRoleStore((s) => s.currentRole);

  const renderPage = () => {
    if (currentRole === 'demand') return <DemandPage />;
    if (currentRole === 'tech') return <TechPage />;
    return <PlatformPage />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 提交代码**

```bash
git add -A
git commit -m "feat: 实现技术方模块"
```

---

## Phase 5: 平台方模块

### Task 6: 实现智能匹配功能

**Files:**
- Create: `src/pages/PlatformPage.tsx`
- Create: `src/services/matching.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建匹配服务 src/services/matching.ts**

```typescript
import { Demand, TechResult } from '@/types';
import { apiGateway } from './api/gateway';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

export async function findMatches(
  demands: Demand[],
  techResults: TechResult[]
): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];

  const completedDemands = demands.filter((d) => d.status === 'completed');
  const completedTechs = techResults.filter((t) => t.status === 'completed');

  if (!apiGateway.isConfigured() || completedDemands.length === 0 || completedTechs.length === 0) {
    return matches;
  }

  for (const demand of completedDemands) {
    for (const tech of completedTechs) {
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `分析需求和成果的匹配度。

需求：${demand.content}
需求标签：${demand.tags.join(', ')}

成果：${tech.content}
成果标签：${tech.tags.join(', ')}
成果概要：${tech.summary}

请评估匹配度（0-100），并给出简要理由。
以JSON格式返回：
{
  "score": 85,
  "reason": "匹配理由..."
}`,
            },
            { role: 'user', content: '评估匹配度' },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const result = JSON.parse(data.choices[0].message.content);
          if (result.score >= 50) {
            matches.push({
              demand,
              tech,
              score: result.score,
              reason: result.reason,
            });
          }
        }
      } catch (error) {
        console.error('匹配失败:', error);
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 2: 创建平台方页面 src/pages/PlatformPage.tsx**

```typescript
import { useState, useEffect } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { findMatches } from '@/services/matching';
import { Demand, TechResult } from '@/types';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

export function PlatformPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const demands = demandStorage.getAll();
      const techResults = techStorage.getAll();
      const results = await findMatches(demands, techResults);
      setMatches(results);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">智能匹配</h2>
        <button
          onClick={handleMatch}
          disabled={isMatching}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isMatching ? '匹配中...' : '开始匹配'}
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无匹配结果</p>
          <p className="text-sm text-gray-400 mt-2">
            请确保需求方和技术方都有已分析完成的内容
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-2xl font-bold text-primary-600">
                    {match.score}%
                  </span>
                  <span className="ml-2 text-gray-500">匹配度</span>
                </div>
                <button className="px-4 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  查看详情
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">
                    需求方
                  </h4>
                  <p className="font-medium">{match.demand.title}</p>
                  <div className="flex gap-2 mt-2">
                    {match.demand.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">
                    技术方
                  </h4>
                  <p className="font-medium">{match.tech.title}</p>
                  <div className="flex gap-2 mt-2">
                    {match.tech.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {match.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 更新 App.tsx**

```typescript
import { PlatformPage } from '@/pages/PlatformPage';
```

- [ ] **Step 4: 提交代码**

```bash
git add -A
git commit -m "feat: 实现平台方智能匹配"
```

---

## Phase 6: Skill 技能系统

### Task 7: 实现基础 Skill 系统

**Files:**
- Create: `src/services/skills/types.ts`
- Create: `src/services/skills/skillStore.ts`
- Create: `src/services/skills/builtInSkills.ts`
- Create: `src/components/skills/SkillCard.tsx`
- Create: `src/pages/SkillsPage.tsx`

- [ ] **Step 1: 创建 Skill 类型 src/services/skills/types.ts**

```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  icon: string;
  actions: SkillAction[];
  metadata: {
    createdAt: Date;
    usageCount: number;
    successRate: number;
  };
}

export interface SkillAction {
  id: string;
  name: string;
  description: string;
  execute: (params: unknown) => Promise<unknown>;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: Skill[];
}
```

- [ ] **Step 2: 创建 Skill 存储 src/services/skills/skillStore.ts**

```typescript
import { Skill } from './types';

const STORAGE_KEY = 'skills';

export const skillStore = {
  getAll(): Skill[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save(skill: Skill) {
    const skills = this.getAll();
    const index = skills.findIndex((s) => s.id === skill.id);
    if (index >= 0) {
      skills[index] = skill;
    } else {
      skills.push(skill);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  },

  delete(id: string) {
    const skills = this.getAll().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  },

  toggleEnabled(id: string) {
    const skills = this.getAll();
    const skill = skills.find((s) => s.id === id);
    if (skill) {
      skill.enabled = !skill.enabled;
      this.save(skill);
    }
  },
};
```

- [ ] **Step 3: 创建内置技能 src/services/skills/builtInSkills.ts**

```typescript
import { Skill } from './types';

export const builtInSkills: Skill[] = [
  {
    id: 'skill_search',
    name: '智能搜索',
    description: '搜索网络、文档和历史记录',
    version: '1.0.0',
    enabled: true,
    icon: '🔍',
    actions: [],
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_document',
    name: '文档处理',
    description: '解析PDF、Word、Markdown文档',
    version: '1.0.0',
    enabled: true,
    icon: '📄',
    actions: [],
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_code',
    name: '代码助手',
    description: '代码审查、生成、解释',
    version: '1.0.0',
    enabled: true,
    icon: '💻',
    actions: [],
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_analysis',
    name: '数据分析',
    description: '数据分析、可视化、报告生成',
    version: '1.0.0',
    enabled: true,
    icon: '📊',
    actions: [],
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    },
  },
  {
    id: 'skill_notification',
    name: '消息推送',
    description: '邮件、短信、API推送通知',
    version: '1.0.0',
    enabled: false,
    icon: '🔔',
    actions: [],
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    },
  },
];

export function getBuiltInSkills(): Skill[] {
  const stored = skillStore.getAll();
  if (stored.length === 0) {
    builtInSkills.forEach((s) => skillStore.save(s));
    return builtInSkills;
  }
  return stored;
}
```

- [ ] **Step 4: 创建技能卡片 src/components/skills/SkillCard.tsx**

```typescript
import { Skill } from '@/services/skills/types';
import { skillStore } from '@/services/skills/skillStore';

interface SkillCardProps {
  skill: Skill;
  onUpdate: () => void;
}

export function SkillCard({ skill, onUpdate }: SkillCardProps) {
  const handleToggle = () => {
    skillStore.toggleEnabled(skill.id);
    onUpdate();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{skill.icon}</span>
          <div>
            <h4 className="font-medium">{skill.name}</h4>
            <p className="text-sm text-gray-500">{skill.description}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`px-3 py-1 rounded-full text-sm ${
            skill.enabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {skill.enabled ? '已启用' : '已禁用'}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>v{skill.version}</span>
        <span>使用 {skill.metadata.usageCount} 次</span>
        <span>成功率 {skill.metadata.successRate}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建技能页面 src/pages/SkillsPage.tsx**

```typescript
import { useState, useEffect } from 'react';
import { SkillCard } from '@/components/skills/SkillCard';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { Skill } from '@/services/skills/types';

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    setSkills(getBuiltInSkills());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">技能市场</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          浏览更多
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onUpdate={() => setSkills([...skills])}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 提交代码**

```bash
git add -A
git commit -m "feat: 实现Skill技能系统基础"
```

---

## 实施完成

以上任务全部完成后，系统将具备以下功能：

1. ✅ Tauri 桌面应用框架
2. ✅ 三角色切换系统（需求方/技术方/平台方）
3. ✅ 大模型 API 网关（支持 OpenAI、Claude、Qwen、文心等）
4. ✅ 需求方：技术需求输入 + AI 分析报告
5. ✅ 技术方：技术成果上传 + AI 概要提炼
6. ✅ 平台方：智能匹配需求与技术方
7. ✅ Skill 技能系统基础

下一步可以继续完善：
- FTS5 全文搜索
- 记忆持久化系统
- Token 配额管理
- 技能自动创建与自优化
- 系统托盘功能
