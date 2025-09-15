import { useState } from 'react'
import CodeBuilder from './components/CodeBuilder'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Claude Builder
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Transform your ideas into beautiful, functional code with AI-powered development
          </p>
        </div>

        {/* Main Content */}
        <CodeBuilder />
      </div>
    </div>
  )
}

export default App
