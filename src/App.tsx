import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { TopMenu } from '@/components/layout/TopMenu';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { DemandPage } from '@/pages/DemandPage';
import { TechPage } from '@/pages/TechPage';
import { PlatformPage } from '@/pages/PlatformPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SkillsPage } from '@/pages/SkillsPage';
import { themes, useThemeStore } from '@/store/themeStore';

function App() {
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <BrowserRouter>
      <div
        className="min-h-screen flex flex-col transition-colors duration-200"
        style={{
          backgroundColor: themeColors?.background,
          color: themeColors?.text,
        }}
      >
        <TopMenu />
        <Header />
        <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: themeColors?.background }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
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
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
