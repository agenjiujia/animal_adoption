import { z } from "zod";

export const petCreateSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(50),
  species: z.string().min(1, "种类不能为空").max(30),
  breed: z.string().max(50).optional(),
  age: z.number().int().min(0).optional(),
  gender: z.number().int().min(0).max(1).optional(),
  weight: z.number().min(0).optional(),
  health_status: z.string().optional(),
  vaccine_status: z.number().int().min(0).max(2).optional(),
  neutered: z.number().int().min(0).max(2).optional(),
  description: z.string().optional(),
  image_urls: z.string().optional(), // 前端传入 JSON 字符串或逗号分隔
});

export const petUpdateSchema = petCreateSchema.partial(); // 更新时所有字段可选
