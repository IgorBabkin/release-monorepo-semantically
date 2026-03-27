import { z } from 'zod';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  priority: z.number().optional(),
});
