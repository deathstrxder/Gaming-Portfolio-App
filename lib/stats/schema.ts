import { z } from "zod";


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

/**
 * Note this stays a plain `z.object`, which STRIPS unknown keys rather than
 * rejecting them. That is what lets the currently published snapshot — which
 * still contains a `hypixel` block from before the API application was denied —
 * keep parsing. Making this strict would take the live clips carousel down the
 * moment it fetched, because the snapshot on the stats-data branch is only
 * rewritten when the workflow next runs.
 */
export const snapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  providers: z.object({
    youtube: providerSchema(youtubeDataSchema).optional(),
  }),
});
