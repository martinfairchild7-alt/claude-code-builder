import { useState } from 'react'
import LogViewer from './LogViewer'
import { useLogs } from '../hooks/useLogs'

interface BuildResult {
  code: string
  language: string
  explanation: string
  filePath?: string
  runUrl?: string
  projectName?: string
}

export default function CodeBuilder() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<BuildResult | null>(null)
  const [error, setError] = useState('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { logs, addUserMessage, addAssistantMessage, addToolCall, addSystemMessage, addError } = useLogs()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Add user message to logs
    addUserMessage(`Generate code: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`)
    addSystemMessage(`Starting code generation with model: Claude`)
    addSystemMessage(`User Agent: ${navigator.userAgent}`, { userAgent: navigator.userAgent })

    setIsLoading(true)
    setError('')
    setResult(null)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      addToolCall('fetch', { endpoint: '/api/generate', method: 'POST' })
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate code')
      }

      const result = await response.json()
      setResult(result)
      addAssistantMessage(`Code generated successfully`, {
        language: result.language,
        codeLength: result.code?.length || 0,
        hasFilePath: !!result.filePath
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Code generation was cancelled.')
        addSystemMessage('Code generation cancelled by user')
      } else {
        setError(err.message || 'Failed to generate code. Please try again.')
        addError(err.message || 'Failed to generate code', err)
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setAbortController(null)
      addSystemMessage('Stopping code generation...')
    }
  }

  const handleRun = async () => {
    if (!result) return

    addSystemMessage('Running generated code...')
    addToolCall('fetch', { endpoint: '/api/generate', method: 'POST', action: 'run' })

    setIsRunning(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          saveAndRun: true,
          code: result.code,
          language: result.language
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to run code')
      }

      const runResult = await response.json()
      setResult(prev => prev ? {...prev, filePath: runResult.filePath, runUrl: runResult.runUrl, projectName: runResult.projectName} : null)
      addAssistantMessage(`Code executed successfully`, {
        filePath: runResult.filePath,
        runUrl: runResult.runUrl,
        projectName: runResult.projectName
      })
    } catch (err: any) {
      setError(err.message || 'Failed to run code. Please try again.')
      addError('Failed to run code', err)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSave = async () => {
    if (!result) return

    addSystemMessage('Saving generated code...')
    addToolCall('fetch', { endpoint: '/api/generate', method: 'POST', action: 'save' })

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          saveAndRun: true,
          code: result.code,
          language: result.language
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save code')
      }

      const saveResult = await response.json()
      setResult(prev => prev ? {...prev, filePath: saveResult.filePath, projectName: saveResult.projectName} : null)
      addAssistantMessage(`Code saved successfully`, {
        filePath: saveResult.filePath,
        projectName: saveResult.projectName
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save code. Please try again.')
      addError('Failed to save code', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (!result) return

    addSystemMessage('Downloading generated code...')
    const filename = `generated-code.${result.language === 'html' ? 'html' : result.language === 'javascript' ? 'js' : 'txt'}`

    const blob = new Blob([result.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addAssistantMessage(`Code downloaded as ${filename}`, { filename, codeLength: result.code.length })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Section */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-white text-lg font-medium mb-3">
              Describe what you want to build
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 px-6 py-4 rounded-2xl bg-white/90 backdrop-blur-sm border-0
                         focus:ring-4 focus:ring-white/30 focus:outline-none resize-none
                         text-gray-800 placeholder-gray-500 text-lg leading-relaxed
                         shadow-inner transition-all duration-300"
              placeholder="Describe your app idea... (e.g., 'Create a todo app with dark mode toggle and local storage')"
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-white/70 text-sm">
                {prompt.length} characters
              </span>
              <div className="flex space-x-3">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white
                             font-semibold rounded-2xl shadow-lg hover:shadow-xl
                             transition-all duration-300"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white
                             font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105
                             transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                             disabled:transform-none disabled:shadow-lg"
                  >
                    Generate Code
                  </button>
                )}
                {isLoading && (
                  <div className="flex items-center text-white/70 text-sm">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                    </svg>
                    <span>Generating code...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-white">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">Generated Code</h3>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                {result.language}
              </span>
              {result.filePath && (
                <span className="px-3 py-1 bg-green-600/20 rounded-full text-green-300 text-sm">
                  Saved: {result.projectName}
                </span>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl
                           transition-colors duration-200 text-sm font-medium flex items-center space-x-2"
                >
                  {isRunning ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                      </svg>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-4-8h2a2 2 0 012 2v8a2 2 0 01-2 2H9a2 2 0 01-2-2V8a2 2 0 012-2z"/>
                      </svg>
                      <span>Run</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl
                           transition-colors duration-200 text-sm font-medium flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl
                           transition-colors duration-200 text-sm font-medium flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Code Preview */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-sm ml-2">Generated Code</span>
              </div>
              <pre className="p-6 text-green-400 font-mono text-sm overflow-x-auto leading-relaxed">
                {result.code}
              </pre>
            </div>

            {/* Explanation */}
            <div className="bg-white/5 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-white mb-3">Explanation</h4>
              <p className="text-white/80 leading-relaxed">{result.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Log Viewer */}
      <LogViewer logs={logs} />
    </div>
  )
}