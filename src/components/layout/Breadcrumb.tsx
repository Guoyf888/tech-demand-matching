import { Link, useLocation } from 'react-router-dom';
import { useThemeColors } from '@/store/themeStore';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumb() {
  const location = useLocation();

  const themeColors = useThemeColors();

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
        'tech-square': '成果广场',
        matching: '专业匹配工作台',
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
    <div
      className="flex items-center gap-2 text-sm mb-4"
      style={{ color: themeColors?.textSecondary }}
    >
      {breadcrumbs.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && (
            <span className="mx-2" style={{ color: themeColors?.textHint }}>
              /
            </span>
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="hover:underline transition-colors"
              style={{ color: themeColors?.primary }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={
                index === breadcrumbs.length - 1
                  ? 'font-medium'
                  : ''
              }
              style={{
                color: index === breadcrumbs.length - 1
                  ? themeColors?.text
                  : themeColors?.textHint,
              }}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
