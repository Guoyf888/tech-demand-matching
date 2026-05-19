import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            页面出现错误
          </h2>
          <p className="text-sm max-w-md text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            className="px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: 'var(--color-primary, #1677FF)' }}
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.href = '/';
            }}
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
