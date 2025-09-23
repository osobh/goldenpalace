import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

export class ValidationMiddleware {
  validate<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = schema.safeParse(req.body);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error.errors[0]?.message || 'Validation failed',
            details: result.error.errors,
          });
        }

        req.body = result.data;
        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
        });
      }
    };
  }

  validateQuery<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = schema.safeParse(req.query);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error.errors[0]?.message || 'Validation failed',
            details: result.error.errors,
          });
        }

        req.query = result.data as any;
        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
        });
      }
    };
  }
}