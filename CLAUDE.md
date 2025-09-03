# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Duskly.ai is an ultra-simple MVP application that transforms daytime real estate photos to golden hour using AI. The core functionality follows a simple flow: upload → generate → download, with no refinements, SSE, or complex features.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash Image Preview (`gemini-2.5-flash-image-preview`)
- **Storage**: Vercel Blob Storage
- **UI Components**: shadcn/ui components
- **Image Comparison**: React Compare Slider (note: CSS import removed due to module issues)
- **Form Handling**: React Hook Form with Zod validation
- **File Upload**: React Dropzone

## Essential Commands

```bash
# Install dependencies (must use legacy peer deps due to React 19)
npm install --legacy-peer-deps

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm lint
```

## Environment Setup

Two API keys are required in `.env.local`:
- `GOOGLE_GENERATIVE_AI_API_KEY`: From Google AI Studio
- `BLOB_READ_WRITE_TOKEN`: From Vercel Dashboard Blob store

Copy `.env.local.example` to `.env.local` and add your keys. Never commit actual keys to the repository.

## Architecture & Key Implementation Details

### Single API Endpoint Strategy
The app has only one API endpoint at `/app/api/generate/route.ts` that handles the entire generation flow:
1. Receives multipart form data with image and property details
2. Validates input using Zod schema
3. Stores original image in Vercel Blob
4. Calls Gemini with the specialized prompt from `lib/prompt.ts`
5. Stores result image in Vercel Blob
6. Returns both URLs for comparison

### File Size Limits
- Current limit: 30MB (updated from initial 20MB)
- Enforced in both `ImageUploader.tsx` and API route
- Configurable by changing the multiplication factor in file size checks

### Golden Hour Prompt System
The `lib/prompt.ts` file contains a highly detailed, physically-accurate prompt template that:
- Takes address, date, and camera bearing as inputs
- Computes realistic sun position based on location/date
- Maintains all architectural elements unchanged
- Applies specific color grading and lighting adjustments
- Must be used verbatim as specified in the PRD

### Upload Progress Tracking
Uses XMLHttpRequest instead of fetch in `app/page.tsx` to enable real-time upload progress tracking with visual feedback.

### Component Structure
- `ImageUploader`: Drag-and-drop with preview, handles validation
- `PropertyForm`: Address input with compass direction selector
- `ResultViewer`: Before/after slider comparison with download

### Important Constraints
- API route timeout: 60 seconds (`maxDuration` setting)
- Image types: JPEG and PNG only
- No streaming responses (simple request/response)
- No rate limiting implemented
- No authentication or user management

## Known Issues & Workarounds

1. **React Compare Slider CSS**: The CSS import is removed. Component works but without default styles.
2. **React 19 Compatibility**: Must use `--legacy-peer-deps` for installations due to peer dependency conflicts.
3. **Multiple Lockfiles Warning**: Next.js warns about workspace root detection. Fixed with `outputFileTracingRoot` in `next.config.js`.

## Deployment Target

Vercel is the primary deployment target. The app is configured for:
- Vercel Blob Storage (automatic integration)
- Serverless functions (Node.js runtime)
- Environment variables through Vercel dashboard