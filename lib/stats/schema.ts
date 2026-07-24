import { z } from "zod";

const bridgeSchema = z.object({
  title: z.string(),
  wins: z.number(),
  losses: z.number(),
  wlr: z.number(),
  bestWinstreak: z.number(),
});

const skyblockSchema = z.object({
  networth: z.number(),
  profileName: z.string(),
});

const hypixelDataSchema = z.object({
  bridge: bridgeSchema,
  skyblock: skyblockSchema.optional(),
});

const youtubeVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  views: z.number(),
  publishedAt: z.string(),
});

const youtubeDataSchema = z.object({
  subscribers: z.number(),
  subscribersAreRounded: z.boolean(),
  videos: z.array(youtubeVideoSchema),
});

/** Wraps a provider's payload in the shared ok/stale/fetchedAt envelope. */
function providerSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    ok: z.boolean(),
    stale: z.boolean(),
    fetchedAt: z.string(),
    data: dataSchema.optional(),
  });
}

export const snapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  providers: z.object({
    hypixel: providerSchema(hypixelDataSchema).optional(),
    youtube: providerSchema(youtubeDataSchema).optional(),
  }),
});
