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

    // Check file size (30MB limit)
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 30MB.' },
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