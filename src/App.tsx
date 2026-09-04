import { Suspense, lazy, type CSSProperties } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useThemeColors, useThemeIsDark } from '@/store/themeStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const AIAgentChat = lazy(() => import('@/components/agent/AIAgentChat').then(m => ({ default: m.AIAgentChat })));
const DemandPage = lazy(() => import('@/pages/DemandPage').then(m => ({ default: m.DemandPage })));
const TechPage = lazy(() => import('@/pages/TechPage').then(m => ({ default: m.TechPage })));
const PlatformPage = lazy(() => import('@/pages/PlatformPage').then(m => ({ default: m.PlatformPage })));
const DemandSquarePage = lazy(() => import('@/pages/SquarePages').then(m => ({ default: m.DemandSquarePage })));
const TechSquarePage = lazy(() => import('@/pages/SquarePages').then(m => ({ default: m.TechSquarePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SkillsPage = lazy(() => import('@/pages/SkillsPage').then(m => ({ default: m.SkillsPage })));
const DraftBoxPage = lazy(() => import('@/pages/DraftBoxPage').then(m => ({ default: m.DraftBoxPage })));
const TerminalPage = lazy(() => import('@/pages/TerminalPage').then(m => ({ default: m.TerminalPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-sm" style={{ color: 'var(--color-text-tertiary)' }}>加载中...</div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="text-5xl" style={{ color: 'var(--color-text-tertiary)' }}>404</div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>页面不存在</p>
      <a
        href="/"
        className="px-4 py-2 rounded-lg text-sm text-white no-underline"
        style={{ backgroundColor: 'var(--color-primary, #1677FF)' }}
      >
        返回首页
      </a>
    </div>
  );
}

function App() {
  const themeColors = useThemeColors();
  const isDark = useThemeIsDark();
  const themeVariables = {
    '--color-primary': themeColors.primary,
    '--color-primary-hover': themeColors.primaryHover,
    '--color-primary-light': themeColors.primaryLight,
    '--color-primary-bg': themeColors.primaryLight,
    '--color-ai-purple': themeColors.aiPurple,
    '--color-ai-purple-light': themeColors.aiPurpleLight,
    '--color-bg-container': themeColors.surface,
    '--color-bg-layout': themeColors.background,
    '--color-bg-elevated': themeColors.surface,
    '--color-bg-surface-hover': themeColors.surfaceHover,
    '--color-bg-surface-active': themeColors.backgroundAlt,
    '--color-text-primary': themeColors.text,
    '--color-text-secondary': themeColors.textSecondary,
    '--color-text-tertiary': themeColors.textHint,
    '--color-border': themeColors.border,
    '--color-border-secondary': themeColors.border,
    '--color-border-strong': themeColors.borderHover,
    '--color-success': themeColors.success,
    '--color-success-bg': themeColors.successLight,
    '--color-warning': themeColors.warning,
    '--color-warning-bg': themeColors.warningLight,
    '--color-error': themeColors.error,
    '--color-error-bg': themeColors.errorLight,
    '--color-info': themeColors.info,
    '--color-info-bg': themeColors.infoLight,
    '--color-gray-5': themeColors.border,
    '--color-gray-6': themeColors.borderHover,
  } as CSSProperties;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div
        className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}
        style={{
          ...themeVariables,
          backgroundColor: 'var(--color-bg-layout)',
          color: 'var(--color-text-primary)',
        }}
      >
        <AppSidebar />
        <main
          className="app-main flex-1 overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-layout)',
            marginLeft: 'var(--sidebar-width, 220px)',
            transition: 'margin-left 0.2s ease',
            height: '100vh',
          }}
        >
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ai" element={<AIAgentChat />} />
              <Route path="/demands" element={<DemandPage />} />
              <Route path="/reports" element={<Navigate to="/demands" replace />} />
              <Route path="/results" element={<TechPage />} />
              <Route path="/team" element={<Navigate to="/results" replace />} />
              <Route path="/demand-square" element={<DemandSquarePage />} />
              <Route path="/tech-square" element={<TechSquarePage />} />
              <Route path="/matching" element={<PlatformPage />} />
              <Route path="/cooperations" element={<Navigate to="/matching" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/drafts" element={<DraftBoxPage />} />
              <Route path="/terminal" element={<TerminalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
