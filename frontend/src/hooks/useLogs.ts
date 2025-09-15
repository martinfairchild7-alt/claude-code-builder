import { useState, useCallback } from 'react'
import type { LogEntry } from '../components/LogViewer'

const MAX_LOGS = 100

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((
    type: LogEntry['type'],
    message: string,
    details?: any
  ) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details
    }

    setLogs(prevLogs => {
      const newLogs = [...prevLogs, newLog]
      // Keep only the latest MAX_LOGS entries
      if (newLogs.length > MAX_LOGS) {
        return newLogs.slice(-MAX_LOGS)
      }
      return newLogs
    })
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const addUserMessage = useCallback((message: string) => {
    addLog('user', message)
  }, [addLog])

  const addAssistantMessage = useCallback((message: string, details?: any) => {
    addLog('assistant', message, details)
  }, [addLog])

  const addToolCall = useCallback((toolName: string, params?: any) => {
    addLog('tool', `Tool: ${toolName}`, params)
  }, [addLog])

  const addSystemMessage = useCallback((message: string, details?: any) => {
    addLog('system', message, details)
  }, [addLog])

  const addError = useCallback((error: string | Error, details?: any) => {
    const errorMessage = error instanceof Error ? error.message : error
    addLog('error', errorMessage, details)
  }, [addLog])

  return {
    logs,
    addLog,
    clearLogs,
    addUserMessage,
    addAssistantMessage,
    addToolCall,
    addSystemMessage,
    addError
  }
}