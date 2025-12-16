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
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pixel Placement Helper
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered tool to verify pixel placement on websites
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Check Pixel Placement</h2>
            <PixelChecker onCheck={handleCheck} isLoading={isLoading} />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <CheckResult result={result} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </main>
  )
}
