import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SBP" },
      { name: "description", content: "Get a link to reset your SBP password." },
      { property: "og:title", content: "Reset password — SBP" },
      { property: "og:description", content: "Get a link to reset your SBP password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };
  return (
    <AuthShell
      title="Reset your password"
      sub={sent ? `If an account exists for ${email}, a reset link is on its way.` : "We'll email you a link."}
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      {!sent && (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
