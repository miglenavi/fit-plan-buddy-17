import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email" })
    .email({ message: "That doesn't look like a valid email" })
    .max(255, { message: "Email is too long" }),
});

type Props = {
  /** Where on the site the signup happened, e.g. "home-hero" */
  source: string;
  role?: "trainer" | "client" | "other";
  className?: string;
  buttonLabel?: string;
  placeholder?: string;
};

export function WaitlistForm({
  source,
  role = "trainer",
  className = "",
  buttonLabel = "Join the list",
  placeholder = "you@example.com",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setStatus("saving");
    const { error: dbError } = await supabase.from("waitlist_signups").insert({
      email: parsed.data.email.toLowerCase(),
      role,
      source: source.slice(0, 100),
    });

    if (dbError) {
      // Unique violation = already on the list; treat as success.
      if (dbError.code === "23505") {
        setStatus("done");
        return;
      }
      setStatus("idle");
      setError("Something went wrong. Please try again.");
      return;
    }

    setStatus("done");
  };

  if (status === "done") {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm ${className}`}
        role="status"
      >
        <CheckCircle2 className="size-4 text-primary shrink-0" />
        <span>You're on the list. We'll email you when the next release lands.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`w-full ${className}`} noValidate>
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={`waitlist-${source}`} className="sr-only">
          Email address
        </label>
        <Input
          id={`waitlist-${source}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `waitlist-error-${source}` : undefined}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={status === "saving"} className="gap-2">
          {status === "saving" && <Loader2 className="size-4 animate-spin" />}
          {buttonLabel}
        </Button>
      </div>
      {error && (
        <p id={`waitlist-error-${source}`} className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        No spam. Occasional updates on retention and community features. Unsubscribe anytime.
      </p>
    </form>
  );
}
