import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DemandPage } from '@/pages/DemandPage';
import { TechPage } from '@/pages/TechPage';
import { PlatformPage } from '@/pages/PlatformPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SkillsPage } from '@/pages/SkillsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DemandPage />} />
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
