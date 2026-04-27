import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('UI ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-slate-50 text-slate-700">
          <div className="bg-white rounded-xl border border-slate-200 shadow-md px-8 py-6 max-w-md text-center space-y-3">
            <h2 className="text-lg font-bold text-slate-900">页面加载出错</h2>
            <p className="text-sm text-slate-500">
              很抱歉，当前页面渲染出现问题。你可以尝试刷新页面，或返回上一步重试。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-black transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}




