import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ValidationError(errors);
  }
  return result.data;
};

// Common validation schemas
export const emailSchema = z.string().email();
export const phoneSchema = z.string().min(8);
export const passwordSchema = z.string().min(6);
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
