import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEmailPassword, setIsEmailPassword] = useState(true);
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      setLocation("/");
      window.location.reload(); // Force reload to refresh auth state
    },
    onError: (error) => {
      toast.error("Erro ao sincronizar sessão: " + error.message);
    }
  });

  useEffect(() => {
    // Check if user is already logged into Supabase
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Sync with our backend
        loginMutation.mutate({
          supabaseId: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.full_name || session.user.email || "User",
        });
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loginMutation.mutate({
          supabaseId: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.full_name || session.user.email || "User",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login'
      }
    });
    if (error) {
      toast.error("Erro no login com Google: " + error.message);
      setLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    setLoading(false);
    if (error) {
      toast.error("Erro no login: " + error.message);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/login',
      }
    });
    
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar link: " + error.message);
    } else {
      toast.success("Link de acesso enviado para seu e-8mail!");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Camera className="w-12 h-12 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold">Nexus Watch</CardTitle>
          <CardDescription>
            Acesse sua conta para monitorar suas câmeras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2" alt="Google" />
            Entrar com Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {isEmailPassword ? "Login com e-mail e senha" : "Ou via link de acesso"}
              </span>
            </div>
          </div>

          {isEmailPassword ? (
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="sua senha"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Link de Acesso"}
              </Button>
            </form>
          )}

          <div className="text-center mt-4">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-accent underline"
              onClick={() => setIsEmailPassword(!isEmailPassword)}
            >
              {isEmailPassword ? "Prefiro entrar com link mágico" : "Prefiro entrar com senha"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
