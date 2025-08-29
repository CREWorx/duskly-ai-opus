import { z } from 'zod';

export const GenerateSchema = z.object({
  address: z.string().min(5).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bearing: z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;