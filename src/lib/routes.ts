/** Every app path in one place. The public website lives at "/", the photographer app under "/dashboard". */
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",

  dashboard: "/dashboard",
  createEvent: "/dashboard/events/new",
  event: (id: string | number) => `/dashboard/events/${id}`,
  settings: "/dashboard/settings",
  plans: "/dashboard/plans",
  billing: "/dashboard/billing",
  insights: "/dashboard/insights",
  reviews: "/dashboard/reviews",

  joined: "/dashboard/joined",
  joinedEvent: (id: string | number) => `/dashboard/joined/${id}`,
  join: (code: string) => `/join/${encodeURIComponent(code)}`,

} as const;

/** Where to go after signing in: a "?next=" path on this site, otherwise the dashboard. */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : ROUTES.dashboard;
