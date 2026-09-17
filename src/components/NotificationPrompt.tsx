import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  isNative,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/lib/native-bridge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PROMPT_KEY = "reset-notification-prompt";

export function NotificationPrompt({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || window.localStorage.getItem(PROMPT_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready]);

  async function enable() {
    setBusy(true);
    try {
      const allowed = isNative
        ? await scheduleDailyReminder(9, 0)
        : await requestNotificationPermission();
      if (!allowed) {
        toast.message("Notifications are still off. You can enable them later in Account.");
        return;
      }
      window.localStorage.setItem(PROMPT_KEY, "enabled");
      if (isNative) {
        window.localStorage.setItem("reset-daily-reminder", "on");
        window.localStorage.setItem("reset-daily-reminder-time", "09:00");
      }
      setOpen(false);
      toast.success(isNative ? "Daily motivation is on for 9:00 AM." : "Quest alerts are on.");
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    window.localStorage.setItem(PROMPT_KEY, "dismissed");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm text-center soft-pop">
        <DialogHeader className="items-center text-center">
          <div className="grid size-20 place-items-center rounded-full bg-accent/15 gentle-float">
            <BellRing className="size-10 text-accent" />
          </div>
          <DialogTitle className="font-hand text-4xl">Keep your momentum</DialogTitle>
          <DialogDescription className="text-base">
            {isNative
              ? "Get a supportive daily reminder to check in, protect your streak, and open today’s quests."
              : "Allow alerts so RESET can celebrate finished quests. Daily comeback reminders are available in the Android app."}
          </DialogDescription>
        </DialogHeader>
        <Button className="btn-glossy h-12 w-full font-bold" disabled={busy} onClick={enable}>
          <BellRing className="size-5" /> {busy ? "Turning on…" : "Enable notifications"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={notNow}>
          Not now
        </Button>
      </DialogContent>
    </Dialog>
  );
}