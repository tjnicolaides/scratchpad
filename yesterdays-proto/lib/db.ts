import { neon } from "@neondatabase/serverless";

// Netlify DB (Neon under the hood) injects NETLIFY_DATABASE_URL. Fall back to a
// plain DATABASE_URL for non-Netlify local dev. The serverless driver uses
// pooled HTTP, so it's safe from short-lived functions — do NOT swap in a
// long-lived `pg` Pool here.
const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "No database URL. Run `netlify db init`, or set DATABASE_URL for local dev.",
  );
}

export const sql = neon(url);
