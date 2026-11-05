import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, SocialButtons } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — SBP Student Budget Planner" },
      { name: "description", content: "Start planning your student budget." },
      { property: "og:title", content: "Create account — SBP" },
      { property: "og:description", content: "Start planning your student budget." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) setSent(true);
  };
  if (sent)
    return (
      <AuthShell title="Check your inbox" sub={`We sent a confirmation link to ${email}. Open it to finish signing up.`}>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link>
      </AuthShell>
    );
  return (
    <AuthShell
      title="Create your account"
      sub="Takes a minute. Your numbers stay yours."
      footer={<>Already have one? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <SocialButtons />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}
