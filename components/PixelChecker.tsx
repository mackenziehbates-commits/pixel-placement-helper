'use client'

import { useState } from 'react'

interface PixelCheckerProps {
  onCheck: (data: {
    url: string
    platform: string
    placement: string
    placementMethod: string
    snippet: string
    eventName: string
    pixelId: string
    eventSnippet: string
  }) => void
  isLoading: boolean
}

const PLATFORMS = [
  'Amazon',
  'Facebook',
  'Xandr',
  'TikTok',
  'Google Ads',
  'GroundTruth',
  'LinkedIn',
  'Nextdoor',
  'Pinterest',
  'Reddit',
  'Snapchat'
]

const PLACEMENTS = [
  'Head',
  'Body',
  'Trigger: Page URL contains',
  'No specific placement'
]

const PLACEMENT_METHODS = [
  'HTML Placement',
  'GTM Placement'
]

export function PixelChecker({ onCheck, isLoading }: PixelCheckerProps) {
  const [formData, setFormData] = useState({
    url: '',
    platform: '',
    placement: '',
    placementMethod: 'HTML Placement',
    snippet: '',
    eventName: '',
    triggerContains: '',
    pixelId: '',
    eventSnippet: ''
  })
  const [originalSnippet, setOriginalSnippet] = useState('')
  const [showNormalized, setShowNormalized] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.url && formData.platform && formData.placement && formData.pixelId) {
      if (formData.placement === 'Trigger: Page URL contains' && !formData.triggerContains) {
        return
      }
      onCheck(formData)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const normalizeSnippet = (text: string) => {
    return text
      .replace(/[""]/g, '"')  // Convert smart quotes to straight quotes
      .replace(/['']/g, "'")  // Convert smart single quotes
      .replace(/""/g, '"')    // Remove doubled quotes
      .replace(/''/g, "'")    // Remove doubled single quotes
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .trim()
  }

  const handleSnippetChange = (value: string) => {
    setOriginalSnippet(value)
    setFormData(prev => ({ ...prev, snippet: value }))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const normalized = normalizeSnippet(pastedText)
    setOriginalSnippet(normalized)
    setFormData(prev => ({ ...prev, snippet: normalized }))
  }

  const applyNormalization = () => {
    const normalized = normalizeSnippet(formData.snippet)
    setFormData(prev => ({ ...prev, snippet: normalized }))
    setShowNormalized(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website URL *
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => handleChange('url', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Platform *
        </label>
        <select
          value={formData.platform}
          onChange={(e) => handleChange('platform', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select platform</option>
          {PLATFORMS.map(platform => (
            <option key={platform} value={platform}>{platform}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Placement Method *
        </label>
        <select
          value={formData.placementMethod}
          onChange={(e) => handleChange('placementMethod', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {PLACEMENT_METHODS.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-1">
          {formData.placementMethod === 'HTML Placement' 
            ? 'Pixel code is directly in the website HTML source'
            : 'Pixel code is loaded via Google Tag Manager (GTM)'
          }
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Suggested Placement *
        </label>
        <select
          value={formData.placement}
          onChange={(e) => handleChange('placement', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select placement</option>
          {PLACEMENTS.map(placement => (
            <option key={placement} value={placement}>{placement}</option>
          ))}
        </select>
      </div>

      {formData.placement === 'Trigger: Page URL contains' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL must contain *
          </label>
          <input
            type="text"
            value={formData.triggerContains}
            onChange={(e) => handleChange('triggerContains', e.target.value)}
            placeholder="e.g., northlakebargaincenter.com/"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Name
        </label>
        <input
          type="text"
          value={formData.eventName}
          onChange={(e) => handleChange('eventName', e.target.value)}
          placeholder="e.g., Purchase, PageView, AddToCart"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pixel ID *
        </label>
        <input
          type="text"
          value={formData.pixelId}
          onChange={(e) => handleChange('pixelId', e.target.value)}
          placeholder="e.g., 529220869977378 (Facebook), G-XXXXXXXXX (Google)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base Pixel Snippet (Optional)
        </label>
        <div className="space-y-2">
          <textarea
            value={formData.snippet}
            onChange={(e) => handleSnippetChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste your base pixel code here (e.g., initialization code)..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyNormalization}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            >
              Fix Quotes & Normalize
            </button>
            {showNormalized && (
              <span className="text-sm text-green-600 flex items-center">
                ✓ Normalized
              </span>
            )}
          </div>
          {formData.snippet && (formData.snippet.includes('""') || formData.snippet.includes('"') || formData.snippet.includes('"')) && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Detected smart quotes or doubled quotes. Click "Fix Quotes & Normalize" to clean up.
            </div>
          )}
        </div>
      </div>

      {(formData.platform === 'Xandr' || formData.platform === 'Google Ads') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Snippet (Optional)
          </label>
          <div className="space-y-2">
            <textarea
              value={formData.eventSnippet}
              onChange={(e) => handleChange('eventSnippet', e.target.value)}
              placeholder={
                formData.platform === 'Xandr' 
                  ? "Paste your event code here (e.g., pixie('event', 'PageView'))..."
                  : "Paste your event code here (e.g., gtag('event', 'purchase'))..."
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <div className="text-sm text-gray-500">
              {formData.platform === 'Xandr' 
                ? 'For Xandr platforms that have separate base + event code'
                : 'For Google Ads platforms that have separate base + event code'
              }
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Checking...' : 'Check Pixel Placement'}
      </button>
    </form>
  )
}
