#!/bin/bash

# Install Chrome for Puppeteer on Netlify
echo "Installing Chrome for Puppeteer..."

# Install Chrome dependencies
apt-get update
apt-get install -y wget gnupg

# Add Google Chrome repository
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Install Chrome
apt-get update
apt-get install -y google-chrome-stable

# Install Puppeteer Chrome
npx puppeteer browsers install chrome

echo "Chrome installation complete!"



