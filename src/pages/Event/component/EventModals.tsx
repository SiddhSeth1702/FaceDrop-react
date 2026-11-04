import { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AuthField } from "@/components/brand/AuthLayout";
import { ImagePlus, Loader2 } from "lucide-react";

export interface EditFormState {
    title: string;
    location: string;
    description: string;
    date: string;
}

interface EventModalsProps {
    isEditModalOpen: boolean;
    onEditModalChange: (open: boolean) => void;
    editForm: EditFormState;
    onFieldChange: (field: keyof EditFormState, value: string) => void;
    isEditFormValid: boolean;
    isSavingEdit: boolean;
    onSaveEdit: () => void;
    onThumbnailChange: (event: ChangeEvent<HTMLInputElement>) => void;
    thumbnailPreview: string | null;
    onResetThumbnail: () => void;
    isDeleteDialogOpen: boolean;
    onDeleteDialogChange: (open: boolean) => void;
    onDeleteEvent: () => void;
    isDeletingEvent: boolean;
}

export const EventModals = ({
    isEditModalOpen,
    onEditModalChange,
    editForm,
    onFieldChange,
    isEditFormValid,
    isSavingEdit,
    onSaveEdit,
    onThumbnailChange,
    thumbnailPreview,
    onResetThumbnail,
    isDeleteDialogOpen,
    onDeleteDialogChange,
    onDeleteEvent,
    isDeletingEvent,
}: EventModalsProps) => {
    return (
        <>
            <Dialog open={isEditModalOpen} onOpenChange={onEditModalChange}>
                <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl font-bold tracking-[-0.02em]">Edit event</DialogTitle>
                        <DialogDescription>
                            Update the name, date, place or cover photo. Guests see the changes right away.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <AuthField label="Event name" htmlFor="edit-title">
                                <Input
                                    id="edit-title"
                                    value={editForm.title}
                                    onChange={(e) => onFieldChange("title", e.target.value)}
                                    placeholder="e.g. Ananya & Rohan's Wedding"
                                />
                            </AuthField>
                        </div>
                        <AuthField label="Date" htmlFor="edit-date">
                            <Input
                                id="edit-date"
                                type="date"
                                value={editForm.date}
                                onChange={(e) => onFieldChange("date", e.target.value)}
                            />
                        </AuthField>
                        <AuthField label="Location" htmlFor="edit-location">
                            <Input
                                id="edit-location"
                                value={editForm.location}
                                onChange={(e) => onFieldChange("location", e.target.value)}
                                placeholder="e.g. Rambagh Palace, Jaipur"
                            />
                        </AuthField>
                        <div className="sm:col-span-2">
                            <AuthField label="Description" htmlFor="edit-description">
                                <Textarea
                                    id="edit-description"
                                    value={editForm.description}
                                    onChange={(e) => onFieldChange("description", e.target.value)}
                                    rows={4}
                                    placeholder="A line or two for guests"
                                    className="min-h-[112px] rounded-xl border-input bg-card text-[15px] shadow-sm placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/15"
                                />
                            </AuthField>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <p className="text-[13px] font-semibold">
                                Cover photo <span className="font-normal text-muted-foreground">(optional)</span>
                            </p>
                            <label
                                htmlFor="edit-thumbnail"
                                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-primary/50 bg-accent/50 p-5 text-center transition-colors hover:bg-accent"
                            >
                                {thumbnailPreview ? (
                                    <img
                                        src={thumbnailPreview}
                                        alt="Cover preview"
                                        className="h-36 w-full rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-sm">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                                            <ImagePlus className="h-5 w-5" />
                                        </div>
                                        <span className="font-semibold">Choose a new cover photo</span>
                                    </div>
                                )}
                                <input
                                    id="edit-thumbnail"
                                    type="file"
                                    accept=".heic,.HEIC,image/*"
                                    className="hidden"
                                    onChange={onThumbnailChange}
                                />
                            </label>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[12.5px] text-muted-foreground">
                                    Leave it empty to keep the current cover.
                                </p>
                                {thumbnailPreview && (
                                    <Button type="button" variant="ghost" size="sm" onClick={onResetThumbnail}>
                                        Remove new photo
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onEditModalChange(false)}
                            disabled={isSavingEdit}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSaveEdit}
                            disabled={!isEditFormValid || isSavingEdit}
                            className="w-full sm:w-auto"
                        >
                            {isSavingEdit && <Loader2 className="animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogChange}>
                <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl sm:rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-2xl font-bold tracking-[-0.02em]">
                            Delete this event?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This deletes the event, every photo in it and all matched faces. Guests won't be able to
                            find their photos any more, and it can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingEvent} className="rounded-full">
                            Keep it
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                onDeleteEvent();
                            }}
                            disabled={isDeletingEvent}
                            className="rounded-full bg-destructive text-destructive-foreground shadow-press hover:bg-destructive/90 focus-visible:ring-destructive"
                        >
                            {isDeletingEvent && <Loader2 className="animate-spin" />}
                            Delete event
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

