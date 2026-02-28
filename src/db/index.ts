import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// This will use the POSTGRES_URL environment variable by default
export const db = drizzle(sql, { schema });
