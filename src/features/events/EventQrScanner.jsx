import { BrowserQRCodeReader } from "@zxing/browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCheckInEvent } from "@/features/events/useEvents";

export default function EventQrScanner({ eventId, open, onOpenChange }) {
  const [videoElement, setVideoElement] = useState(null);
  const { mutate: checkIn } = useCheckInEvent();

  useEffect(() => {
    if (!open || !videoElement) return;

    const reader = new BrowserQRCodeReader();
    let controls;
    let stopped = false;
    let scanned = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoElement,
        (result, _error, activeControls) => {
          if (!result || scanned) return;

          scanned = true;
          activeControls.stop();
          checkIn(
            { id: eventId, token: result.getText() },
            {
              onSuccess: () => toast.success("Check-in successful."),
              onError: (error) => toast.error(error.message),
              onSettled: () => onOpenChange(false),
            },
          );
        },
      )
      .then((scannerControls) => {
        if (stopped) scannerControls.stop();
        else controls = scannerControls;
      })
      .catch(() => {
        if (stopped) return;
        toast.error("Unable to open the camera.");
        onOpenChange(false);
      });

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [checkIn, eventId, onOpenChange, open, videoElement]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan attendee QR</DialogTitle>
          <DialogDescription>
            Point the camera at the attendee’s QR code.
          </DialogDescription>
        </DialogHeader>

        <video
          ref={setVideoElement}
          className="aspect-video w-full rounded-lg bg-black object-cover"
          aria-label="QR scanner camera preview"
          autoPlay
          muted
          playsInline
        />
      </DialogContent>
    </Dialog>
  );
}
