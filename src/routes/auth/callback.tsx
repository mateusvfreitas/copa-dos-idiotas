import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message] = useState("Conectando…");

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorDescription = params.get("error_description");

      if (errorDescription) {
        toast.error("Falha ao entrar: " + errorDescription);
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("Falha ao entrar: " + error.message);
          if (!cancelled) navigate({ to: "/auth" });
          return;
        }
      } else {
        // Implicit / hash flow fallback (detectSessionInUrl)
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          toast.error("Falha ao entrar. Tente novamente.");
          if (!cancelled) navigate({ to: "/auth" });
          return;
        }
      }

      if (!cancelled) navigate({ to: "/palpites" });
    }

    finishLogin();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
      {message}
    </div>
  );
}
