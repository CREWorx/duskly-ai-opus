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