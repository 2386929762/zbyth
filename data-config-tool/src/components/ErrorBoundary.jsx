import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 bg-red-50 rounded-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">出错了</h2>
          <p className="text-sm text-red-600">{this.state.error?.message || '未知错误'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
