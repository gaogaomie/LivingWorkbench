import { z } from "zod";

const publicEnvSchema = z.object({
  apiBaseUrl: z.string().startsWith("/").default("/api/v1"),
});

export const publicEnv = publicEnvSchema.parse({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});
