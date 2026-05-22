"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase-client";
import { COLLECTIONS } from "@/lib/types";

interface ComposeEmailProps {
  uid: string;
  fromEmail: string;
  /** Optional thread to reply to. New compose generates a fresh thread id. */
  threadId?: string;
  /** Locked recipient — support@lemonpay.rw by default. */
  to?: string;
  onSent?: (threadId: string) => void;
}

const SUPPORT = "support@lemonpay.rw";

export function ComposeEmail({
  uid,
  fromEmail,
  threadId,
  to = SUPPORT,
  onSent,
}: ComposeEmailProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are both required");
      return;
    }
    setSubmitting(true);
    const id = threadId ?? `thread_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await addDoc(collection(db, COLLECTIONS.emails), {
        user_id: uid,
        direction: "outbound",
        thread_id: id,
        from: fromEmail,
        to,
        subject: subject.trim(),
        body: body.trim(),
        sent_at: serverTimestamp(),
        read: true,
      });
      toast.success("Sent");
      setSubject("");
      setBody("");
      onSent?.(id);
    } catch (err) {
      toast.error(
        `Couldn't send: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSend}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-800">To</label>
        <Input
          value={to}
          disabled
          className="h-11 border-neutral-200 bg-neutral-50 text-neutral-700"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-neutral-800">
          Subject
        </label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={threadId ? "Re: …" : "What's this about?"}
          className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-neutral-800">
          Message
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          rows={10}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 bg-neutral-900 px-5 text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </form>
  );
}
