'use client';

import { useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { PropertyForm } from '@/components/PropertyForm';
import { ResultViewer } from '@/components/ResultViewer';
import { GenerateInput } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

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