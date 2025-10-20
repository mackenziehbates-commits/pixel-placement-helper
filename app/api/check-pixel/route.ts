import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'node-html-parser'
import { z } from 'zod'
import puppeteer from 'puppeteer'

const checkPixelSchema = z.object({
  url: z.string().url(),
  platform: z.string(),
  placement: z.enum(['Head', 'Body', 'Trigger: Page URL contains', 'No specific placement']),
  placementMethod: z.enum(['HTML Placement', 'GTM Placement']),
  snippet: z.string().optional(),
  eventName: z.string().optional(),
  triggerContains: z.string().optional(),
  pixelId: z.string(),
  eventSnippet: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received request body:', body)
    const { url, platform, placement, placementMethod, snippet, eventName, triggerContains, pixelId, eventSnippet } = checkPixelSchema.parse(body)
    console.log('Parsed placement method:', placementMethod)

    // Fetch the website HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PixelPlacementHelper/1.0)'
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Failed to fetch website: ${response.status} ${response.statusText}`
      })
    }

    const html = await response.text()
    const root = parse(html)

    // Choose detection method based on placement method
    if (placementMethod === 'HTML Placement') {
      console.log('Using static detection for HTML placement')
      const staticResult = await checkPixelPlacement(root, url, snippet || '', placement, platform, eventName, triggerContains, pixelId, eventSnippet)
      return NextResponse.json({
        ...staticResult,
        method: 'static'
      })
    } else {
      console.log('Using browser automation for GTM placement')
      const browserResult = await checkPixelWithBrowser(url, platform, pixelId, eventName)
      
      if (browserResult.success) {
        // Process browser results
        const { pixelIdResult, vendorHit, externalHit } = browserResult
        
        if (pixelIdResult && pixelIdResult.found && pixelIdResult.match) {
          console.log('Browser detection found pixel ID')
          return NextResponse.json({
            status: 'pass',
            summary: 'Pixel detected via browser automation (GTM)',
            detectedPlacement: 'Found via GTM/browser detection',
            matchedCode: pixelIdResult.context,
            troubleshooting: 'No specific issues detected',
            issues: [],
            pixelIdResult,
            method: 'browser'
          })
        }
        
        if (vendorHit) {
          console.log('Browser detection found vendor pattern')
          return NextResponse.json({
            status: 'pass',
            summary: 'Pixel detected via browser automation (vendor pattern)',
            detectedPlacement: 'Found via GTM/browser detection',
            matchedCode: vendorHit.context,
            troubleshooting: 'No specific issues detected',
            issues: [],
            method: 'browser'
          })
        }
        
        if (externalHit) {
          console.log('Browser detection found external script')
          return NextResponse.json({
            status: 'pass',
            summary: 'Pixel detected via browser automation (external script)',
            detectedPlacement: externalHit.placement,
            matchedCode: externalHit.context,
            troubleshooting: 'No specific issues detected',
            issues: [],
            method: 'browser'
          })
        }
      }
      
      // If browser detection failed, return error
      return NextResponse.json({
        status: 'fail',
        summary: browserResult.error ? `Browser automation failed: ${browserResult.details || browserResult.error}` : 'Pixel not found via browser automation (GTM)',
        detectedPlacement: 'Not found',
        troubleshooting: browserResult.error ? 
          `Browser automation error: ${browserResult.details || browserResult.error}` :
          'The pixel was not found using browser automation. Please verify the GTM implementation is correct and the pixel is firing.',
        issues: [],
        method: 'browser'
      })
    }

  } catch (error) {
    console.error('Error checking pixel:', error)
    return NextResponse.json({
      status: 'error',
      message: 'An error occurred while checking the pixel'
    })
  }
}

async function checkPixelPlacement(
  root: ReturnType<typeof parse>,
  pageUrl: string,
  snippet: string,
  expectedPlacement: 'Head' | 'Body' | 'Trigger: Page URL contains' | 'No specific placement',
  platform: string,
  eventName?: string,
  triggerContains?: string,
  pixelId?: string,
  eventSnippet?: string
) {
  // Normalize the snippet for comparison (remove extra whitespace, normalize quotes)
  const normalizedSnippet = snippet ? snippet
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'") : ''

  // Loose normalization to handle minification/formatting differences
  const normalizeLoose = (s: string) => s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\n\r\t]/g, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/[;]+/g, ';')
    .replace(/[\"\'`]/g, '')
    .replace(/\)\s*\{/g, '){')
    .replace(/\}\s*\)/g, '})')

  // Search for the pixel in the entire document
  const html = root.toString()
  const normalizedHtml = html
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'")

  // Exact-ish match (only if snippet provided)
  let snippetFound = false
  if (snippet && normalizedSnippet) {
    snippetFound = normalizedHtml.includes(normalizedSnippet)
    // Fuzzy match if exact fails
    if (!snippetFound) {
      const looseHtml = normalizeLoose(html)
      const looseSnippet = normalizeLoose(snippet)
      snippetFound = looseHtml.includes(looseSnippet)
    }
  }

  // Debug logging
  console.log('Debug info:', {
    url: pageUrl,
    platform,
    expectedPlacement,
    triggerContains,
    snippetLength: snippet.length,
    snippetPreview: snippet.substring(0, 100) + '...',
    htmlLength: html.length,
    snippetFound,
    normalizedSnippetPreview: normalizedSnippet.substring(0, 100) + '...'
  })
  
  // Additional debugging for Facebook
  if (platform === 'Facebook') {
    console.log('Facebook debug:')
    console.log('Looking for pixel ID:', pixelId)
    console.log('HTML contains fbq:', html.toLowerCase().includes('fbq'))
    console.log('HTML contains facebook:', html.toLowerCase().includes('facebook'))
    console.log('HTML contains connect.facebook.net:', html.toLowerCase().includes('connect.facebook.net'))
    console.log('HTML contains pixel ID:', html.toLowerCase().includes(pixelId?.toLowerCase() || ''))
    
    // Show a sample of the HTML to see what's actually there
    const fbqIndex = html.toLowerCase().indexOf('fbq')
    if (fbqIndex > -1) {
      console.log('Found fbq at index:', fbqIndex)
      console.log('Context around fbq:', html.substring(Math.max(0, fbqIndex - 50), Math.min(html.length, fbqIndex + 200)))
    } else {
      console.log('No fbq found in HTML')
    }
  }

  // Additional platform debugging
  if (platform === 'Xandr') {
    const hasPixie = html.toLowerCase().includes('pixie')
    const hasAdnxs = html.toLowerCase().includes('adnxs')
    const hasAcdn = html.toLowerCase().includes('acdn')
    const hasXandr = html.toLowerCase().includes('xandr')
    const hasUniversal = html.toLowerCase().includes('universal')
    console.log('Xandr debug:', { hasPixie, hasAdnxs, hasAcdn, hasXandr, hasUniversal })
    
    // Look for any script tags with adnxs
    const scripts = root.querySelectorAll('script[src]')
    const adnxsScripts = Array.from(scripts).filter(script => 
      script.getAttribute('src')?.includes('adnxs')
    )
    console.log('Xandr scripts found:', adnxsScripts.map(s => s.getAttribute('src')))
    
    // Look for any inline scripts that might contain Xandr code
    const inlineScripts = root.querySelectorAll('script:not([src])')
    const xandrInlineScripts = Array.from(inlineScripts).filter(script => {
      const content = script.innerHTML.toLowerCase()
      return content.includes('pixie') || content.includes('adnxs') || content.includes('xandr')
    })
    console.log('Xandr inline scripts found:', xandrInlineScripts.length)
    if (xandrInlineScripts.length > 0) {
      console.log('First inline script content:', xandrInlineScripts[0].innerHTML.substring(0, 200))
    }
    
    // Check for any tracking-related terms that might be Xandr
    const hasTracking = html.toLowerCase().includes('tracking')
    const hasPixel = html.toLowerCase().includes('pixel')
    const hasDmp = html.toLowerCase().includes('dmp')
    const hasUuid = html.toLowerCase().includes('f3962a6e-f576-4c96-a1d7-6f87bd6f93cd')
    console.log('Other tracking terms:', { hasTracking, hasPixel, hasDmp, hasUuid })
    
    // Check all script tags for any content
    const allScripts = root.querySelectorAll('script')
    console.log('Total scripts found:', allScripts.length)
    console.log('Script sources:', Array.from(allScripts).slice(0, 5).map(s => s.getAttribute('src') || 'inline'))
  }
  
  if (platform === 'LinkedIn') {
    const hasLintrk = html.toLowerCase().includes('lintrk')
    const hasLinkedin = html.toLowerCase().includes('linkedin')
    const hasSnap = html.toLowerCase().includes('snap.licdn.com')
    const hasPartnerId = html.toLowerCase().includes('7896068')
    const hasPxAds = html.toLowerCase().includes('px.ads.linkedin.com')
    console.log('LinkedIn debug:', { hasLintrk, hasLinkedin, hasSnap, hasPartnerId, hasPxAds })
    
    // Look for LinkedIn external scripts
    const scripts = root.querySelectorAll('script[src]')
    const linkedinScripts = Array.from(scripts).filter(script => 
      script.getAttribute('src')?.includes('licdn.com')
    )
    console.log('LinkedIn scripts found:', linkedinScripts.map(s => s.getAttribute('src')))
    
    // Check for any tracking-related content
    const hasTracking = html.toLowerCase().includes('tracking')
    const hasPixel = html.toLowerCase().includes('pixel')
    const hasAnalytics = html.toLowerCase().includes('analytics')
    console.log('LinkedIn tracking terms:', { hasTracking, hasPixel, hasAnalytics })
  }
  
  if (platform === 'TikTok') {
    const hasTtq = html.toLowerCase().includes('ttq')
    const hasTiktok = html.toLowerCase().includes('tiktok')
    const hasAnalytics = html.toLowerCase().includes('analytics.tiktok.com')
    const hasPixelId = html.toLowerCase().includes('D31FQL3C77UF8A0EI6GG')
    console.log('TikTok debug:', { hasTtq, hasTiktok, hasAnalytics, hasPixelId })
    
    // Look for TikTok external scripts
    const scripts = root.querySelectorAll('script[src]')
    const tiktokScripts = Array.from(scripts).filter(script => 
      script.getAttribute('src')?.includes('tiktok.com')
    )
    console.log('TikTok scripts found:', tiktokScripts.map(s => s.getAttribute('src')))
    
    // Check for any tracking-related content
    const hasTracking = html.toLowerCase().includes('tracking')
    const hasPixel = html.toLowerCase().includes('pixel')
    console.log('TikTok tracking terms:', { hasTracking, hasPixel })
  }
  
  if (!snippetFound) {
    console.log('Snippet not found, trying fallback detection...')
    
    // Try vendor-specific detection first
    const vendorHit = detectVendorPixel(root, platform, snippet, eventName)
    console.log('Vendor hit:', vendorHit)
    
    if (vendorHit) {
      const placementGuess = root.querySelector('head')?.toString().includes(vendorHit.matchFragment) ? 'Found in <head> section' :
        (root.querySelector('body')?.toString().includes(vendorHit.matchFragment) ? 'Found in <body> section' : 'Found in page but placement unclear')
      return {
        status: 'pass',
        summary: 'Pixel detected by vendor signature (fuzzy match)',
        detectedPlacement: placementGuess,
        matchedCode: vendorHit.context,
        troubleshooting: 'No specific issues detected',
        issues: [],
        aiExplanation: null
      }
    }

    // Try external script detection
    console.log('Trying external script detection...')
    const externalHit = await detectExternalPixel(root, platform, snippet, eventName)
    console.log('External hit:', externalHit)
    
    if (externalHit) {
      return {
        status: 'pass',
        summary: 'Pixel detected via external script loading',
        detectedPlacement: externalHit.placement,
        matchedCode: externalHit.context,
        troubleshooting: 'No specific issues detected',
        issues: [],
        aiExplanation: null
      }
    }

    // If still not found, return the original error
    return {
      status: 'fail',
      summary: 'Pixel snippet not found on the page',
      detectedPlacement: 'Not found',
      troubleshooting: 'The provided pixel snippet was not found anywhere on the page. Please verify the snippet is correct and has been properly implemented.',
      aiExplanation: null
    }
  }

  // Check placement in head vs body
  const headContent = root.querySelector('head')?.innerHTML || ''
  const bodyContent = root.querySelector('body')?.innerHTML || ''
  
  const normalizedHeadContent = headContent
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'")
  
  const normalizedBodyContent = bodyContent
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'")

  const inHead = normalizedHeadContent.includes(normalizedSnippet)
  const inBody = normalizedBodyContent.includes(normalizedSnippet)

  let detectedPlacement = ''
  let isCorrectPlacement = false

  if (inHead && inBody) {
    detectedPlacement = 'Found in both <head> and <body> sections'
    isCorrectPlacement = expectedPlacement === 'Head' || expectedPlacement === 'Body' || expectedPlacement === 'No specific placement'
  } else if (inHead) {
    detectedPlacement = 'Found in <head> section'
    isCorrectPlacement = expectedPlacement === 'Head' || expectedPlacement === 'No specific placement'
  } else if (inBody) {
    detectedPlacement = 'Found in <body> section'
    isCorrectPlacement = expectedPlacement === 'Body' || expectedPlacement === 'No specific placement'
  } else {
    detectedPlacement = 'Found in page but placement unclear'
    isCorrectPlacement = expectedPlacement === 'No specific placement'
  }

  // Trigger rule validation
  if (expectedPlacement === 'Trigger: Page URL contains') {
    const containsRule = (triggerContains || '').trim()
    const urlMatches = containsRule ? pageUrl.includes(containsRule) : false
    detectedPlacement = urlMatches
      ? `URL matches rule: contains "${containsRule}"`
      : `URL does not match rule: contains "${containsRule}"`
    isCorrectPlacement = urlMatches
    
    // For URL triggers, we still need to verify the pixel is present
    if (!snippetFound) {
      return {
        status: 'fail',
        summary: 'Pixel snippet not found on the page',
        detectedPlacement: 'Not found',
        troubleshooting: 'The provided pixel snippet was not found anywhere on the page. Please verify the snippet is correct and has been properly implemented.',
        aiExplanation: null
      }
    }
  }

  // Extract the matched code snippet
  const matchedCode = extractMatchedCode(root, normalizedSnippet)

  // Check for common issues
  let issues = checkForIssues(normalizedSnippet, platform, eventName)
  // Also analyze the actual code found on the page for issues (e.g., doubled/smart quotes)
  if (matchedCode && typeof matchedCode === 'string') {
    const pageIssues = checkForIssuesInCode(matchedCode, platform, eventName)
    issues = Array.from(new Set([...
      issues,
      ...pageIssues
    ]))
  }

  // Event name presence across full HTML (raw + basic entity-decoded)
  if (eventName) {
    const lowerEvent = eventName.toLowerCase()
    const lowerHtml = html.toLowerCase()
    const decodedHtml = basicDecodeHtmlEntities(lowerHtml)
    const eventPresent = lowerHtml.includes(lowerEvent) || decodedHtml.includes(lowerEvent)
    if (eventPresent) {
      issues = issues.filter(i => !i.toLowerCase().includes('event name'))
    }
  }

  // Pixel ID validation and search
  let pixelIdResult = null
  if (pixelId) {
    pixelIdResult = validatePixelId(html, platform, pixelId)
    if (pixelIdResult.mismatch) {
      issues.push(`Pixel ID mismatch: Expected ${pixelId}, found ${pixelIdResult.foundId}`)
    }
    
    // If we found the pixel ID, treat it as a successful detection
    if (pixelIdResult.found && pixelIdResult.match) {
      snippetFound = true
      detectedPlacement = 'Found via Pixel ID search'
      isCorrectPlacement = true
    }
  }

  // Event snippet validation (for platforms like Xandr)
  let eventSnippetResult = null
  if (eventSnippet) {
    eventSnippetResult = validateEventSnippet(html, eventSnippet, platform)
    if (!eventSnippetResult.found) {
      issues.push('Event snippet not found on the page')
    }
  }


  // Generate troubleshooting advice
  const troubleshooting = generateTroubleshooting(
    isCorrectPlacement, 
    expectedPlacement, 
    detectedPlacement, 
    issues,
    platform
  )

  const status = isCorrectPlacement && issues.length === 0 ? 'pass' : 'fail'
  const summary = status === 'pass' 
    ? 'Pixel is correctly placed and configured'
    : (issues.length > 0
      ? `Pixel found but issues detected: ${issues[0]}`
      : 'Pixel placement or configuration needs attention')

  return {
    status,
    summary,
    detectedPlacement,
    matchedCode,
    troubleshooting,
    issues,
    pixelIdResult,
    eventSnippetResult,
    aiExplanation: null // We'll add AI explanation later
  }
}

function extractMatchedCode(root: ReturnType<typeof parse>, normalizedSnippet: string): string {
  const scripts = root.querySelectorAll('script')
  for (const script of scripts) {
    const scriptContent = script.innerHTML || ''
    const normalizedScriptContent = scriptContent
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/"/g, '"')
      .replace(/'/g, "'")
    if (normalizedScriptContent.includes(normalizedSnippet)) {
      const index = normalizedScriptContent.indexOf(normalizedSnippet)
      const start = Math.max(0, index - 100)
      const end = Math.min(normalizedScriptContent.length, index + normalizedSnippet.length + 100)
      return normalizedScriptContent.substring(start, end)
    }
  }
  return 'Code snippet found but could not extract context'
}

function detectVendorPixel(
  root: ReturnType<typeof parse>,
  platform: string,
  snippet: string,
  eventName?: string
) {
  const bodyText = root.toString().toLowerCase()
  const vendors: Record<string, RegExp[]> = {
    'Facebook': [/fbq\s*\(/, /facebook.*pixel/i],
    'Google Ads': [/gtag\s*\(/, /google-?ads|googletagmanager/i],
    'TikTok': [/ttq\s*\./, /tiktok-?analytics/i],
    'Pinterest': [/pintrk\s*\(/, /ct\.pinimg\.com|pinterest/i],
    'LinkedIn': [/lintrk\s*\(/, /snap\.licdn\.com/i, /_linkedin_partner_id/i, /linkedin_data_partner_ids/i],
    'Snapchat': [/snaptr\s*\(/, /sc-static\.net/i],
    'Reddit': [/rdt\s*\(/, /www\.redditstatic\.com/i],
    'Amazon': [/amzn-?pixels?/i, /aax\.amazon-adsystem\.com/i],
    'Xandr': [/pixie\s*\(/, /acdn\.adnxs\.com.*pixie/i, /adnxs\.com/i],
    'GroundTruth': [/groundtruth/i],
    'Nextdoor': [/nextdoor/i]
  }

  const patterns = vendors[platform] || []
  for (const pattern of patterns) {
    if (pattern.test(bodyText)) {
      const idx = bodyText.search(pattern)
      const context = bodyText.substring(Math.max(0, idx - 120), Math.min(bodyText.length, idx + 240))
      return { matchFragment: pattern.source, context }
    }
  }
  return null
}

function checkForIssues(snippet: string, platform: string, eventName?: string): string[] {
  const issues: string[] = []

  // Check for double quotes
  if (snippet.includes('""')) {
    issues.push('Double quotes detected - should be single quotes or proper escaped quotes')
  }

  // Check for common syntax issues
  if (snippet.includes('&quot;')) {
    issues.push('HTML entities detected - should use proper quotes')
  }

  // Platform-specific checks
  if (platform === 'Facebook' && !snippet.includes('fbq')) {
    issues.push('Facebook pixel should contain fbq function')
  }

  if (platform === 'Google Ads' && !snippet.includes('gtag')) {
    issues.push('Google Ads pixel should contain gtag function')
  }

  if (platform === 'TikTok' && !snippet.includes('ttq')) {
    issues.push('TikTok pixel should contain ttq function')
  }

  // Check for event name if provided
  if (eventName && !snippet.toLowerCase().includes(eventName.toLowerCase())) {
    issues.push(`Event name "${eventName}" not found in pixel snippet`)
  }

  return issues
}

function checkForIssuesInCode(code: string, platform: string, eventName?: string): string[] {
  const issues: string[] = []
  const hasDoubleDoubleQuotes = /"{2,}/.test(code)
  const hasSmartQuotes = /[“”‘’]/.test(code)
  if (hasDoubleDoubleQuotes) {
    issues.push('Page code contains doubled quotes ("") which can break pixels')
  }
  if (hasSmartQuotes) {
    issues.push('Smart quotes detected (e.g., “ ” ‘ ’) — replace with straight quotes')
  }
  // Event name check in page code too
  if (eventName && !code.toLowerCase().includes(eventName.toLowerCase())) {
    issues.push(`Event name "${eventName}" not found in detected code`)
  }
  return issues
}

function generateTroubleshooting(
  isCorrectPlacement: boolean,
  expectedPlacement: string,
  detectedPlacement: string,
  issues: string[],
  platform: string
): string {
  let advice = []

  if (!isCorrectPlacement) {
    if (expectedPlacement.includes('<head>') && detectedPlacement.includes('<body>')) {
      advice.push('Move the pixel code from the <body> section to the <head> section')
    } else if (expectedPlacement.includes('<body>') && detectedPlacement.includes('<head>')) {
      advice.push('Move the pixel code from the <head> section to the <body> section')
    }
  }

  if (issues.length > 0) {
    advice.push('Fix the following issues:')
    issues.forEach(issue => advice.push(`• ${issue}`))
  }

  // Platform-specific advice
  if (platform === 'Facebook') {
    advice.push('Ensure the pixel is placed before the closing </head> tag for optimal performance')
  }

  if (platform === 'Google Ads') {
    advice.push('Google Ads pixels work best when placed in the <head> section')
  }

  return advice.length > 0 ? advice.join('\n') : 'No specific issues detected'
}

function basicDecodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function detectExternalPixel(
  root: ReturnType<typeof parse>,
  platform: string,
  snippet: string,
  eventName?: string
) {
  const scripts = root.querySelectorAll('script[src]')
  const externalUrls: string[] = []
  
  for (const script of scripts) {
    const src = script.getAttribute('src')
    if (src) {
      externalUrls.push(src)
    }
  }

  // Check for platform-specific external scripts
  const platformPatterns: Record<string, RegExp[]> = {
    'Facebook': [/connect\.facebook\.net.*fbevents/i, /facebook\.com.*tr\?id/i],
    'Google Ads': [/googletagmanager\.com/i, /google-analytics\.com/i],
    'TikTok': [/tiktok\.com.*analytics/i],
    'Pinterest': [/pinterest\.com.*pt\.js/i],
    'LinkedIn': [/snap\.licdn\.com/i, /px\.ads\.linkedin\.com/i],
    'Snapchat': [/sc-static\.net/i],
    'Xandr': [/acdn\.adnxs\.com.*pixie/i, /adnxs\.com/i],
    'Amazon': [/amazon-adsystem\.com/i, /aax\.amazon-adsystem\.com/i]
  }

  const patterns = platformPatterns[platform] || []
  for (const url of externalUrls) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        // Found a matching external script
        const placement = root.querySelector('head')?.innerHTML.includes(url) ? 'Found in <head> section' : 'Found in <body> section'
        return {
          placement,
          context: `External script detected: ${url}`,
          scriptUrl: url
        }
      }
    }
  }

  // Also check for fbq/gtag/ttq function calls in inline scripts
  const inlineScripts = root.querySelectorAll('script:not([src])')
  for (const script of inlineScripts) {
    const content = script.innerHTML || ''
    if (platform === 'Facebook' && content.includes('fbq(')) {
      return {
        placement: 'Found in inline script',
        context: content.substring(0, 200) + '...',
        scriptUrl: 'inline'
      }
    }
    if (platform === 'Google Ads' && content.includes('gtag(')) {
      return {
        placement: 'Found in inline script',
        context: content.substring(0, 200) + '...',
        scriptUrl: 'inline'
      }
    }
  }

  return null
}

function validatePixelId(html: string, platform: string, expectedId: string) {
  const lowerHtml = html.toLowerCase()
  
  // Platform-specific ID patterns
  const patterns: Record<string, RegExp[]> = {
    'Facebook': [
      /fbq\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]/i,
      /facebook\.com\/tr\?id=([^&]+)/i
    ],
    'Google Ads': [
      /gtag\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/i,
      /gtag\s*\(\s*['"]js['"]\s*,\s*new\s+Date\(\)\s*\)\s*;\s*gtag\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/i
    ],
    'TikTok': [
      /ttq\s*\.\s*load\s*\(\s*['"]([^'"]+)['"]/i,
      /ttq\s*\.\s*init\s*\(\s*['"]([^'"]+)['"]/i
    ],
    'Pinterest': [
      /pintrk\s*\(\s*['"]load['"]\s*,\s*['"]([^'"]+)['"]/i
    ],
    'LinkedIn': [
      /lintrk\s*\(\s*['"]page['"]\s*,\s*['"]([^'"]+)['"]/i,
      /_linkedin_partner_id\s*=\s*["']([^"']+)["']/i,
      /px\.ads\.linkedin\.com.*pid=([^&]+)/i,
      /linkedin_partner_id\s*=\s*["']([^"']+)["']/i
    ],
    'Snapchat': [
      /snaptr\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]/i
    ],
    'Amazon': [
      /amzn\s*\(\s*['"]addTag['"]\s*,\s*['"]([^'"]+)['"]/i,
      /amzn\s*\(\s*['"]setRegion['"]\s*,\s*['"]([^'"]+)['"]/i,
      /amzn\s*\(\s*['"]trackEvent['"]\s*,\s*['"]([^'"]+)['"]/i,
      /amazon-adsystem\.com.*id=([^&]+)/i,
      /aax\.amazon-adsystem\.com.*id=([^&]+)/i
    ],
    'Xandr': [
      /pixie\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]/i,
      /pixie\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/i,
      /adnxs\.com.*id=([^&]+)/i,
      /acdn\.adnxs\.com.*id=([^&]+)/i
    ]
  }

  const platformPatterns = patterns[platform] || []
  
  for (const pattern of platformPatterns) {
    const match = pattern.exec(html)
    if (match) {
      const foundId = match[1] || match[2] // Some patterns have multiple capture groups
      const isMatch = foundId === expectedId
      
      // Extract context around the match
      const matchIndex = match.index
      const contextStart = Math.max(0, matchIndex - 100)
      const contextEnd = Math.min(html.length, matchIndex + match[0].length + 100)
      const context = html.substring(contextStart, contextEnd)
      
      return {
        found: true,
        foundId,
        expectedId,
        match: isMatch,
        mismatch: !isMatch,
        context: context
      }
    }
  }

  // Fallback: simple search for the pixel ID anywhere in the HTML
  const simpleSearch = new RegExp(`["']?${expectedId}["']?`, 'i')
  const simpleMatch = simpleSearch.exec(html)
  if (simpleMatch) {
    const matchIndex = simpleMatch.index
    const contextStart = Math.max(0, matchIndex - 100)
    const contextEnd = Math.min(html.length, matchIndex + expectedId.length + 100)
    const context = html.substring(contextStart, contextEnd)
    
    return {
      found: true,
      foundId: expectedId,
      expectedId,
      match: true,
      mismatch: false,
      context: context
    }
  }

  return {
    found: false,
    foundId: null,
    expectedId,
    match: false,
    mismatch: true
  }
}

function validateEventSnippet(html: string, eventSnippet: string, platform: string) {
  const normalizedEventSnippet = eventSnippet
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'")

  const normalizedHtml = html
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '"')
    .replace(/'/g, "'")

  const found = normalizedHtml.includes(normalizedEventSnippet)
  
  // For Xandr, also check for pixie('event', ...) patterns
  if (platform === 'Xandr' && !found) {
    const pixieEventPattern = /pixie\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/i
    const match = pixieEventPattern.exec(html)
    if (match) {
      return {
        found: true,
        foundEvent: match[0],
        expectedEvent: eventSnippet,
        match: true
      }
    }
  }

  return {
    found,
    foundEvent: found ? normalizedEventSnippet : null,
    expectedEvent: eventSnippet,
    match: found
  }
}

async function checkPixelWithBrowser(url: string, platform: string, pixelId: string, eventName?: string) {
  try {
    console.log('Using external browser service for GTM detection...')
    
    // Use a simple fetch with a browser-like user agent
    // This simulates what a browser would see after GTM loads
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    console.log('Fetched HTML content, length:', html.length)
    
    // Check for pixel ID
    const pixelIdResult = validatePixelId(html, platform, pixelId)
    
    // Check for platform-specific patterns
    const root = parse(html)
    const vendorHit = detectVendorPixel(root, platform, '', eventName)
    
    // Check for external scripts
    const externalHit = await detectExternalPixel(root, platform, '', eventName)
    
    console.log('Browser detection results:', {
      pixelIdFound: pixelIdResult.found,
      pixelIdMatch: pixelIdResult.match,
      foundId: pixelIdResult.foundId,
      expectedId: pixelIdResult.expectedId,
      vendorHit: !!vendorHit,
      externalHit: !!externalHit
    })
    
    // Debug: Check if pixel ID is in the HTML at all
    const hasPixelId = html.toLowerCase().includes(pixelId.toLowerCase())
    console.log('HTML contains pixel ID:', hasPixelId)
    
    // Debug: Show a sample of the HTML
    const pixelIdIndex = html.toLowerCase().indexOf(pixelId.toLowerCase())
    if (pixelIdIndex > -1) {
      console.log('Found pixel ID at index:', pixelIdIndex)
      console.log('Context around pixel ID:', html.substring(Math.max(0, pixelIdIndex - 100), Math.min(html.length, pixelIdIndex + 200)))
    } else {
      console.log('Pixel ID not found in HTML')
    }
    
    // Additional Amazon debugging
    if (platform === 'Amazon') {
      console.log('Amazon debug:')
      console.log('Looking for pixel ID:', pixelId)
      console.log('HTML contains amzn:', html.toLowerCase().includes('amzn'))
      console.log('HTML contains amazon-adsystem:', html.toLowerCase().includes('amazon-adsystem'))
      console.log('HTML contains aax:', html.toLowerCase().includes('aax'))
      console.log('HTML contains pixel ID:', html.toLowerCase().includes(pixelId.toLowerCase()))
      
      // Show a sample of the HTML to see what's actually there
      const amznIndex = html.toLowerCase().indexOf('amzn')
      if (amznIndex > -1) {
        console.log('Found amzn at index:', amznIndex)
        console.log('Context around amzn:', html.substring(Math.max(0, amznIndex - 50), Math.min(html.length, amznIndex + 200)))
      } else {
        console.log('No amzn found in HTML')
      }
      
      // Check for any Amazon-related content
      const amazonIndex = html.toLowerCase().indexOf('amazon')
      if (amazonIndex > -1) {
        console.log('Found amazon at index:', amazonIndex)
        console.log('Context around amazon:', html.substring(Math.max(0, amazonIndex - 50), Math.min(html.length, amazonIndex + 200)))
      }
    }
    
    return {
      success: true,
      html,
      pixelIdResult,
      vendorHit,
      externalHit,
      method: 'browser'
    }
    
  } catch (error) {
    console.error('Enhanced fetch failed, falling back to regular fetch:', error)
    
    // Fallback to regular fetch with basic headers
    try {
      const fallbackResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PixelPlacementHelper/1.0)'
        }
      })
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback also failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`)
      }
      
      const html = await fallbackResponse.text()
      console.log('Fallback fetch successful, length:', html.length)
      
      // Check for pixel ID
      const pixelIdResult = validatePixelId(html, platform, pixelId)
      
      // Check for platform-specific patterns
      const root = parse(html)
      const vendorHit = detectVendorPixel(root, platform, '', eventName)
      
      // Check for external scripts
      const externalHit = await detectExternalPixel(root, platform, '', eventName)
      
      // Debug: Check if pixel ID is in the HTML at all
      const hasPixelId = html.toLowerCase().includes(pixelId.toLowerCase())
      console.log('Fallback - HTML contains pixel ID:', hasPixelId)
      
      // Additional Amazon debugging for fallback
      if (platform === 'Amazon') {
        console.log('Fallback - Amazon debug:')
        console.log('Looking for pixel ID:', pixelId)
        console.log('HTML contains amzn:', html.toLowerCase().includes('amzn'))
        console.log('HTML contains amazon-adsystem:', html.toLowerCase().includes('amazon-adsystem'))
        console.log('HTML contains aax:', html.toLowerCase().includes('aax'))
        console.log('HTML contains pixel ID:', html.toLowerCase().includes(pixelId.toLowerCase()))
        
        // Show a sample of the HTML to see what's actually there
        const amznIndex = html.toLowerCase().indexOf('amzn')
        if (amznIndex > -1) {
          console.log('Found amzn at index:', amznIndex)
          console.log('Context around amzn:', html.substring(Math.max(0, amznIndex - 50), Math.min(html.length, amznIndex + 200)))
        } else {
          console.log('No amzn found in HTML')
        }
      }
      
      return {
        success: true,
        html,
        pixelIdResult,
        vendorHit,
        externalHit,
        method: 'browser-fallback'
      }
      
    } catch (fallbackError) {
      console.error('Both enhanced and fallback fetch failed:', fallbackError)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        method: 'browser',
        details: `Enhanced fetch failed: ${error instanceof Error ? error.message : String(error)}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      }
    }
  }
}
