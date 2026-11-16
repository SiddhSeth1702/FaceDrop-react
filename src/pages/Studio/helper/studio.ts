/**
 * The Studio page: a photographer's public page, built from their FaceDrop events.
 *
 * The draft is saved on the server (user/studio) as they type; publishing is a separate call that
 * checks the same rules again. Photos are stored as {file_id, event_id} and their URLs resolved on
 * load, because signed URLs expire.
 */

export const studioUrls = {
  mine: "user/studio",
  publish: "user/studio/publish",
  unpublish: "user/studio/unpublish",
  slugCheck: (slug: string) => `user/studio/slug-check?slug=${encodeURIComponent(slug)}`,
  /** Published pages, no sign-in needed. */
  publicPage: (slug: string) => `user/studio-pages/${encodeURIComponent(slug)}`,
};

export interface StudioPhotoRef {
  file_id: number;
  event_id: number;
}

export interface StudioService {
  id: string;
  name: string;
  /** Free text such as "1,20,000"; empty means "on request". */
  price: string;
}

export interface StudioDraft {
  slug: string;
  name: string;
  city: string;
  tagline: string;
  about: string;
  specialties: string[];
  instagram: string;
  whatsapp: string;
  cover: StudioPhotoRef | null;
  highlights: StudioPhotoRef[];
  listedEventIds: number[];
  hiddenReviewIds: number[];
  services: StudioService[];
  showPrices: boolean;
  /** How the public page looks. Older drafts without it are light. */
  theme?: "light" | "dark";
  /** The photographer confirmed their clients agreed to these photos being shown. */
  permission: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export const MAX_HIGHLIGHTS = 12;
export const TAGLINE_MAX = 120;
export const ABOUT_MAX = 400;

export const SPECIALTY_OPTIONS = [
  "Weddings",
  "Pre-weddings",
  "Sangeet & mehendi",
  "Engagements",
  "Birthdays",
  "Corporate events",
  "Portraits",
  "Maternity & baby",
];

const DRAFT_KEY = "facedrop-studio-draft";

/** "Siddh Seth Studio" → "siddh-seth-studio" */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

export const newServiceId = () => Math.random().toString(36).slice(2, 10);

export const emptyDraft = (name: string): StudioDraft => ({
  slug: slugify(name || "my-studio"),
  name: name || "",
  city: "",
  tagline: "",
  about: "",
  specialties: ["Weddings"],
  instagram: "",
  whatsapp: "",
  cover: null,
  highlights: [],
  listedEventIds: [],
  hiddenReviewIds: [],
  services: [
    { id: newServiceId(), name: "Wedding", price: "" },
    { id: newServiceId(), name: "Pre-wedding shoot", price: "" },
  ],
  showPrices: false,
  theme: "light",
  permission: false,
  publishedAt: null,
  updatedAt: new Date().toISOString(),
});

/** What the server stores: everything except its own timestamps. */
export const toSaveBody = (draft: StudioDraft) => {
  const { publishedAt, updatedAt, ...body } = draft;
  return body;
};

/** A draft made before the backend existed, kept in this browser. Moved to the server once, then removed. */
export const takeLocalDraft = (userId: number | string | null): StudioDraft | null => {
  try {
    const key = `${DRAFT_KEY}-${userId ?? "me"}`;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StudioDraft) : null;
  } catch {
    return null;
  }
};

export const clearLocalDraft = (userId: number | string | null) => {
  try {
    localStorage.removeItem(`${DRAFT_KEY}-${userId ?? "me"}`);
  } catch {
    // Storage blocked: nothing to clear
  }
};

/** What user/studio-pages/:slug returns. Photo URLs are keyed by refKey. */
export interface PublicStudio {
  page: StudioDraft;
  stats: { events_delivered: number; guests_found: number; reviews: number; rating: number | null };
  events: { event_id: number; title: string; event_date: string; guests: number; cover_url: string | null }[];
  reviews: { review_id: number; rating: number; comment: string; guest_name: string; event_title: string }[];
  photos: Record<string, { url: string; hearts: number }>;
}

export const refKey = (ref: StudioPhotoRef) => `${ref.event_id}:${ref.file_id}`;
export const sameRef = (a: StudioPhotoRef | null | undefined, b: StudioPhotoRef | null | undefined) =>
  !!a && !!b && a.file_id === b.file_id && a.event_id === b.event_id;

/** What still blocks publishing, in the order the photographer should fix it. */
export const publishProblems = (draft: StudioDraft) => {
  const problems: string[] = [];
  if (!draft.name.trim()) problems.push("Add your studio name");
  if (!/^[a-z0-9-]{3,40}$/.test(draft.slug)) problems.push("Pick a page link (3–40 letters, numbers or dashes)");
  if (!draft.city.trim()) problems.push("Add your city");
  if (draft.highlights.length < 3) problems.push("Choose at least 3 highlight photos");
  if (!draft.permission) problems.push("Confirm you have your clients' permission");
  return problems;
};
