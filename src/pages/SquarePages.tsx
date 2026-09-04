import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CalendarDays,
  FileSearch,
  Folder,
  Search,
  Store,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ResourceActions, type ResourceActionPatch } from '@/components/common/ResourceActions';
import { demandStorage } from '@/services/storage/demandStorage';
import { techStorage } from '@/services/storage/techStorage';
import { NATIONAL_ECONOMIC_INDUSTRIES } from '@/config/industries';
import { extractIndustryTags } from '@/services/documentParser';
import {
  collectResourceGroups,
  sortManagedResources,
  UNGROUPED_VALUE,
} from '@/utils/resourceManagement';
import type { Demand, ResourceManagementFields, TechResult } from '@/types';
import './SquarePages.css';

type SquareItem = ResourceManagementFields & {
  id: string;
  title: string;
  content: string;
  description: string;
  tags: string[];
  updatedAt: string;
  meta?: string;
};

type SquareConfig = {
  kind: 'demand' | 'tech';
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  manageLabel: string;
  managePath: string;
  icon: ReactNode;
  items: SquareItem[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function SquarePage({ config }: { config: SquareConfig }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => sortManagedResources(config.items));
  const [keyword, setKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const groups = useMemo(() => collectResourceGroups(items), [items]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
    return items.filter((item) => {
      const matchesKeyword = !normalizedKeyword || [
        item.title,
        item.description,
        item.group || '',
        ...item.tags,
      ]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(normalizedKeyword);
      const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag);
      const matchesGroup = selectedGroup === 'all'
        || (selectedGroup === UNGROUPED_VALUE && !item.group?.trim())
        || item.group?.trim() === selectedGroup;
      return matchesKeyword && matchesTag && matchesGroup;
    });
  }, [items, keyword, selectedGroup, selectedTag]);

  const hasFilters = keyword.trim().length > 0 || selectedTag !== 'all' || selectedGroup !== 'all';

  const clearFilters = () => {
    setKeyword('');
    setSelectedTag('all');
    setSelectedGroup('all');
  };

  const updateItem = (item: SquareItem, patch: ResourceActionPatch) => {
    const updatedAt = new Date().toISOString();
    if (config.kind === 'demand') {
      const source = demandStorage.getAll().find((demand) => demand.id === item.id);
      if (!source) return;
      demandStorage.save({ ...source, ...patch, updatedAt });
    } else {
      const source = techStorage.getAll().find((result) => result.id === item.id);
      if (!source) return;
      techStorage.save({
        ...source,
        ...patch,
        summary: patch.content !== undefined && patch.content !== source.content ? '' : source.summary,
        updatedAt,
      });
    }

    setItems((current) => sortManagedResources(current.map((currentItem) => {
      if (currentItem.id !== item.id) return currentItem;
      return {
        ...currentItem,
        ...patch,
        description: patch.content ?? currentItem.description,
        updatedAt,
      };
    })));
  };

  const deleteItem = (id: string) => {
    if (config.kind === 'demand') demandStorage.delete(id);
    else techStorage.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className={`square-page square-page-${config.kind}`}>
      <Breadcrumb />

      <header className="square-heading">
        <div className="square-heading-main">
          <div className="square-heading-icon" aria-hidden="true">{config.icon}</div>
          <div>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </div>
        <div className="square-summary" aria-label={`当前收录 ${items.length} 项`}>
          <strong>{items.length}</strong>
          <span>可对接资源</span>
        </div>
      </header>

      <section className="square-toolbar" aria-label="资源筛选">
        <label className="square-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">搜索</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={config.kind === 'demand' ? '搜索需求名称、描述或标签' : '搜索成果名称、简介或标签'}
          />
        </label>

        <label className="square-tag-filter">
          <Tags size={16} aria-hidden="true" />
          <span className="sr-only">按标签筛选</span>
          <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
            <option value="all">全部行业</option>
            {NATIONAL_ECONOMIC_INDUSTRIES.map((industry) => (
              <option key={industry.code} value={industry.name}>{industry.code} {industry.name}</option>
            ))}
          </select>
        </label>

        <label className="square-group-filter">
          <Folder size={16} aria-hidden="true" />
          <span className="sr-only">按分组筛选</span>
          <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
            <option value="all">全部分组</option>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
            <option value={UNGROUPED_VALUE}>未分组</option>
          </select>
        </label>

        {hasFilters && (
          <button className="square-clear-button" onClick={clearFilters} title="清除筛选" aria-label="清除筛选">
            <X size={17} aria-hidden="true" />
          </button>
        )}

        <span className="square-result-count">找到 {filteredItems.length} 项</span>
      </section>

      <main className="square-content">
        {filteredItems.length > 0 ? (
          <div className="square-grid">
            {filteredItems.map((item) => (
              <article className="square-card" key={item.id}>
                <div className="square-card-topline">
                  <span className="square-type-label">
                    {config.kind === 'demand' ? <Building2 size={14} /> : <Award size={14} />}
                    {config.kind === 'demand' ? '企业需求' : '技术成果'}
                  </span>
                  <div className="square-card-controls">
                    <span className="square-ready-status">可对接</span>
                    <ResourceActions
                      kind={config.kind}
                      item={item}
                      groups={groups}
                      onUpdate={(patch) => updateItem(item, patch)}
                      onDelete={() => deleteItem(item.id)}
                      compact
                    />
                  </div>
                </div>

                <h2>{item.title || (config.kind === 'demand' ? '未命名需求' : '未命名成果')}</h2>
                <p className="square-card-description">{item.description || '暂无详细说明'}</p>

                <div className="square-card-tags" aria-label="领域标签">
                  {item.group && <span className="square-card-group"><Folder size={11} />{item.group}</span>}
                  {item.tags.length > 0
                    ? item.tags.slice(0, item.group ? 3 : 4).map((tag) => <span key={tag}>{tag}</span>)
                    : !item.group && <span>未分类</span>}
                </div>

                <footer className="square-card-footer">
                  <div className="square-card-meta">
                    <span><CalendarDays size={14} />{formatDate(item.updatedAt)}</span>
                    {item.meta && <span><Users size={14} />{item.meta}</span>}
                  </div>
                  <button onClick={() => navigate('/matching')}>
                    进入匹配
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="square-empty">
            <FileSearch size={36} aria-hidden="true" />
            <h2>{hasFilters ? '没有符合条件的资源' : config.emptyTitle}</h2>
            <p>{hasFilters ? '尝试更换关键词、行业或分组。' : config.emptyDescription}</p>
            <button onClick={hasFilters ? clearFilters : () => navigate(config.managePath)}>
              {hasFilters ? '清除筛选' : config.manageLabel}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function mapDemand(demand: Demand): SquareItem {
  const inferredIndustries = extractIndustryTags(`${demand.title}\n${demand.content}`);
  return {
    id: demand.id,
    title: demand.title,
    content: demand.content,
    description: demand.content,
    tags: Array.from(new Set([...inferredIndustries, ...demand.tags])),
    updatedAt: demand.updatedAt,
    group: demand.group,
    pinned: demand.pinned,
    starred: demand.starred,
  };
}

function mapTechResult(result: TechResult): SquareItem {
  const inferredIndustries = extractIndustryTags(`${result.title}\n${result.summary || ''}\n${result.content}`);
  return {
    id: result.id,
    title: result.title,
    content: result.content,
    description: result.summary || result.content,
    tags: Array.from(new Set([...inferredIndustries, ...result.tags])),
    updatedAt: result.updatedAt,
    meta: `${result.teamMembers?.length || 0} 位成员`,
    group: result.group,
    pinned: result.pinned,
    starred: result.starred,
  };
}

export function DemandSquarePage() {
  const items = demandStorage.getAll()
    .filter((demand) => demand.status === 'completed')
    .map(mapDemand);

  return (
    <SquarePage
      config={{
        kind: 'demand',
        title: '需求广场',
        description: '浏览已完成分析的企业技术需求，发现可对接的真实业务场景。',
        emptyTitle: '暂无可对接需求',
        emptyDescription: '完成需求分析后，符合条件的内容会展示在这里。',
        manageLabel: '前往需求管理',
        managePath: '/demands',
        icon: <Store size={21} />,
        items,
      }}
    />
  );
}

export function TechSquarePage() {
  const items = techStorage.getAll()
    .filter((result) => result.status === 'completed')
    .map(mapTechResult);

  return (
    <SquarePage
      config={{
        kind: 'tech',
        title: '成果广场',
        description: '集中展示可转化的技术成果与团队能力，快速定位供给资源。',
        emptyTitle: '暂无可展示成果',
        emptyDescription: '完成成果解析后，符合条件的内容会展示在这里。',
        manageLabel: '前往成果管理',
        managePath: '/results',
        icon: <Award size={21} />,
        items,
      }}
    />
  );
}
