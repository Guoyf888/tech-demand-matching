import { Demand } from '@/types';

interface AnalysisReportProps {
  demand: Demand;
}

export function AnalysisReport({ demand }: AnalysisReportProps) {
  if (!demand.analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">暂无分析报告，请先配置API并提交需求</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {demand.analysis.industryAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            📊 行业分析
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.industryAnalysis}
          </p>
        </div>
      )}

      {demand.analysis.techRoadmap && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            🛤️ 技术研发路线
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.techRoadmap}
          </p>
        </div>
      )}

      {demand.analysis.suggestions && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            💡 创新建议
          </h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {demand.analysis.suggestions}
          </p>
        </div>
      )}
    </div>
  );
}
