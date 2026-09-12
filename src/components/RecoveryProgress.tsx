import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Heart, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localDateString, useRecoveryEvents } from "@/lib/profile";
import { logRecoveryRelapse, startRecoveryAttempt } from "@/lib/recovery.functions";

function calendarDaysSince(date: string, today: string) {
  const start = new Date(`${date}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

export function RecoveryProgress({ userId }: { userId?: string }) {
  const today = localDateString();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useRecoveryEvents(userId);
  const startAttempt = useServerFn(startRecoveryAttempt);
  const logRelapse = useServerFn(logRecoveryRelapse);
  const [startOpen, setStartOpen] = useState(false);
  const [relapseOpen, setRelapseOpen] = useState(false);
  const [quitDate, setQuitDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = events?.[0];
  const active = latest?.event_type === "quit";
  const days = useMemo(
    () => active && latest ? calendarDaysSince(latest.event_date, today) : 0,
    [active, latest, today],
  );

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recovery-events"] }),
      queryClient.invalidateQueries({ queryKey: ["daily-checkin"] }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
    ]);
  }

  async function saveStart() {
    setSaving(true);
    try {
      await startAttempt({ data: {
        localDate: quitDate,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      } });
      await refresh();
      setStartOpen(false);
      toast.success("Your recovery counter has started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start your recovery counter");
    } finally {
      setSaving(false);
    }
  }

  async function saveRelapse() {
    setSaving(true);
    try {
      const result = await logRelapse({ data: {
        localDate: today,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        note,
      } });
      await refresh();
      setRelapseOpen(false);
      setNote("");
      toast.message(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log your relapse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="cloud-card mb-6 p-4" aria-labelledby="recovery-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Real-world progress</p>
            <h2 id="recovery-title" className="font-hand text-3xl">{active ? `${days} days free` : "Ready when you are"}</h2>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15">
            <Heart className="size-5 text-primary" />
          </div>
        </div>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading your recovery history…</p>
        ) : active && latest ? (
          <>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="size-4 text-accent" /> Quit date: {formatDate(latest.event_date)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Daily check-ins verify your streak and earn XP.</p>
            <Button variant="outline" className="mt-4 w-full bg-cloud font-bold" onClick={() => setRelapseOpen(true)}>
              Log a relapse
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Choose the day you quit. Past days count toward your total, while XP starts with verified daily check-ins.</p>
            <Button className="btn-glossy mt-4 w-full font-bold" onClick={() => setStartOpen(true)}>
              <RotateCcw className="size-4" /> {latest ? "Start again" : "Start my quit"}
            </Button>
          </>
        )}
      </section>

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-hand text-3xl">When did you quit?</DialogTitle>
            <DialogDescription>This sets your real-world counter. Backdated days do not award XP.</DialogDescription>
          </DialogHeader>
          <Input type="date" max={today} value={quitDate} onChange={(event) => setQuitDate(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button>
            <Button className="btn-glossy" disabled={saving || !quitDate} onClick={saveStart}>{saving ? "Saving…" : "Start counter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={relapseOpen} onOpenChange={setRelapseOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-hand text-3xl">Log today honestly</DialogTitle>
            <DialogDescription>A relapse ends this attempt, not your progress. You can start again whenever you are ready.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Optional private note: what happened or what might help next time?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelapseOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={saveRelapse}>{saving ? "Saving…" : "Log relapse"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}