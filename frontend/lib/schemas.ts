import { z } from "zod";

/**
 * Validation schemas for API responses and data structures.
 * These schemas ensure runtime type safety for data coming from external sources.
 */

// Pixel color validation (6-digit hex color)
export const PixelColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// Canvas pixel schema
export const CanvasPixelSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  color: PixelColorSchema,
  authorId: z.string(),
  updatedAt: z.string(),
});

// Canvas dimensions schema
export const CanvasDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// Canvas snapshot schema
export const CanvasSnapshotSchema = z.object({
  name: z.string(),
  version: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  lastUpdatedAt: z.string(),
  pixels: z.array(CanvasPixelSchema),
});

// Canvas summary schema
export const CanvasSummarySchema = z.object({
  activeUsers: z.number().int().min(0),
  totalPixelsPlaced: z.number().int().min(0),
  cooldownSeconds: z.number().int().min(0),
});

// User profile schema
export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().url().optional(),
  accentColor: z.string().optional(),
  discriminator: z.string().optional(),
});

// Session state schema with discriminated union
export const SessionStateSchema = z.discriminatedUnion("isAuthenticated", [
  z.object({
    isAuthenticated: z.literal(true),
    user: UserProfileSchema,
  }),
  z.object({
    isAuthenticated: z.literal(false),
    user: z.null(),
  }),
]);

// Canvas stream event schema
export const CanvasStreamEventSchema = z.object({
  type: z.enum(["pixel", "reset", "system"]),
  payload: z.unknown(),
  emittedAt: z.string(),
});

// API response wrapper schemas
export const ApiSuccessResponseSchema = z.object({
  data: z.unknown(),
  meta: z
    .object({
      requestId: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
