import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';

export function PlatformPage() {
  const [activeMenu, setActiveMenu] = useState('智能匹配');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4">
        <Breadcrumb />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <div className="flex-1 p-6 overflow-y-auto">
          <MatchPanel />
        </div>
      </div>
    </div>
  );
}
