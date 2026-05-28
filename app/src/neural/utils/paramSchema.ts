import { z } from 'zod';
import { ParamDef } from '../graph/types';

export function createParamSchema(paramDefs: Record<string, ParamDef>) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, def] of Object.entries(paramDefs)) {
    let schema: z.ZodTypeAny;

    switch (def.type) {
      case 'int': {
        let s = z.number().int();
        if (def.min !== undefined) s = s.min(def.min);
        if (def.max !== undefined) s = s.max(def.max);
        schema = s;
        break;
      }
      case 'float': {
        let s = z.number();
        if (def.min !== undefined) s = s.min(def.min);
        if (def.max !== undefined) s = s.max(def.max);
        schema = s;
        break;
      }
      case 'string':
        schema = z.string();
        break;
      case 'bool':
        schema = z.boolean();
        break;
      case 'select':
        schema = def.options?.length
          ? z.enum(def.options as [string, ...string[]])
          : z.string();
        break;
      default:
        schema = z.any();
    }

    shape[key] = schema;
  }

  return z.object(shape);
}
