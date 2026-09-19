import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@lohn/db";
import * as schema from "@lohn/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://app.lohn.cc",
  ],
  plugins: [organization()],
});

export type Auth = typeof auth;
