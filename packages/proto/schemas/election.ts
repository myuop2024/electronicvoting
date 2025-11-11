import { z } from 'zod';

export const ElectionPolicySchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allowOffline: z.boolean(),
  allowChannels: z.array(z.enum(['web', 'whatsapp', 'api', 'offline'])).min(1),
  verificationMode: z.enum(['code-only', 'didit-only', 'hybrid']),
  voteType: z.enum(['plurality', 'approval', 'ranked-choice', 'weighted']),
  geoFence: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()])))
    })
    .optional(),
  deviceLimit: z.number().int().nonnegative().optional(),
  ipThrottle: z.number().int().nonnegative().optional(),
  captcha: z.boolean().default(true)
});

export const ElectionCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().max(2000),
  orgId: z.string().uuid(),
  policies: ElectionPolicySchema,
  languages: z.array(z.string().min(2).max(5)).min(1),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
    logoUrl: z.string().url().optional(),
    heroImageUrl: z.string().url().optional()
  })
});

export const AllowlistImportSchema = z.object({
  format: z.enum(['csv', 'json']),
  entries: z.array(
    z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      memberId: z.string().optional()
    })
  )
});

export type ElectionCreateInput = z.infer<typeof ElectionCreateSchema>;
