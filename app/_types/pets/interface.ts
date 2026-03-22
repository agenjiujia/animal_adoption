import { z } from "zod";
import { petCreateSchema, petUpdateSchema } from "@/types/pets/schema";

export type PetCreate = z.infer<typeof petCreateSchema>;
export type PetUpdate = z.infer<typeof petUpdateSchema>;
