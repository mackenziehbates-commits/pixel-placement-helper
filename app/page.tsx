'use client'

import { useState } from 'react'
import { PixelChecker } from '@/components/PixelChecker'
import { CheckResult } from '@/components/CheckResult'

export default function Home() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCheck = async (data: {
    url: string
    platform: string
    placement: string
    placementMethod: string
    snippet: string
    eventName: string
    pixelId: string
    eventSnippet: string
  }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/check-pixel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      setResult(result)
    } catch (error) {
      console.error('Error checking pixel:', error)
      setResult({
        status: 'error',
        message: 'Failed to check pixel. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pixel Placement Helper
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered tool to verify pixel placement on websites
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Check Pixel Placement</h2>
            <PixelChecker onCheck={handleCheck} isLoading={isLoading} />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Results</h2>
            <CheckResult result={result} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </main>
  )
}
