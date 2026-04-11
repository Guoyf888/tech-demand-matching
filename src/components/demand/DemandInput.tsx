import { useState } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { apiGateway } from '@/services/api/gateway';

interface DemandInputProps {
  onDemandCreated: (demand: Demand) => void;
}

export function DemandInput({ onDemandCreated }: DemandInputProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    setError(null);

    const demand: Demand = {
      id: demandStorage.generateId(),
      title,
      content,
      tags: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    demandStorage.save(demand);
    onDemandCreated(demand);

    // 开始AI分析
    if (apiGateway.isConfigured()) {
      setIsAnalyzing(true);
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `你是一个技术需求分析助手。请分析以下技术需求：
1. 提取关键词和标签
2. 分析需求的核心技术方向
3. 给出简短的技术研发建议

请以JSON格式返回：
{
  "tags": ["标签1", "标签2"],
  "industryAnalysis": "行业分析...",
  "techRoadmap": "技术路线...",
  "suggestions": "创新建议..."
}`,
            },
            { role: 'user', content },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const analysis = JSON.parse(data.choices[0].message.content);
          demand.tags = analysis.tags || [];
          demand.analysis = {
            enterpriseInfo: '基于您输入的需求分析',
            industryAnalysis: analysis.industryAnalysis,
            techRoadmap: analysis.techRoadmap,
            suggestions: analysis.suggestions,
          };
          demand.status = 'completed';
          demand.updatedAt = new Date().toISOString();
          demandStorage.save(demand);
          onDemandCreated(demand);
        }
      } catch (error: any) {
        console.error('分析失败:', error);
        setError(error.message || '分析失败，请检查API配置');
        demand.status = 'completed';
        demand.analysis = {
          enterpriseInfo: 'API调用失败，请检查网络和API配置',
          industryAnalysis: '请确保API Key配置正确且有足够的配额',
          techRoadmap: '',
          suggestions: '',
        };
        demandStorage.save(demand);
        onDemandCreated(demand);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setError('请先在设置中配置API Key');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">输入技术需求</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">需求标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：新能源汽车电池管理系统开发"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">需求详情</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述您的技术需求，包括技术指标、预期目标、预算范围等..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isAnalyzing}
          className="w-full px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '分析中...' : '提交分析'}
        </button>
      </div>
    </div>
  );
}
