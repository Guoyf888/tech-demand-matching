import { Link } from 'react-router-dom';
import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { useRoleStore } from '@/store/roleStore';

export function Header() {
  const { currentRole, setRole } = useRoleStore();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-primary-600">技术需求对接</h1>
          <RoleSwitcher currentRole={currentRole} onRoleChange={setRole} />
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            ⚙️
          </Link>
          <Link
            to="/skills"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            🔌
          </Link>
        </div>
      </div>
    </header>
  );
}
