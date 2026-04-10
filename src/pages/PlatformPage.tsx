import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MatchPanel } from '@/components/platform/MatchPanel';

export function PlatformPage() {
  const [activeMenu, setActiveMenu] = useState('智能匹配');

  return (
    <div className="flex h-full">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      <div className="flex-1 p-6 overflow-y-auto">
        <MatchPanel />
      </div>
    </div>
  );
}
