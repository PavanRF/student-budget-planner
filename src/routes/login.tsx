import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, SocialButtons } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SBP Student Budget Planner" },
      { name: "description", content: "Sign in to your student budget planner." },
      { property: "og:title", content: "Sign in — SBP" },
      { property: "og:description", content: "Sign in to your student budget planner." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/" });
  };
  return (
    <AuthShell
      title="Welcome back"
      sub="Pick up where you left off."
      footer={<>New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link></>}
    >
      <SocialButtons />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="pw">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}
