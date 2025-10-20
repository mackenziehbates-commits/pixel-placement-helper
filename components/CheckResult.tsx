'use client'

interface CheckResultProps {
  result: any
  isLoading: boolean
}

export function CheckResult({ result, isLoading }: CheckResultProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Checking pixel placement...</span>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-8 text-gray-500">
        Enter pixel details and click &ldquo;Check Pixel Placement&rdquo; to see results
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              {result.message}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isPass = result.status === 'pass'
  const statusColor = isPass ? 'green' : 'red'
  const statusIcon = isPass ? '✓' : '✗'

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-md p-4`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 text-${statusColor}-400 text-xl font-bold`}>
            {statusIcon}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium text-${statusColor}-800`}>
              {result.status.toUpperCase()}
            </h3>
            <div className={`mt-1 text-sm text-${statusColor}-700`}>
              {result.summary}
            </div>
          </div>
        </div>
      </div>

      {/* Detected Placement */}
      {result.detectedPlacement && (
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Detected Placement</h4>
          <p className="text-sm text-gray-700">{result.detectedPlacement}</p>
        </div>
      )}

      {/* Matched Code */}
      {result.matchedCode && (
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Matched Code Snippet</h4>
          <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto">
            {result.matchedCode}
          </pre>
        </div>
      )}

      {/* Troubleshooting */}
      {result.troubleshooting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Troubleshooting</h4>
          <div className="text-sm text-yellow-700">
            {result.troubleshooting}
          </div>
        </div>
      )}

      {/* Pixel ID Validation */}
      {result.pixelIdResult && (
        <div className={`border rounded-md p-4 ${
          result.pixelIdResult.match 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`text-sm font-medium mb-2 ${
            result.pixelIdResult.match 
              ? 'text-green-800' 
              : 'text-red-800'
          }`}>
            Pixel ID Validation
          </h4>
          <div className={`text-sm ${
            result.pixelIdResult.match 
              ? 'text-green-700' 
              : 'text-red-700'
          }`}>
            {result.pixelIdResult.match ? (
              <div>
                <div className="flex items-center mb-2">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Pixel ID found: {result.pixelIdResult.foundId}</span>
                </div>
                {result.pixelIdResult.context && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">Found in this code:</div>
                    <pre className="text-xs bg-gray-100 p-2 rounded border overflow-x-auto">
                      {result.pixelIdResult.context}
                    </pre>
                  </div>
                )}
              </div>
            ) : result.pixelIdResult.found ? (
              <div className="flex items-center">
                <span className="text-red-600 mr-2">✗</span>
                <span>Pixel ID mismatch: Expected {result.pixelIdResult.expectedId}, found {result.pixelIdResult.foundId}</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-red-600 mr-2">✗</span>
                <span>Pixel ID not found in website code</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Snippet Validation */}
      {result.eventSnippetResult && (
        <div className={`border rounded-md p-4 ${
          result.eventSnippetResult.match 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`text-sm font-medium mb-2 ${
            result.eventSnippetResult.match 
              ? 'text-green-800' 
              : 'text-red-800'
          }`}>
            Event Snippet Validation
          </h4>
          <div className={`text-sm ${
            result.eventSnippetResult.match 
              ? 'text-green-700' 
              : 'text-red-700'
          }`}>
            {result.eventSnippetResult.match ? (
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                <span>Event snippet found on page</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-red-600 mr-2">✗</span>
                <span>Event snippet not found on page</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {result.aiExplanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">AI Analysis</h4>
          <div className="text-sm text-blue-700">
            {result.aiExplanation}
          </div>
        </div>
      )}
    </div>
  )
}
