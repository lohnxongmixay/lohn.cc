#!/usr/bin/env node
// Admin-only: create a login (or reset its password) while public sign-up stays disabled.
// Uses Better Auth's own password hasher, so the account works with normal email/password sign-in.
//
// Run inside the production container (DATABASE_URL comes from its podman secret):
//   podman exec -it lohn-crm node scripts/create-user.mjs --email you@example.com --name "Your Name"
//   podman exec -it lohn-crm node scripts/create-user.mjs --email you@example.com --reset-password
// Add --password '...' to choose the password; otherwise a random one is generated and printed once.
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

const require = createRequire(new URL('../../../packages/db/package.json', import.meta.url));
const { Client } = require('pg');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, all) => {
    if (!arg.startsWith('--')) return acc;
    const next = all[i + 1];
    acc.push([arg.slice(2), next && !next.startsWith('--') ? next : true]);
    return acc;
  }, []),
);

const email = String(args.email ?? '').trim().toLowerCase();
const reset = args['reset-password'] === true;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: create-user.mjs --email <address> [--name "Full Name"] [--password <pw>] [--reset-password]');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (run this inside the lohn-crm container).');
  process.exit(2);
}

const password = typeof args.password === 'string' ? args.password : randomBytes(15).toString('base64url');
if (password.length < 8) {
  console.error('Password must be at least 8 characters (Better Auth minimum).');
  process.exit(2);
}
const name = typeof args.name === 'string' ? args.name : email.split('@')[0];

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query('BEGIN');
  const existing = await db.query('SELECT id FROM "user" WHERE email = $1', [email]);
  const hash = await hashPassword(password);
  if (existing.rowCount) {
    if (!reset) throw new Error(`A user with ${email} already exists (use --reset-password to set a new password).`);
    const userId = existing.rows[0].id;
    const updated = await db.query(
      `UPDATE account SET password = $1, updated_at = now() WHERE user_id = $2 AND provider_id = 'credential'`,
      [hash, userId],
    );
    if (!updated.rowCount) {
      await db.query(
        `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
         VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
        [randomUUID(), userId, hash],
      );
    }
    await db.query('DELETE FROM session WHERE user_id = $1', [userId]); // sign out everywhere
    console.log(`Password reset for ${email}. Existing sessions were signed out.`);
  } else {
    if (reset) throw new Error(`No user with ${email}.`);
    const userId = randomUUID();
    await db.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, false, now(), now())`,
      [userId, name, email],
    );
    await db.query(
      `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
      [randomUUID(), userId, hash],
    );
    console.log(`Created user ${email} (${name}).`);
  }
  await db.query('COMMIT');
  if (typeof args.password !== 'string') console.log(`Password: ${password}`);
} catch (err) {
  await db.query('ROLLBACK').catch(() => {});
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
