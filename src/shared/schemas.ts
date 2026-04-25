import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "ID inválido");
export const phoneSchema = z.string().trim().min(8).max(20);
