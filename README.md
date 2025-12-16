# Pixel Placement Helper

An AI-powered tool to verify pixel placement on websites for various advertising platforms.

## Features

- Check pixel placement for multiple platforms (Amazon, Facebook, Xandr, TikTok, Google Ads, GroundTruth, LinkedIn, Nextdoor, Pinterest, Reddit, Snapchat)
- Verify correct placement in `<head>` vs `<body>` sections
- Detect common pixel configuration issues
- Provide troubleshooting recommendations
- Support for custom placement rules (e.g., "Trigger: Page URL contains")

## Setup Instructions

### Prerequisites

1. **Install Node.js** (version 18 or higher)
   - Download from [nodejs.org](https://nodejs.org/en/download)
   - Or install via Homebrew: `brew install node`

2. **Get an OpenAI API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create an account and generate an API key

### Installation

1. **Install dependencies:**
   ```bash
   cd /Users/mackenziebates/pixel-placement-helper
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Go to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Enter Website URL**: The URL of the website to check
2. **Select Platform**: Choose from the supported advertising platforms
3. **Select Placement**: Choose the expected placement (e.g., `<head></head>`, `<body></body>`)
4. **Enter Event Name**: Optional - the event name you're tracking
5. **Paste Pixel Snippet**: The complete pixel code to verify
6. **Click "Check Pixel Placement"**

## What It Checks

- **Presence**: Is the pixel code present on the page?
- **Placement**: Is it in the correct section (head vs body)?
- **Syntax**: Are there any obvious syntax issues?
- **Platform-specific**: Does it contain expected functions (fbq for Facebook, gtag for Google, etc.)?
- **Event matching**: Does the event name match what's in the snippet?

## Results

The tool will show:
- ✅ **PASS**: Pixel is correctly placed and configured
- ❌ **FAIL**: Issues found that need attention
- **Detected Placement**: Where the pixel was actually found
- **Matched Code**: The actual code snippet found
- **Troubleshooting**: Specific steps to fix any issues

## Supported Platforms

- Amazon
- Facebook
- Xandr
- TikTok
- Google Ads
- GroundTruth
- LinkedIn
- Nextdoor
- Pinterest
- Reddit
- Snapchat

## Troubleshooting

### Common Issues

1. **"Pixel snippet not found"**
   - Verify the snippet is exactly as provided to the client
   - Check if the website uses dynamic loading (SPA)
   - Ensure the URL is accessible

2. **"Wrong placement"**
   - Move the pixel to the correct section
   - Check if there are multiple instances

3. **"Syntax issues"**
   - Fix quote marks and HTML entities
   - Ensure proper JavaScript syntax

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Verify your OpenAI API key is correct
3. Ensure the website URL is accessible
4. Check that the pixel snippet is complete and properly formatted

## Next Steps

Future features planned:
- CSV batch upload for multiple checks
- AI-powered explanations
- Historical tracking
- Export results to Excel
- Support for GTM (Google Tag Manager) pixels



