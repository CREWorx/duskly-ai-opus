# Duskly.ai MVP

Transform daytime real estate photos to golden hour using AI.

## Setup

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure environment variables:**
   
   Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then add your API keys:
   - **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Vercel Blob Token**: Get from [Vercel Dashboard](https://vercel.com/dashboard/stores)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload a daytime property photo (JPEG or PNG, max 20MB)
2. Enter the property address
3. Select the date the photo was taken
4. Choose the camera direction (compass bearing)
5. Click "Generate Golden Hour Image"
6. Compare the before/after with the slider
7. Download your golden hour image

## Deployment

Deploy to Vercel:

```bash
vercel
```

Add environment variables in Vercel dashboard, then deploy to production:

```bash
vercel --prod
```

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Google Gemini 2.5 Flash Image Preview
- Vercel Blob Storage
- React Compare Slider

## Project Structure

```
├── app/
│   ├── api/
│   │   └── generate/     # Image generation API endpoint
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── ImageUploader.tsx # Drag & drop upload
│   ├── PropertyForm.tsx  # Property details form
│   └── ResultViewer.tsx  # Before/after comparison
├── lib/
│   ├── prompt.ts         # Golden hour prompt template
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
└── .env.local            # API keys (create from .env.local.example)
```