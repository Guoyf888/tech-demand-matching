import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useThemeStore } from '@/store/themeStore';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const AIAgentChat = lazy(() => import('@/components/agent/AIAgentChat').then(m => ({ default: m.AIAgentChat })));
const DemandPage = lazy(() => import('@/pages/DemandPage').then(m => ({ default: m.DemandPage })));
const TechPage = lazy(() => import('@/pages/TechPage').then(m => ({ default: m.TechPage })));
const PlatformPage = lazy(() => import('@/pages/PlatformPage').then(m => ({ default: m.PlatformPage })));
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

function App() {
  const { theme } = useThemeStore();
  const isDark = theme === 'star-black' || theme === 'tech-blue';

  return (
    <BrowserRouter>
      <div
        className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}
        style={{
          backgroundColor: 'var(--color-bg-layout)',
          color: 'var(--color-text-primary)',
        }}
      >
        <AppSidebar />
        <main
          className="flex-1 overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-layout)',
            marginLeft: 'var(--sidebar-width, 220px)',
            transition: 'margin-left 0.2s ease',
            height: '100vh',
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ai" element={<AIAgentChat />} />
              <Route path="/demands" element={<DemandPage />} />
              <Route path="/reports" element={<DemandPage />} />
              <Route path="/results" element={<TechPage />} />
              <Route path="/team" element={<TechPage />} />
              <Route path="/demand-square" element={<PlatformPage />} />
              <Route path="/tech-square" element={<PlatformPage />} />
              <Route path="/matching" element={<PlatformPage />} />
              <Route path="/cooperations" element={<PlatformPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/drafts" element={<DraftBoxPage />} />
              <Route path="/terminal" element={<TerminalPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;