import { defineConfig } from "drizzle-kit";

// Falls back to a local database so `npm run db:push` works out of the box in
// development; point DATABASE_URL at the server to create the schema there.
const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});
