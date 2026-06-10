import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Bolão Copa 2026" },
      { name: "description", content: "Entre com sua conta Google para participar do bolão da Copa do Mundo 2026." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/palpites" });
    });
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/palpites",
    });
    if (result.error) {
      toast.error("Falha ao entrar: " + (result.error.message ?? "tente novamente"));
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/palpites" });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md bg-card border-2 border-border rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex p-4 rounded-full bg-primary text-primary-foreground mb-4">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black">Entrar no Bolão</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Entre com sua conta Google para palpitar a Copa 2026.
        </p>
        <Button
          onClick={signIn}
          disabled={loading}
          size="lg"
          className="w-full mt-8 font-bold"
        >
          {loading ? "Conectando…" : "Entrar com Google"}
        </Button>
        <Link to="/" className="block text-xs text-muted-foreground mt-6 hover:underline">
          ← Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}