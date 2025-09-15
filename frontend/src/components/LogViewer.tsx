import { useState, useEffect, useRef } from 'react'

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'user' | 'assistant' | 'tool' | 'system' | 'error'
  message: string
  details?: any
}

interface LogViewerProps {
  logs: LogEntry[]
  className?: string
}

export default function LogViewer({ logs, className = '' }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'user':
        return '👤'
      case 'assistant':
        return '🤖'
      case 'tool':
        return '🔧'
      case 'system':
        return '⚙️'
      case 'error':
        return '❌'
      default:
        return '💬'
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'user':
        return 'text-blue-300'
      case 'assistant':
        return 'text-green-300'
      case 'tool':
        return 'text-purple-300'
      case 'system':
        return 'text-yellow-300'
      case 'error':
        return 'text-red-300'
      default:
        return 'text-white'
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-lg
                     shadow-lg hover:bg-black/90 transition-all duration-200
                     flex items-center space-x-2 border border-white/20"
        >
          <span className="text-xs">📋</span>
          <span className="text-sm font-medium">Logs ({logs.length})</span>
          {logs.length > 0 && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-h-80 z-50 ${className}`}>
      <div className="bg-black/90 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs">📋</span>
            <span className="text-sm font-medium text-white">Real-time Logs</span>
            <span className="text-xs text-white/70">({logs.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-xs px-2 py-1 rounded transition-colors
                         ${autoScroll
                           ? 'bg-green-600/20 text-green-300'
                           : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              title="Toggle auto-scroll"
            >
              {autoScroll ? '🔄' : '⏸️'}
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/70 hover:text-white text-lg transition-colors"
              title="Minimize"
            >
              ×
            </button>
          </div>
        </div>

        {/* Logs Container */}
        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
          {logs.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-4">
              No logs yet
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="text-xs">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 text-xs">{getLogIcon(log.type)}</span>
                  <span className="flex-shrink-0 text-white/50 font-mono text-xs min-w-[80px]">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`${getLogColor(log.type)} break-words`}>
                      {log.message}
                    </span>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="text-white/40 cursor-pointer text-xs">
                          Details
                        </summary>
                        <pre className="text-white/60 text-xs mt-1 bg-white/5 p-2 rounded overflow-x-auto">
                          {typeof log.details === 'string'
                            ? log.details
                            : JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}