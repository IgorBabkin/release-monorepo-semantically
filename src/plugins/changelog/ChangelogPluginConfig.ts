import { z } from 'zod';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  template: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/)
    .optional(),
  changelogName: z.string().trim().optional(),
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  priority: z.number().optional(),
});
