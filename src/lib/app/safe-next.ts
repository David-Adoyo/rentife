/** Only allow redirects back into the app, never to another site. */
export const safeNext = (next: unknown, fallback = "/app") =>
  typeof next === "string" && /^\/(app|invite)(\/[\w\-/?=&.%]*)?$/.test(next) ? next : fallback;

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
