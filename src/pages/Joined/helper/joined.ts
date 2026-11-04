import { formatDate } from "@/lib/locale";

export const joinedUrls = {
  list: "user/memberships",
  join: "user/memberships/join",
  event: (eventId: string | number) => `user/memberships/${eventId}`,
  photos: (eventId: string | number) => `user/memberships/${eventId}/photos`,
  face: "user/face",
  hearts: (eventId: string | number) => `user/memberships/${eventId}/hearts`,
  review: (eventId: string | number) => `user/memberships/${eventId}/review`,
  downloads: (eventId: string | number) => `user/memberships/${eventId}/downloads`,
  reactivation: (eventId: string | number) => `user/memberships/${eventId}/reactivation`,
  downloadLink: (eventId: string | number) => `user/memberships/${eventId}/download-link`,
  members: (eventId: string | number) => `user/memberships/${eventId}/members`,
  memberPhotos: (eventId: string | number, memberId: number) => `user/memberships/${eventId}/members/${memberId}/photos`,
};

export interface Member {
  member_id: number;
  name: string;
  is_you: boolean;
  has_selfie: boolean;
  /** You may open the photos they're in (they added a selfie and share them). */
  can_view: boolean;
  photo_count: number | null;
}

/** Open a download link from the API (a zip streamed from S3) without leaving the page. */
export const startDownload = (apiPath: string) => {
  const link = document.createElement("a");
  link.href = `${import.meta.env.VITE_API_URL}/${apiPath}`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export interface MyReview {
  rating: number;
  comment: string;
  status: "pending" | "approved" | "hidden";
  guest_name: string;
}

export type Folder = "all" | "with_you" | "just_you";

/** needs_selfie: no enrollment selfie yet · ready: matches are current */
export type FaceState = "needs_selfie" | "ready";

export interface FaceProfile {
  enrolled: boolean;
  share_with_members?: boolean;
  consented_at?: string;
  selfie_url?: string;
}

/** live: photos to see · pending: host hasn't paid yet · expired: ask the host · removed: gone for good */
export type JoinedState = "live" | "pending" | "expired" | "removed";

export interface JoinedEvent {
  event_id: number;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  expires_at: string | null;
  state: JoinedState;
  cover_url: string | null;
  host_name: string | null;
  joined_at: string;
  photo_count: number;
  /** Only on the single-event endpoint, and only while the event is live. */
  face?: FaceState | null;
  folders?: Record<Folder, number>;
  /** This member already asked the host to bring the (expired) event back. */
  reactivation_requested?: boolean;
}

export interface MemberPhoto {
  file_id: number;
  thumb_url: string | null;
  display_url: string;
  download_url: string;
  hearted: boolean;
}

export const formatEventDate = (value: string) =>
  formatDate(value);
