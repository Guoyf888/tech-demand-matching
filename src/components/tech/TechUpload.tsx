import { useState } from 'react';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';
import { apiGateway } from '@/services/api/gateway';

interface TechUploadProps {
  onUploaded: (result: TechResult) => void;
}

export function TechUpload({ onUploaded }: TechUploadProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    setError(null);

    const result: TechResult = {
      id: techStorage.generateId(),
      title,
      content,
      summary: '',
      tags: [],
      teamMembers: [],
      documents: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    techStorage.save(result);
    onUploaded(result);

    if (apiGateway.isConfigured()) {
      setIsProcessing(true);
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `你是一个技术成果分析助手。请分析以下技术成果：
1. 提取关键词和标签
2. 用通俗易懂的语言提炼成果概要（适合非专业人士阅读）

请以JSON格式返回：
{
  "tags": ["标签1", "标签2"],
  "summary": "通俗易懂的成果概要..."
}`,
            },
            { role: 'user', content },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const analysis = JSON.parse(data.choices[0].message.content);
          result.tags = analysis.tags || [];
          result.summary = analysis.summary || '';
          result.status = 'completed';
          result.updatedAt = new Date().toISOString();
          techStorage.save(result);
          onUploaded(result);
        }
      } catch (error: any) {
        console.error('处理失败:', error);
        setError(error.message || '处理失败，请检查API配置');
        result.summary = 'API调用失败，请检查网络和API配置';
        result.status = 'completed';
        techStorage.save(result);
        onUploaded(result);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setError('请先在设置中配置API Key');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">上传技术成果</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">成果标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：基于深度学习的图像识别算法"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">成果详情</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述您的技术成果，包括技术原理、应用场景、创新点、已获成果等..."
            rows={8}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isProcessing}
          className="w-full px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isProcessing ? '处理中...' : '上传并分析'}
        </button>
      </div>
    </div>
  );
}
