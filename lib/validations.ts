import { z } from "zod";

export const registerSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  representativeName: z
    .string()
    .min(2, "Representative name must be at least 2 characters"),
  boothNumber: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  entranceType: z.enum(["BAZARNA", "BYOUTH"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const eventSettingsSchema = z.object({
  eventName: z.string().min(2, "Event name is required"),
  entranceType: z.enum(["BAZARNA", "BYOUTH"]),
  eventDate: z.string().min(1, "Event date is required"),
  queueOpenAt: z.string().min(1, "Queue open time is required"),
  queueCloseAt: z.string().min(1, "Queue close time is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
