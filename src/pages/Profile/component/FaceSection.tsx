import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ScanFace, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import useRequestToServer from "@/service/httpService";
import { FaceProfile, formatEventDate, joinedUrls } from "@/pages/Joined/helper/joined";
import { FaceEnroll } from "@/pages/Joined/component/FaceEnroll";

/** The enrollment selfie: see it, retake it, or delete all face data (DPDP right to erasure). */
export const FaceSection = () => {
  const { requestToServer } = useRequestToServer();
  const { toast } = useToast();
  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const response = await requestToServer(joinedUrls.face, {}, "GET").catch(() => null);
    if (response && response.status < 400) setProfile(response.data.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    const response = await requestToServer(joinedUrls.face, {}, "DELETE").catch(() => null);
    if (response && response.status < 400) {
      setProfile({ enrolled: false });
      toast({ title: "Face data deleted", description: "Your selfie and every match are gone. All photos in your events still work." });
    } else {
      toast({ title: "Couldn't delete your face data", variant: "destructive" });
    }
  };

  const setSharing = async (share: boolean) => {
    setProfile((prev) => (prev ? { ...prev, share_with_members: share } : prev));
    const response = await requestToServer(joinedUrls.face, { share_with_members: share }, "PATCH").catch(() => null);
    if (!response || response.status >= 400) {
      setProfile((prev) => (prev ? { ...prev, share_with_members: !share } : prev));
      toast({ title: "Couldn't save that", variant: "destructive" });
    }
  };

  if (!profile) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <ScanFace className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight">Your face</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">The selfie we use to find you in events you join. Only you can see it.</p>
        </div>
      </div>

      {editing || !profile.enrolled ? (
        <>
          <FaceEnroll
            retake={profile.enrolled}
            className="max-w-none border-0 p-0 sm:p-0"
            onEnrolled={() => {
              setEditing(false);
              toast({ title: "Selfie saved", description: "Your events will look for you again the next time you open them." });
              void load();
            }}
          />
          {editing && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditing(false)}>
              Keep my current selfie
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          <figure className="polaroid w-28 shrink-0 -rotate-2 pb-2.5">
            {profile.selfie_url && <img src={profile.selfie_url} alt="Your selfie" className="aspect-square w-full rounded-[2px] object-cover" />}
            <figcaption className="pt-1.5 text-center font-hand text-base text-ink-950/70">that's you</figcaption>
          </figure>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              Added {profile.consented_at ? formatEventDate(profile.consented_at) : "earlier"}, with your consent.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-secondary/60 p-3">
              <Switch checked={!!profile.share_with_members} onCheckedChange={setSharing} className="mt-0.5" />
              <span className="text-sm">
                <span className="block font-semibold">Let other guests see photos I'm in</span>
                <span className="block text-muted-foreground">
                  Guests of the same event can tap your name in Group members. Your selfie is never shown.
                </span>
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <RefreshCw />
                Retake selfie
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-danger-foreground hover:text-danger-foreground">
                <Trash2 />
                Delete face data
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your face data?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll delete your selfie and every match. "Photos you're in" and "Just you" will be empty until you add a new selfie. Your events
              and All photos stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete face data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
