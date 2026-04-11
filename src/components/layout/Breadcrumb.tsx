import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumb() {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: '首页', path: '/' }];

    let currentPath = '';
    paths.forEach((p, index) => {
      currentPath += `/${p}`;
      const labelMap: Record<string, string> = {
        demands: '我的需求',
        reports: '分析报告',
        results: '我的成果',
        team: '团队展示',
        'demand-square': '需求广场',
        'tech-square': '技术广场',
        matching: '智能匹配',
        cooperations: '合作管理',
        settings: '设置',
        skills: '技能市场',
      };
      breadcrumbs.push({
        label: labelMap[p] || p,
        path: index < paths.length - 1 ? currentPath : undefined,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      {breadcrumbs.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">/</span>}
          {item.path ? (
            <Link
              to={item.path}
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === breadcrumbs.length - 1 ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-500'}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
