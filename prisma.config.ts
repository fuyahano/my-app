import "dotenv/config";
import { defineConfig } from "prisma";

export default defineConfig({
  // スキーマの場所を「./prisma/schema.prisma」に固定するぞ
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
