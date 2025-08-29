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