import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { put } from '@vercel/blob';
import { GenerateSchema } from '@/lib/types';
import { generatePrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('=== GENERATE API CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const date = formData.get('date') as string;
    const bearing = formData.get('bearing') as string;

    console.log('Form data received:', {
      file: file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)` : 'No file',
      address,
      date,
      bearing
    });

    // Validate input
    const validation = GenerateSchema.safeParse({ address, date, bearing });
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
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
    console.log('Storing original image to Vercel Blob...');
    const originalBlob = await put(
      `jobs/${jobId}/original.jpg`,
      buffer,
      {
        access: 'public',
        contentType: file.type,
      }
    );
    console.log('Original image stored:', originalBlob.url);

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
    console.log('Calling Gemini API for image generation...');
    console.log('Using model: gemini-2.5-flash-image-preview');
    const result = await generateText({
      model,
      providerOptions: {
        google: { 
          responseModalities: ['TEXT', 'IMAGE']  // Enable image generation
        },
      },
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
    console.log('Gemini API response received');
    console.log('Response structure:', {
      hasFiles: !!result.files,
      fileCount: result.files?.length || 0,
      hasText: !!result.text,
      responseKeys: Object.keys(result)
    });
    
    let generatedImage: Buffer | undefined;
    
    if (result.files && result.files.length > 0) {
      console.log(`Found ${result.files.length} files in response`);
      
      // Look for an image file in the response
      for (const file of result.files) {
        console.log('File info:', {
          mediaType: file.mediaType,
          hasBase64: !!file.base64,
          hasUint8Array: !!file.uint8Array
        });
        
        if (file.mediaType && file.mediaType.startsWith('image/')) {
          console.log('Found image file with mediaType:', file.mediaType);
          
          if (file.base64) {
            // Remove data URL prefix if present
            const base64Data = file.base64.includes(',') 
              ? file.base64.split(',')[1] 
              : file.base64;
            generatedImage = Buffer.from(base64Data, 'base64');
            console.log('Converted base64 to buffer');
          } else if (file.uint8Array) {
            generatedImage = Buffer.from(file.uint8Array);
            console.log('Converted uint8Array to buffer');
          }
          break;
        }
      }
    }
    
    if (!generatedImage) {
      console.error('No image found in Gemini response. Response keys:', Object.keys(result));
      console.error('Files array:', result.files);
      throw new Error('No image generated - check response structure');
    }
    
    console.log('Generated image size:', (generatedImage.length / 1024 / 1024).toFixed(2), 'MB');

    // Store result image
    console.log('Storing generated image to Vercel Blob...');
    const resultBlob = await put(
      `jobs/${jobId}/result.jpg`,
      generatedImage,
      {
        access: 'public',
        contentType: 'image/jpeg',
      }
    );
    console.log('Generated image stored:', resultBlob.url);

    // Return URLs
    console.log('=== GENERATION SUCCESSFUL ===');
    console.log('Job ID:', jobId);
    console.log('========================');
    
    return NextResponse.json({
      success: true,
      jobId,
      originalUrl: originalBlob.url,
      resultUrl: resultBlob.url,
    });

  } catch (error: any) {
    console.error('=== GENERATION ERROR ===');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    if (error.response) {
      console.error('API Response:', error.response);
    }
    console.error('========================');
    
    return NextResponse.json(
      { error: error.message || 'Generation failed. Please try again.' },
      { status: 500 }
    );
  }
}