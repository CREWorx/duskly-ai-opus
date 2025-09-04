import { NextRequest, NextResponse } from 'next/server';
import { gateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';
import { put } from '@vercel/blob';
import { GenerateSchema } from '@/lib/types';
import { generatePrompt } from '@/lib/prompt';

// Switch to Edge runtime to avoid 4.5MB function payload limit
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('=== GENERATE API CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Check for required API keys
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.error('Missing AI_GATEWAY_API_KEY environment variable');
      return NextResponse.json(
        { error: 'API configuration error. Please check environment variables.' },
        { status: 500 }
      );
    }
    
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

    // Convert file to buffer for storage and base64
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate job ID
    const jobId = crypto.randomUUID();

    // Store original image to Vercel Blob first (for user reference)
    console.log('Storing original image to Vercel Blob...');
    const originalBlob = await put(
      `jobs/${jobId}/original.jpg`,
      buffer as any,  // Type casting for Edge runtime compatibility
      {
        access: 'public',
        contentType: file.type,
      }
    );
    console.log('Original image stored:', originalBlob.url);

    // Convert image to base64 data URL for the AI Gateway
    // The gateway requires base64 format, not URLs
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;
    console.log('Converted image to base64, size:', (dataUrl.length / 1024 / 1024).toFixed(2), 'MB');

    // Use Gemini model through Vercel AI Gateway
    const model = gateway('google/gemini-2.5-flash-image-preview');

    // Generate prompt
    const prompt = generatePrompt({
      address: validation.data.address,
      date: validation.data.date,
      bearing: validation.data.bearing,
    });

    // Call Gemini for image generation
    console.log('Calling Gemini API through Vercel AI Gateway...');
    console.log('Using model: google/gemini-2.5-flash-image-preview');
    console.log('API Gateway configured:', !!process.env.AI_GATEWAY_API_KEY);
    
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image', 
              image: dataUrl  // Use base64 data URL for gateway
            }
          ],
        },
      ],
      temperature: 0.7,
      // Enable image output explicitly via type casting
      ...({
        experimental_providerOptions: {
          google: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        }
      } as any),
    });

    // Extract generated image from response
    console.log('Processing response...');
    console.log('Response has text:', !!result.text);
    
    let generatedImage: Buffer | undefined;
    
    // In AI SDK v5, check various possible locations for the image
    const resultAny = result as any;
    
    // Check for files in the result
    if (resultAny.files && resultAny.files.length > 0) {
      console.log(`Found ${resultAny.files.length} files in response`);
      
      for (const file of resultAny.files) {
        console.log('File info:', {
          mimeType: file.mimeType || file.mediaType,
          hasData: !!file.data,
          hasBase64: !!file.base64
        });
        
        if (file.mimeType?.startsWith('image/') || file.mediaType?.startsWith('image/')) {
          console.log('Found image file');
          
          if (file.data) {
            // Handle base64 data
            const base64Data = file.data.includes(',') 
              ? file.data.split(',')[1] 
              : file.data;
            generatedImage = Buffer.from(base64Data, 'base64');
            console.log('Converted base64 to buffer');
          } else if (file.base64) {
            generatedImage = Buffer.from(file.base64, 'base64');
            console.log('Converted base64 to buffer');
          }
          break;
        }
      }
    }
    
    // Check for images in response metadata
    if (!generatedImage && resultAny.response) {
      console.log('Checking response metadata for images...');
      const responseData = resultAny.response;
      
      // Try to extract from various possible locations
      if (responseData.images && responseData.images.length > 0) {
        const image = responseData.images[0];
        if (image.base64) {
          generatedImage = Buffer.from(image.base64, 'base64');
          console.log('Found image in response.images');
        }
      }
    }
    
    // Check for provider-specific response
    if (!generatedImage && resultAny.providerMetadata) {
      console.log('Checking provider metadata...');
      const metadata = resultAny.providerMetadata;
      if (metadata.google?.files) {
        for (const file of metadata.google.files) {
          if (file.mimeType?.startsWith('image/')) {
            if (file.data || file.base64) {
              const base64Data = file.data || file.base64;
              generatedImage = Buffer.from(base64Data.split(',').pop() || base64Data, 'base64');
              console.log('Found image in provider metadata');
              break;
            }
          }
        }
      }
    }
    
    if (!generatedImage) {
      console.error('No image generated. Full result:', JSON.stringify(result, null, 2).substring(0, 1000));
      throw new Error('No image generated in the response');
    }
    
    console.log('Generated image size:', (generatedImage.length / 1024 / 1024).toFixed(2), 'MB');

    // Store result image
    console.log('Storing generated image to Vercel Blob...');
    const resultBlob = await put(
      `jobs/${jobId}/result.jpg`,
      generatedImage as any,  // Type casting for Edge runtime compatibility
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
    
    // Check for specific API Gateway errors
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.error('Authentication error - check AI_GATEWAY_API_KEY');
      console.error('========================');
      return NextResponse.json(
        { error: 'Authentication failed. Please check your Vercel AI Gateway API key.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.error('Model not found - verify model availability in Vercel AI Gateway');
      console.error('========================');
      return NextResponse.json(
        { error: 'Model not available. Please check Vercel AI Gateway access.' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('payload') || error.message?.includes('too large')) {
      console.error('Payload too large - image exceeds size limits');
      console.error('========================');
      return NextResponse.json(
        { error: 'Image is too large. Please use a smaller image (max ~20MB for best results).' },
        { status: 413 }
      );
    }
    
    console.error('========================');
    
    return NextResponse.json(
      { error: error.message || 'Generation failed. Please try again.' },
      { status: 500 }
    );
  }
}