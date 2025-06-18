import React from 'react'
import ChatInterface from './components/ChatInterface'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            课程教材更新智能体
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-colors duration-200">
            <ChatInterface />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App 