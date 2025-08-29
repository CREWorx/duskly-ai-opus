# Duskly.ai - Ultra-Simple MVP Implementation

---

## Prerequisites

### Required API Keys (`.env.local`)
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

---

## Implementation Steps

### STEP 1: Project Setup

```bash
# Create Next.js project
npx create-next-app@latest duskly-mvp \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd duskly-mvp

# Install dependencies
npm install @vercel/blob@0.19.0 \
  @ai-sdk/google@0.0.26 \
  ai@3.3.6 \
  react-dropzone@14.2.3 \
  react-compare-slider@2.2.0 \
  class-variance-authority@0.7.0 \
  clsx@2.1.0 \
  tailwind-merge@2.2.0 \
  zod@3.22.4 \
  react-hook-form@7.48.2 \
  @hookform/resolvers@3.3.4 \
  lucide-react@0.309.0

# Install shadcn/ui
npx shadcn@latest init -y
npx shadcn@latest add button card input label toast

# Create directories
mkdir -p app/api/generate
mkdir -p components
mkdir -p lib
```

### STEP 2: Required Base Files

#### `app/layout.tsx`
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Duskly.ai - Golden Hour Photos',
  description: 'Transform daytime real estate photos to golden hour',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

#### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `lib/utils.ts`
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### STEP 3: Core Types and Prompt

#### `lib/types.ts`
```typescript
import { z } from 'zod';

export const GenerateSchema = z.object({
  address: z.string().min(5).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bearing: z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;
```

#### `lib/prompt.ts`
```typescript
interface PromptParams {
  address: string;
  date: string;
  bearing: string;
}

function escapeString(str: string): string {
  return (str || '').replace(/[\r\n]/g, ' ').slice(0, 500);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const bearingToDirection: Record<string, string> = {
  'N': 'north',
  'NE': 'northeast', 
  'E': 'east',
  'SE': 'southeast',
  'S': 'south',
  'SW': 'southwest',
  'W': 'west',
  'NW': 'northwest'
};

export function generatePrompt(params: PromptParams): string {
  const direction = bearingToDirection[params.bearing] || params.bearing.toLowerCase();
  
  return `
> **Task**: Convert the **attached daytime exterior photo** into a **golden-hour (pre-sunset)** image with physically correct light. **Do not change the scene**—only time-of-day lighting/sky and exposure/color.
>
> **Site & Orientation (for realism)**
>
> * **Address**: ${escapeString(params.address)}
> * **Date**: ${formatDate(params.date)}
> * **Camera bearing (true-north)**: "camera facing ${direction}"
> * Infer **sunset azimuth** for this address/date and set the sun **~4–8° above horizon** (15–25 min before set). Place the **warmest sky** and **key light** toward that azimuth; keep the opposite sky cooler/deeper.
>
> **Hard Invariants (must not change at all)**
>
> * Architecture, rooflines, façades, windows/mullions, signage text, parking layout/striping, curbs, poles, fencing, paving cracks, pool shape, vegetation (species, size, placement), vehicles (count/model/placement), camera position, perspective, aspect ratio, resolution.
> * **No additions/removals/moves** of any objects. **No lens flares, fog, stars, or rain.**
>
> **Golden-Hour Relighting (physically plausible)**
>
> * Compute **direct sun** from the sunset azimuth/low altitude; create **long, soft shadows** and **warm edge/rim light** on sun-facing roof edges, siding, trees, and vehicles. **No double shadows.**
> * **Sky**: subtle gradient—warm apricot/orange near the sun fading to neutral/blue away; light, thin clouds only if already present.
> * **Reflections**: update **window/pool reflections** to the new sky/sun angle; keep mullion contrast and glass tint realistic.
> * **Artificial lighting**: Interior lights may be **on, low-to-moderate** (2700–3000K). Exterior fixtures **only if they exist** in the photo; no new fixtures. Keep intensity believable—no halos/bloom.
>
> **Finishing-Grade (Golden Hour • CRE-Ready)**
>
> * **Global tonality**: target mean luminance **0.52–0.56** (bright, marketable). **Black point 2–3% (RGB≈6–8)**; **white point 97–98% (RGB≈247–250)**. Gentle **S-curve** with midtone pivot ~**45%**; protect highlight detail on siding, concrete, and clouds.
> * **Shadow lift**: raise the **lowest 15–20%** luminance by **+0.20 EV** so asphalt texture, shrubs, and roof shingles read cleanly; keep parking-lot cracks and striping visible.
> * **Color grade**: **Outdoor WB warm (≈4800–5200K)**; interiors **≈2800–3000K** for subtle warm-inside/warmer-outside harmony without orange clipping. **Vibrance +18%, Saturation +6%** (natural foliage—no neon greens).
> * **Micro-contrast/clarity**: **+10–12% at 0.8–1.2px radius**; suppress halos on rooflines/horizon.
> * **Texture preservation**: retain shingle grain, stucco, asphalt tooth; minimal denoise only for chroma noise.
> * **Sharpening**: low-radius detail sharpening (**radius 0.6–0.8px, amount ~0.8, threshold 2**).
> * **Color integrity**: neutral grays (pavement, siding) stay neutral; no magenta cast. Skin-tone range protection even if people appear in frame.
>
> **Output**
>
> * **One edited image**, same crop, aspect, and resolution as the original.
> * Color space **sRGB**, **JPEG Q90–95**.
>
> **Negative Constraints (hard)**
>
> * Do **not** invent or remove objects, vehicles, trees, fixtures, or signage.
> * Do **not** change framing, focal length look, or perspective.
> * No excessive glow/bloom, no HDR halos, no cartoon saturation, no invented reflections.`;
}
```

### STEP 4: Single API Endpoint

#### `app/api/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateImage } from 'ai';
import { put } from '@vercel/blob';
import { GenerateSchema } from '@/lib/types';
import { generatePrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const date = formData.get('date') as string;
    const bearing = formData.get('bearing') as string;

    // Validate input
    const validation = GenerateSchema.safeParse({ address, date, bearing });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Please upload a valid image file' },
        { status: 400 }
      );
    }

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Check file type (JPEG/PNG only)
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG and PNG images are supported' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString('base64');

    // Generate job ID
    const jobId = crypto.randomUUID();

    // Store original image
    const originalBlob = await put(
      `jobs/${jobId}/original.jpg`,
      buffer,
      {
        access: 'public',
        contentType: file.type,
      }
    );

    // Configure Gemini model
    const model = google('gemini-2.5-flash-image-preview', {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    // Generate prompt
    const prompt = generatePrompt({
      address: validation.data.address,
      date: validation.data.date,
      bearing: validation.data.bearing,
    });

    // Call Gemini for image generation
    const result = await generateImage({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image', 
              image: base64Image,
              mimeType: file.type
            }
          ],
        },
      ],
      temperature: 0.7,
    });

    // Extract generated image
    let generatedImage: Buffer;
    
    if (result.images && result.images.length > 0) {
      generatedImage = Buffer.from(result.images[0], 'base64');
    } else if (result.image) {
      generatedImage = Buffer.from(result.image, 'base64');
    } else {
      throw new Error('No image generated');
    }

    // Store result image
    const resultBlob = await put(
      `jobs/${jobId}/result.jpg`,
      generatedImage,
      {
        access: 'public',
        contentType: 'image/jpeg',
      }
    );

    // Return URLs
    return NextResponse.json({
      success: true,
      jobId,
      originalUrl: originalBlob.url,
      resultUrl: resultBlob.url,
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
```

### STEP 5: Simple Upload Component

#### `components/ImageUploader.tsx`
```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function ImageUploader({ onFileSelect, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setFileName(file.name);
    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled,
  });

  const clearImage = () => {
    setPreview(null);
    setFileName('');
    setError(null);
  };

  return (
    <Card className="overflow-hidden">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          {isDragActive ? (
            <p className="text-lg font-semibold">Drop your image here</p>
          ) : (
            <>
              <p className="text-lg font-medium">Drag & drop your property photo</p>
              <p className="text-sm text-gray-500 mt-2">or click to browse</p>
              <p className="text-xs text-gray-400 mt-4">JPEG or PNG • Max 20MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-auto" />
          {!disabled && (
            <Button
              onClick={clearImage}
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
            <p className="text-sm truncate">{fileName}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}
```

### STEP 6: Simple Property Form

#### `components/PropertyForm.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GenerateSchema, GenerateInput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PropertyFormProps {
  onSubmit: (data: GenerateInput) => void;
  disabled?: boolean;
}

const COMPASS_DIRECTIONS = [
  { value: 'N', label: 'N', icon: '↑' },
  { value: 'NE', label: 'NE', icon: '↗' },
  { value: 'E', label: 'E', icon: '→' },
  { value: 'SE', label: 'SE', icon: '↘' },
  { value: 'S', label: 'S', icon: '↓' },
  { value: 'SW', label: 'SW', icon: '↙' },
  { value: 'W', label: 'W', icon: '←' },
  { value: 'NW', label: 'NW', icon: '↖' },
];

export function PropertyForm({ onSubmit, disabled }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GenerateInput>({
    resolver: zodResolver(GenerateSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      bearing: 'NW',
    },
  });

  const selectedBearing = watch('bearing');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, Los Angeles, CA 90001"
              {...register('address')}
              disabled={disabled}
            />
            {errors.address && (
              <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="date">Photo Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              disabled={disabled}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <Label>Camera Direction</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {COMPASS_DIRECTIONS.map((dir) => (
                <button
                  key={dir.value}
                  type="button"
                  onClick={() => setValue('bearing', dir.value as any)}
                  disabled={disabled}
                  className={`
                    p-3 rounded border-2 transition-all
                    ${selectedBearing === dir.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="text-xl">{dir.icon}</div>
                  <div className="text-xs mt-1">{dir.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={disabled}
          >
            Generate Golden Hour Image
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### STEP 7: Simple Result Viewer

#### `components/ResultViewer.tsx`
```typescript
'use client';

import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import 'react-compare-slider/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface ResultViewerProps {
  originalUrl: string;
  resultUrl: string;
  jobId: string;
}

export function ResultViewer({ originalUrl, resultUrl, jobId }: ResultViewerProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `duskly-golden-hour-${jobId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <ReactCompareSlider
          itemOne={
            <ReactCompareSliderImage
              src={originalUrl}
              alt="Original"
            />
          }
          itemTwo={
            <ReactCompareSliderImage
              src={resultUrl}
              alt="Golden Hour"
            />
          }
          position={50}
          className="h-[500px]"
        />
      </Card>

      <Button onClick={handleDownload} size="lg" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download Golden Hour Image
      </Button>
    </div>
  );
}
```

### STEP 8: Main Page

#### `app/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { PropertyForm } from '@/components/PropertyForm';
import { ResultViewer } from '@/components/ResultViewer';
import { GenerateInput } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'uploading' | 'generating'>('uploading');
  const [result, setResult] = useState<{
    jobId: string;
    originalUrl: string;
    resultUrl: string;
  } | null>(null);
  const { toast } = useToast();

  const handleGenerate = async (formData: GenerateInput) => {
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setUploadProgress(0);
    setProcessingStage('uploading');

    try {
      // Create form data
      const data = new FormData();
      data.append('file', selectedFile);
      data.append('address', formData.address);
      data.append('date', formData.date);
      data.append('bearing', formData.bearing);

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      const response = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch (e) {
              reject(new Error('Invalid response'));
            }
          } else {
            try {
              const json = JSON.parse(xhr.responseText);
              reject(new Error(json.error || 'Generation failed'));
            } catch {
              reject(new Error('Generation failed'));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        
        xhr.onloadend = () => {
          if (xhr.status === 200) {
            setProcessingStage('generating');
          }
        };

        xhr.open('POST', '/api/generate');
        xhr.send(data);
      });

      // Set result
      setResult({
        jobId: response.jobId,
        originalUrl: response.originalUrl,
        resultUrl: response.resultUrl,
      });

      toast({
        title: "Success!",
        description: "Your golden hour image is ready",
      });

    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setUploadProgress(0);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Duskly.ai</h1>
          <p className="text-sm text-gray-600">Transform daytime photos to golden hour</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!result ? (
          <>
            {isGenerating && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 text-center min-w-[320px]">
                  {processingStage === 'uploading' ? (
                    <>
                      <p className="text-lg font-medium mb-4">Uploading image...</p>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-primary h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">{uploadProgress}%</p>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-lg font-medium">Generating golden hour image...</p>
                      <p className="text-sm text-gray-500 mt-2">This takes 15-30 seconds</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Step 1: Upload Photo</h2>
                <ImageUploader
                  onFileSelect={setSelectedFile}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Step 2: Property Details</h2>
                <PropertyForm
                  onSubmit={handleGenerate}
                  disabled={isGenerating}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Your Golden Hour Image</h2>
              <Button onClick={reset} variant="outline">
                Create Another
              </Button>
            </div>

            <ResultViewer
              originalUrl={result.originalUrl}
              resultUrl={result.resultUrl}
              jobId={result.jobId}
            />
          </div>
        )}
      </main>
    </div>
  );
}
```

### STEP 9: Deployment

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Deploy to Vercel
vercel

# Add environment variables in Vercel dashboard
# Then redeploy
vercel --prod
```

---

## Complete File Structure

```
duskly-mvp/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   └── [shadcn components]
│   ├── ImageUploader.tsx
│   ├── PropertyForm.tsx
│   └── ResultViewer.tsx
├── lib/
│   ├── prompt.ts
│   ├── types.ts
│   └── utils.ts
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```