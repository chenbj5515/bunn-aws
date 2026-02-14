import type { InferSelectModel } from "drizzle-orm";
import { characters } from "@/lib/db/schema";

/**
 * 角色类型（从 characters 表推导）
 */
export type Character = InferSelectModel<typeof characters>;
