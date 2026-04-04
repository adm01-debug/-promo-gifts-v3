import { useState, useEffect } from "react";
import { PageSEO } from "@/components/seo/PageSEO";
import { useNavigate } from "react-router-dom";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Gift, Mail, Lock, User, Package, Factory, SlidersHorizontal, Brain, ShieldAlert, Rocket } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useIPValidation } from "@/hooks/useIPValidation";
import { PasskeyLogin } from "@/components/auth/PasskeyLogin";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { supabase } from "@/integrations/supabase/client";

import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from "@/lib/validations";

type LoginForm = LoginFormData;
type SignupForm = SignupFormData;

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const { validateIPForAuthenticatedUser, logLoginAttempt, fetchCurrentIP } = useIPValidation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIP, setBlockedIP] = useState<string | null>(null);
  const [isPasswordSafe, setIsPasswordSafe] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    setIpBlocked(false);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        await logLoginAttempt(data.email, null, false, error.message);
        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: "Email ou senha incorretos",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao entrar",
            description: error.message,
          });
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const ipValidation = await validateIPForAuthenticatedUser(userId);
        
        if (!ipValidation.isAllowed && ipValidation.hasRestrictions) {
          await signOut();
          const reason = ipValidation.reason || 'access_blocked';
          await logLoginAttempt(data.email, userId, false, `${reason}: ${ipValidation.error}`);
          
          setIpBlocked(true);
          setBlockedIP(ipValidation.currentIP);
          
          toast({
            variant: "destructive",
            title: "Acesso Bloqueado",
            description: ipValidation.error || `Seu IP (${ipValidation.currentIP}) não está autorizado.`,
            duration: 10000,
          });
          return;
        }

        await logLoginAttempt(data.email, userId, true);
      }

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso",
      });
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data: SignupForm) => {
    if (!isPasswordSafe) {
      toast({
        variant: "destructive",
        title: "Senha insegura",
        description: "Sua senha foi encontrada em vazamentos de dados. Escolha outra senha.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);
      
      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: "Este email já está cadastrado. Tente fazer login.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: error.message,
          });
        }
        return;
      }

      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu e-mail para confirmar sua conta antes de fazer login.",
        duration: 10000,
      });
      setActiveTab("login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background" role="main" aria-label="Carregando autenticação">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-background" role="main" aria-label="Autenticação">
      <PageSEO title="Login" description="Acesse a plataforma Promo Gifts. Faça login para gerenciar seus orçamentos e catálogo." path="/login" />
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-card via-card to-background relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-success/5 rounded-full blur-3xl" />
          
          {/* Animated stars */}
          {[...Array(18)].map((_, i) => {
            const size = 1 + (i % 3);
            const top = (i * 37 + 11) % 100;
            const left = (i * 53 + 7) % 100;
            const dur = 2 + (i % 4);
            const delay = (i * 0.3) % 2;
            return (
              <div
                key={`star-${i}`}
                className="absolute rounded-full bg-foreground/30"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  top: `${top}%`,
                  left: `${left}%`,
                  animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
                }}
              />
            );
          })}
          
          {/* Continuous rockets */}
          <ContinuousRockets />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-orange flex items-center justify-center shadow-lg shadow-orange/30">
                <Gift className="h-7 w-7 text-orange-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Promo Gifts
                </h1>
                <p className="text-orange font-semibold uppercase tracking-widest text-sm -mt-1">
                  Plataforma de Vendas
                </p>
              </div>
            </div>
            
            <div className="space-y-4 max-w-md">
              <h2 className="text-4xl xl:text-5xl font-display font-bold text-foreground leading-tight">
                Um Universo de Produtos, para o{" "}
                <span className="text-orange">Melhor Time das Galáxias!</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Explore nossa galáxia de brindes promocionais, compare produtos e encante seus clientes.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4 pt-6">
                {[
                  { label: "15.000+", desc: "Produtos", icon: Package },
                  { label: "50+", desc: "Fornecedores", icon: Factory },
                  { label: "Filtros", desc: "Avançados", icon: SlidersHorizontal },
                  { label: "IA", desc: "Recomendações", icon: Brain },
                ].map((item, i) => {
                  const IconComponent = item.icon;
                  return (
                    <div 
                      key={i} 
                      className="p-4 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg hover:shadow-xl hover:border-orange/50 hover:scale-[1.02] transition-all duration-300 group opacity-0"
                      style={{ 
                        animation: `scale-fade-in 0.5s ease-out ${300 + i * 150}ms forwards`
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-2xl font-bold text-orange">{item.label}</p>
                          <p className="text-sm font-medium text-foreground">{item.desc}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-orange/15 flex items-center justify-center group-hover:bg-orange/25 transition-colors">
                          <IconComponent className="h-5 w-5 text-orange" />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-4 pt-6 opacity-0" style={{ animation: 'scale-fade-in 0.5s ease-out 900ms forwards' }}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Dados protegidos</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>SSL Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="text-center lg:hidden space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-orange shadow-lg shadow-orange/30">
              <Gift className="h-8 w-8 text-orange-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Promo Gifts
              </h1>
              <p className="text-sm text-muted-foreground">
                Plataforma de Vendas
              </p>
            </div>
          </div>

          {/* IP Blocked Alert */}
          {ipBlocked && (
            <Card className="border-destructive bg-destructive/10 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-destructive">
                      Acesso Bloqueado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seu endereço IP (<span className="font-mono font-semibold text-foreground">{blockedIP}</span>) não está autorizado a acessar esta conta.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com o administrador do sistema para liberar seu acesso.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setIpBlocked(false);
                        setBlockedIP(null);
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auth Card */}
          <Card className={`border-border/60 bg-card shadow-2xl ring-1 ring-border/20 backdrop-blur-sm ${ipBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {showForgotPassword ? (
              <CardContent className="pt-6 pb-6">
                <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
              </CardContent>
            ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-orange data-[state=active]:text-orange-foreground"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-orange data-[state=active]:text-orange-foreground"
                  >
                    Cadastrar
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-2">
                {/* Login Tab */}
                <TabsContent value="login" className="mt-0 space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-semibold text-foreground">Bem-vindo de volta</h2>
                    <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
                  </div>
                  
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...loginForm.register("email")}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-foreground">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

interface RocketData {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

function ContinuousRockets() {
  const [rockets, setRockets] = useState<RocketData[]>([]);
  const nextId = React.useRef(0);

  useEffect(() => {
    function spawnRocket() {
      const id = nextId.current++;
      const rocket: RocketData = {
        id,
        left: 5 + Math.random() * 85,
        size: 20 + Math.random() * 24,
        duration: 3 + Math.random() * 2.5,
        delay: 0,
      };
      setRockets((prev) => [...prev, rocket]);

      // Remove after animation completes
      setTimeout(() => {
        setRockets((prev) => prev.filter((r) => r.id !== id));
      }, rocket.duration * 1000 + 500);
    }

    // Spawn first rockets quickly
    spawnRocket();
    const t1 = setTimeout(spawnRocket, 800);
    const t2 = setTimeout(spawnRocket, 1800);

    // Then keep spawning at random intervals (3-8s)
    let timer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      const interval = 3000 + Math.random() * 5000;
      timer = setTimeout(() => {
        spawnRocket();
        scheduleNext();
      }, interval);
    }
    scheduleNext();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {rockets.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0"
          style={{
            left: `${r.left}%`,
            animation: `rocketLaunch ${r.duration}s ease-out ${r.delay}s forwards`,
          }}
        >
          <div style={{ animation: 'rocketShake 0.15s ease-in-out infinite' }}>
            <Rocket
              className="text-orange -rotate-45"
              style={{ width: r.size, height: r.size }}
            />
          </div>
          {/* Flame */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-70"
            style={{
              top: `${r.size * 0.75}px`,
              width: `${r.size * 0.3}px`,
              height: `${r.size}px`,
              animation: 'flameTrail 0.3s ease-in-out infinite alternate',
              background: 'linear-gradient(to bottom, #f97316, #eab308, transparent)',
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-40"
            style={{
              top: `${r.size}px`,
              width: `${r.size * 0.15}px`,
              height: `${r.size * 1.5}px`,
              animation: 'flameTrail 0.2s ease-in-out infinite alternate-reverse',
              background: 'linear-gradient(to bottom, #f97316, transparent)',
            }}
          />
          {/* Smoke puff at base */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-muted-foreground/10"
            style={{
              top: `${r.size * 1.2}px`,
              width: `${r.size * 2}px`,
              height: `${r.size * 2}px`,
              animation: `smokeRise 2s ease-out forwards`,
              filter: 'blur(8px)',
            }}
          />
        </div>
      ))}
    </>
  );
}


                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm text-orange hover:text-orange/80"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      variant="orange"
                      className="w-full h-12 text-base font-semibold shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 transition-all duration-300" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <SocialLoginButtons />

                    <PasskeyLogin
                      email={loginForm.watch("email")}
                      disabled={isSubmitting}
                      onSuccess={async (userId) => {
                        toast({
                          title: "Autenticação biométrica",
                          description: "Autenticado com sucesso via passkey!",
                        });
                        navigate("/");
                      }}
                    />
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup" className="mt-0 space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-semibold text-foreground">Criar conta</h2>
                    <p className="text-sm text-muted-foreground">Preencha seus dados abaixo</p>
                  </div>

                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-foreground">Nome completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome"
                          className="pl-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...signupForm.register("fullName")}
                        />
                      </div>
                      {signupForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...signupForm.register("email")}
                        />
                      </div>
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...signupForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                      <PasswordStrengthIndicator password={signupForm.watch("password")} onStrengthChange={setIsPasswordSafe} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-foreground">Confirmar senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 bg-input border-border focus:border-orange focus:ring-orange"
                          {...signupForm.register("confirmPassword")}
                        />
                      </div>
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      variant="orange"
                      className="w-full h-11 text-base font-semibold" 
                      disabled={isSubmitting || !isPasswordSafe}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <SocialLoginButtons />
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
            )}
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Novos usuários são cadastrados como <span className="font-medium text-orange">Vendedores</span>.
            <br />
            Contate o administrador para acesso de Admin.
          </p>
        </div>
      </div>
    </main>
  );
}
