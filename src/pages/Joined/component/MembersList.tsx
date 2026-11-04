import { ChevronRight, Lock, ScanFace } from "lucide-react";
import { getInitials } from "@/pages/Auth/helper/validation";
import { formatNumber } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { Member } from "../helper/joined";

/** Avatar colours picked from the name, so each person keeps theirs. Never the selfie: that stays private. */
const AVATAR_COLOURS = ["bg-iris-500", "bg-rose-500", "bg-amber-500", "bg-emerald-600", "bg-sky-600", "bg-fuchsia-600"];
const colourFor = (name: string) => AVATAR_COLOURS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLOURS.length];

const Avatar = ({ name, large }: { name: string; large?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white",
      large ? "h-14 w-14 -rotate-3 text-lg" : "h-11 w-11 text-sm",
      colourFor(name)
    )}
  >
    {getInitials(name)}
  </span>
);

const photosLabel = (m: Member) =>
  m.photo_count === null ? null : m.photo_count === 1 ? "in 1 photo" : `in ${formatNumber(m.photo_count)} photos`;

/** Everyone who joined: you first, then the others by name. Tap someone to see the photos they're in. */
export const MembersList = ({
  members,
  onOpen,
  onAddSelfie,
}: {
  members: Member[];
  onOpen: (member: Member) => void;
  onAddSelfie: () => void;
}) => {
  const you = members.find((m) => m.is_you);
  const others = members.filter((m) => !m.is_you);

  return (
    <div className="mt-6">
      {you && (
        <button
          type="button"
          onClick={() => (you.can_view ? onOpen(you) : onAddSelfie())}
          className="flex w-full items-center gap-4 rounded-3xl border bg-card p-4 text-left transition-colors hover:bg-secondary/50 sm:p-5"
        >
          <Avatar name={you.name} large />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-lg font-bold">{you.name}</span>
              <span className="rotate-[-3deg] font-hand text-lg font-semibold text-primary">that's you</span>
            </span>
            <span className="block text-sm text-muted-foreground">
              {you.can_view ? photosLabel(you) : "Add a selfie to find the photos you're in"}
            </span>
          </span>
          {you.can_view ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <ScanFace className="h-5 w-5 text-primary" />}
        </button>
      )}

      <h3 className="mt-8 text-sm font-semibold text-muted-foreground">
        {others.length === 0 ? "No one else has joined yet" : others.length === 1 ? "1 other guest" : `${formatNumber(others.length)} other guests`}
      </h3>
      {others.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Share the event code with family and friends, and they'll show up here.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {others.map((m) => (
            <li key={m.member_id}>
              <button
                type="button"
                disabled={!m.can_view}
                onClick={() => onOpen(m)}
                className="flex w-full items-center gap-4 rounded-3xl border bg-card p-4 text-left sm:p-5 transition-colors enabled:hover:bg-secondary/50 disabled:cursor-default"
              >
                <Avatar name={m.name} large />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{m.name}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {m.can_view ? (
                      photosLabel(m)
                    ) : m.has_selfie ? (
                      <>
                        <Lock className="h-3 w-3" />
                        Keeps their photos private
                      </>
                    ) : (
                      "Hasn't added a selfie yet"
                    )}
                  </span>
                </span>
                {m.can_view && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
