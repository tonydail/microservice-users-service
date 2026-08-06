import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
