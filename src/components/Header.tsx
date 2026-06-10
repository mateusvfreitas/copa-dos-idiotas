import { Link } from "@tanstack/react-router";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, LogOut } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  return (
    <header className="border-b-4 border-secondary bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
          <Trophy className="h-6 w-6 text-secondary" />
          <span>Bolão Copa 2026</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link to="/jogos" className="px-3 py-2 rounded hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15 px-3 py-2 rounded" }}>Jogos</Link>
          <Link to="/ranking" className="px-3 py-2 rounded hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15 px-3 py-2 rounded" }}>Ranking</Link>
          {user && (
            <>
              <Link to="/palpites" className="px-3 py-2 rounded hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15 px-3 py-2 rounded" }}>Meus palpites</Link>
              <Link to="/bonus" className="px-3 py-2 rounded hover:bg-primary-foreground/10" activeProps={{ className: "bg-primary-foreground/15 px-3 py-2 rounded" }}>Bônus</Link>
              {isAdmin && (
                <Link to="/admin" className="px-3 py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90" activeProps={{ className: "px-3 py-2 rounded bg-destructive text-destructive-foreground" }}>Admin</Link>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="secondary" size="sm">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
      <div className="md:hidden border-t border-primary-foreground/20 bg-primary text-primary-foreground">
        <div className="container mx-auto flex overflow-x-auto px-2 py-1 text-xs font-medium gap-1">
          <Link to="/jogos" className="px-2 py-1 rounded hover:bg-primary-foreground/10">Jogos</Link>
          <Link to="/ranking" className="px-2 py-1 rounded hover:bg-primary-foreground/10">Ranking</Link>
          {user && <Link to="/palpites" className="px-2 py-1 rounded hover:bg-primary-foreground/10">Palpites</Link>}
          {user && <Link to="/bonus" className="px-2 py-1 rounded hover:bg-primary-foreground/10">Bônus</Link>}
          {isAdmin && <Link to="/admin" className="px-2 py-1 rounded bg-destructive text-destructive-foreground">Admin</Link>}
        </div>
      </div>
    </header>
  );
}