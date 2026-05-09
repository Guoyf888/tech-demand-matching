import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { HomePage } from '@/pages/HomePage';
import { DemandPage } from '@/pages/DemandPage';
import { TechPage } from '@/pages/TechPage';
import { PlatformPage } from '@/pages/PlatformPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SkillsPage } from '@/pages/SkillsPage';
import { AIAgentChat } from '@/components/agent/AIAgentChat';
import { DraftBoxPage } from '@/pages/DraftBoxPage';
import { TerminalPage } from '@/pages/TerminalPage';
import { useThemeStore } from '@/store/themeStore';

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
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;