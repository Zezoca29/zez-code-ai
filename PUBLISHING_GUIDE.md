# VSCode Extension Publishing Guide - Zez Code AI

## Overview

This guide will walk you through the complete process of publishing your Zez Code AI extension to the Visual Studio Code Marketplace.

## Prerequisites

### 1. **Microsoft Account**
- Create a Microsoft account if you don't have one
- This will be used for the Visual Studio Code Marketplace

### 2. **Publisher Account**
- Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/)
- Sign in with your Microsoft account
- Create a publisher account (this is free)

### 3. **Extension Manifest**
Ensure your `package.json` has all required fields:

```json
{
  "name": "zez-code-ai",
  "displayName": "Zez Code AI",
  "description": "O Zez Code AI para Java é uma extensão indispensável para desenvolvedores Java...",
  "version": "0.0.2",
  "publisher": "ZezTechnology",
  "icon": "images/zezcodelogo.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/Zezoca29/zez-code-ai.git"
  },
  "engines": {
    "vscode": "^1.101.0"
  },
  "categories": [
    "Other"
  ],
  "keywords": [
    "java",
    "testing",
    "unit-test",
    "ai",
    "llm",
    "code-generation"
  ],
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/Zezoca29/zez-code-ai/issues"
  },
  "homepage": "https://github.com/Zezoca29/zez-code-ai#readme"
}
```

## Step-by-Step Publishing Process

### Step 1: Install vsce (VSCode Extension Manager)

```bash
npm install -g @vscode/vsce
```

### Step 2: Build Your Extension

```bash
# Clean previous builds
npm run clean

# Build the extension
npm run build

# Package the extension
npm run package
```

### Step 3: Create Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/)
2. Click "Sign in" and use your Microsoft account
3. Click "Publish extensions"
4. Create a new publisher account:
   - **Publisher ID:** `ZezTechnology` (must be unique)
   - **Display Name:** `Zez Technology`
   - **Description:** Brief description of your organization

### Step 4: Get Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with your Microsoft account
3. Create a new organization (if needed)
4. Go to **User Settings** → **Personal Access Tokens**
5. Create a new token:
   - **Name:** `VSCode Extension Publishing`
   - **Organization:** Select your organization
   - **Scopes:** `Custom defined`
   - **Permissions:** `Marketplace (Publish)`
6. Copy the generated token (you'll need it for publishing)

### Step 5: Login with vsce

```bash
vsce login ZezTechnology
```

When prompted, enter your Personal Access Token.

### Step 6: Package and Publish

```bash
# Package the extension
vsce package

# Publish the extension
vsce publish
```

## Alternative: Using GitHub Actions (Recommended)

### Step 1: Create GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VSCE_PAT`: Your Personal Access Token
- `PUBLISHER_ID`: `ZezTechnology`

### Step 2: Create GitHub Action Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish VSCode Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Package extension
        run: npm run package
      
      - name: Publish to VS Code Marketplace
        run: npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

### Step 3: Publish via Git Tags

```bash
# Create and push a new tag
git tag v0.0.2
git push origin v0.0.2
```

## Pre-Publishing Checklist

### ✅ **Code Quality**
- [ ] All TypeScript compilation errors fixed
- [ ] ESLint passes without errors
- [ ] All tests pass (if any)
- [ ] Code follows VSCode extension guidelines

### ✅ **Documentation**
- [ ] README.md is comprehensive and clear
- [ ] CHANGELOG.md documents version changes
- [ ] LICENSE file is present
- [ ] All commands are documented

### ✅ **Package.json**
- [ ] All required fields are present
- [ ] Version number is correct
- [ ] Publisher ID matches your account
- [ ] Repository URL is correct
- [ ] Keywords are relevant and descriptive

### ✅ **Assets**
- [ ] Icon file exists and is properly sized (128x128px)
- [ ] README has screenshots or GIFs
- [ ] Extension manifest is valid

### ✅ **Testing**
- [ ] Extension works in VSCode
- [ ] All commands function correctly
- [ ] No console errors during operation
- [ ] Tested on different Java projects

## Post-Publishing Steps

### 1. **Verify Publication**
- Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/)
- Search for "Zez Code AI"
- Verify all information is correct

### 2. **Update Documentation**
- Update README with installation instructions
- Add marketplace badge to README
- Update any internal documentation

### 3. **Monitor and Support**
- Monitor marketplace reviews and ratings
- Respond to user issues on GitHub
- Plan future updates and improvements

## Version Management

### Semantic Versioning
- **MAJOR.MINOR.PATCH** (e.g., 0.0.2)
- **MAJOR:** Breaking changes
- **MINOR:** New features
- **PATCH:** Bug fixes

### Update Process
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push to trigger GitHub Action
5. Verify publication

## Troubleshooting

### Common Issues

#### 1. **Publisher ID Already Exists**
```bash
# Check available publisher ID
vsce search-publishers ZezTechnology

# Use different publisher ID if needed
vsce login YourNewPublisherID
```

#### 2. **Authentication Errors**
```bash
# Clear existing login
vsce logout

# Login again with new token
vsce login ZezTechnology
```

#### 3. **Package Errors**
```bash
# Check package.json validity
vsce verify

# Fix any issues before publishing
```

#### 4. **Build Errors**
```bash
# Clean and rebuild
npm run clean
npm run build
npm run package
```

## Marketing Your Extension

### 1. **Marketplace Optimization**
- Write compelling description
- Use relevant keywords
- Add high-quality screenshots
- Include demo GIFs

### 2. **Social Media**
- Share on Twitter, LinkedIn
- Post in relevant developer communities
- Create demo videos

### 3. **Documentation**
- Comprehensive README
- Usage examples
- Troubleshooting guide
- Contributing guidelines

## Legal Considerations

### 1. **License**
- Choose appropriate license (MIT recommended for open source)
- Include license file in repository

### 2. **Privacy**
- Ensure no user data is collected without consent
- Add privacy policy if needed

### 3. **Dependencies**
- Verify all dependencies are properly licensed
- Include license information for major dependencies

## Next Steps After Publishing

### 1. **Monitor Analytics**
- Track download statistics
- Monitor user ratings and reviews
- Analyze usage patterns

### 2. **Gather Feedback**
- Encourage user feedback
- Monitor GitHub issues
- Respond to user questions

### 3. **Plan Updates**
- Fix reported bugs
- Add requested features
- Improve performance
- Update dependencies

## Resources

### Official Documentation
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)

### Community
- [VSCode Extension Community](https://github.com/microsoft/vscode-extension-samples)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vscode-extensions)

### Tools
- [Extension Packager](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-json)
- [Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-test)

---

## Quick Commands Reference

```bash
# Install vsce
npm install -g @vscode/vsce

# Login to publisher account
vsce login ZezTechnology

# Package extension
vsce package

# Publish extension
vsce publish

# Check package validity
vsce verify

# Search publishers
vsce search-publishers

# Logout
vsce logout
```

This guide should help you successfully publish your Zez Code AI extension to the Visual Studio Code Marketplace. Good luck with your publication! 