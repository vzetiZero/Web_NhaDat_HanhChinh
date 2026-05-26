// Zod validation middleware
// Validate req.body, req.query, req.params

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error);
    }
    // Replace req[source] với data đã parse (có default values, coerce, etc.)
    (req as Request & Record<Source, unknown>)[source] = result.data;
    next();
  };
}
