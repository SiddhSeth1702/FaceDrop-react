import { useCallback, useEffect, useRef, useState } from "react";
import useRequestToServer from "@/service/httpService";

/** Enquiries sent from the public Studio page's "Is your date free?" form. */

export type LeadStatus = "new" | "replied" | "booked" | "not_a_fit";

export interface Lead {
  lead_id: number;
  name: string;
  phone: string;
  /** YYYY-MM-DD, or null if they didn't pick one. */
  event_date: string | null;
  city: string;
  message: string;
  status: LeadStatus;
  /** False until the photographer opens it. */
  read: boolean;
  /** wa.me link when the number looks reachable on WhatsApp. */
  whatsapp_link: string | null;
  created_at: string;
}

/** Headline numbers for the top of the inbox. */
export interface LeadStats {
  total: number;
  this_week: number;
  unread: number;
  needs_reply: number;
  booked: number;
  /** Whole percent of enquiries that were booked. */
  conversion: number;
  /** Dates in the next 60 days still in play. */
  upcoming: number;
}

export interface EnquiryForm {
  name: string;
  phone: string;
  event_date: string;
  city: string;
  message: string;
  /** Hidden from people; a bot that fills it is ignored. */
  website: string;
}

export const leadsUrls = {
  list: "user/studio/leads",
  lead: (leadId: number) => `user/studio/leads/${leadId}`,
  readAll: "user/studio/leads/read-all",
  /** Public, no sign-in. */
  send: (slug: string) => `user/studio-pages/${encodeURIComponent(slug)}/enquiries`,
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  replied: "Replied",
  booked: "Booked",
  not_a_fit: "Not a fit",
};

/** "14 Feb 2027" from "2027-02-14", without the browser's timezone moving it a day. */
export const formatEventDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** A WhatsApp opener that says where they came from. */
export const whatsappWithText = (link: string, name: string, studio: string) =>
  `${link}?text=${encodeURIComponent(`Hi ${name.split(" ")[0]}, this is ${studio} from FaceDrop. Thanks for your enquiry!`)}`;

const LEADS_CHANGED = "facedrop:leads-changed";
export const notifyLeadsChanged = () => window.dispatchEvent(new Event(LEADS_CHANGED));

/** Unread enquiries, for the sidebar badge. Refreshes after any change and every few minutes. */
export const useNewLeadCount = () => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await requestRef.current(`${leadsUrls.list}?status=unread&limit=1`, {}, "GET");
      if (response.status < 400) setCount(response.data.data.counts?.unread ?? 0);
    } catch {
      // The badge is a nicety; leave it as it was
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3 * 60 * 1000);
    window.addEventListener(LEADS_CHANGED, load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(LEADS_CHANGED, load);
    };
  }, [load]);

  return count;
};
