import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  Loader2,
  Gift,
  Mail,
  Lock,
  ShieldAlert,
  Globe,
  Wifi,
  AlertTriangle,
} from 'lucide-react';
import { AuthBrandingPanel, AuthSpaceBackground } from './auth/AuthBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useIPValidation } from '@/hooks/useIPValidation';
import { PasskeyLogin } from '@/components/auth/PasskeyLogin';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { supabase } from '@/integrations/supabase/client';

import { loginSchema, type LoginFormData } from '@/lib/validations';

type LoginForm = LoginFormData;

// ContinuousRockets and AuthBrandingPanel extracted to ./auth/AuthBranding.tsx

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signIn, signOut } = useAuth();
  const { validateIPForAuthenticatedUser, logLoginAttempt, fetchCurrentIP } = useIPValidation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIP, setBlockedIP] = useState<string | null>(null);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [geoLocation, setGeoLocation] = useState<string | null>(null);
  // Fallback social → email/senha: mensagem amigável quando OAuth falha.
  const [socialError, setSocialError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Captura `?error=` vindo do SSOCallbackPage (Google falhou) e exibe o
  // banner de fallback. Limpa o param da URL para não persistir.
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setSocialError(err);
      const next = new URLSearchParams(searchParams);
      next.delete('error');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSocialError = useCallback((message: string) => {
    setSocialError(message);
    setTimeout(() => emailInputRef.current?.focus(), 50);
  }, []);

  const focusEmailFallback = useCallback(() => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Fetch IP and geolocation via edge function (works in preview + production)
  useEffect(() => {
    const loadIPInfo = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-visitor-info');
        if (!error && data) {
          if (data.ip) setCurrentIP(data.ip);
          if (data.city) setGeoLocation(`${data.city}, ${data.country_code}`);
        }
      } catch {
        // silent fail
      }
    };
    loadIPInfo();
  }, []);

  // Redirect if already logged in (only on initial load)
  useEffect(() => {
    if (user && !authLoading && !isSubmitting) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate, isSubmitting]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const validateAndRedirect = async (userId: string, email: string) => {
    try {
      const ipValidation = await validateIPForAuthenticatedUser(userId);

      if (!ipValidation.isAllowed && ipValidation.hasRestrictions) {
        await signOut();
        const reason = ipValidation.reason || 'access_blocked';
        await logLoginAttempt(email, userId, false, `${reason}: ${ipValidation.error}`);

        setIpBlocked(true);
        setBlockedIP(ipValidation.currentIP);

        toast({
          variant: 'destructive',
          title: 'Acesso Bloqueado',
          description:
            ipValidation.error || `Seu IP (${ipValidation.currentIP}) não está autorizado.`,
          duration: 10000,
        });
        return false;
      }

      await logLoginAttempt(email, userId, true);

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });

      navigate('/', { replace: true });
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      navigate('/', { replace: true }); // Fail-open
      return true;
    }
  };

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    setIpBlocked(false);

    try {
      // 10/10 Hardening: Verificação de brute-force persistente via Edge Function
      const { data: throttleData, error: throttleError } = await supabase.functions.invoke(
        'check-auth-throttling',
        {
          body: { 
            email: data.email,
            ip: currentIP || 'unknown'
          },
        },
      );

      if (throttleError || (throttleData && throttleData.blocked)) {
        const retryAfter = throttleData?.retry_after_minutes || 15;
        const reason = throttleData?.reason || 'Muitas tentativas falhas detectadas.';
        
        toast({
          variant: 'destructive',
          title: 'Acesso Temporariamente Bloqueado',
          description: `${reason} Tente novamente em ${retryAfter} minutos.`,
        });
        setIsSubmitting(false);
        return;
      }

      // 10/10 Hardening: Rate-limit secundário por endpoint
      const { data: limitData } = await supabase.functions.invoke(
        'rate-limit-check',
        {
          body: { endpoint: 'login' },
        },
      );

      if (limitData && !limitData.allowed) {
        toast({
          variant: 'destructive',
          title: 'Taxa de requisições excedida',
          description: `Muitas requisições do seu IP. Aguarde ${limitData.retryAfter || 60} segundos.`,
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await signIn(data.email, data.password);

      if (error) {
        // Registrar falha para o throttling persistente
        await logLoginAttempt(data.email, null, false, error.message);

        const description = error.message.includes('Invalid login credentials')
          ? 'Email ou senha incorretos'
          : error.message;

        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description,
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        await validateAndRedirect(userId, data.email);
      } else {
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background"
        role="main"
        aria-label="Carregando autenticação"
      >
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </main>
    );
  }

  return (
    <main
      className="relative flex min-h-screen overflow-hidden bg-[#0A0D14]"
      role="main"
      aria-label="Autenticação"
    >
      <PageSEO
        title="Login"
        description="Acesse a plataforma Promo Gifts. Faça login para gerenciar seus orçamentos e catálogo."
        path="/login"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Login — Promo Gifts',
          description: 'Página de autenticação da plataforma Promo Gifts.',
          url: 'https://criar-together-now.lovable.app/login',
        }}
      />
      {/* Fundo espacial unificado — cobre toda a tela (sem divisão no meio) */}
      <AuthSpaceBackground />

      {/* Left side - Branding */}
      <AuthBrandingPanel />

      {/* Right side - Auth Form */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in space-y-8">
          {/* Mobile Logo */}
          <div className="space-y-3 text-center lg:hidden">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-orange shadow-lg shadow-orange/30">
              <Gift className="h-8 w-8 text-orange-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Promo Gifts</h1>
              <p className="text-sm text-muted-foreground">Plataforma de Vendas</p>
            </div>
          </div>

          {/* IP Blocked Alert */}
          {ipBlocked && (
            <Card className="border-destructive bg-destructive/10 shadow-lg">
              <CardContent className="pb-6 pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-semibold text-destructive">
                      Acesso Bloqueado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seu endereço IP (
                      <span className="font-mono font-semibold text-foreground">{blockedIP}</span>)
                      não está autorizado a acessar esta conta.
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
          <Card
            className={`border-white/10 bg-black/50 shadow-2xl ring-1 ring-white/5 backdrop-blur-2xl ${ipBlocked ? 'pointer-events-none opacity-50' : ''}`}
          >
            {showForgotPassword ? (
              <CardContent className="pb-6 pt-6">
                <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-4">
                  <div className="space-y-1 text-center">
                    <h2 className="font-display text-xl font-semibold text-white">
                      Bem-vindo de volta
                    </h2>
                    <p className="text-sm text-white/60">
                      Entre com suas credenciais para continuar
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-2">
                  {socialError && (
                    <div
                      role="alert"
                      data-testid="social-login-fallback-banner"
                      className="animate-fade-in space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">Não consegui te autenticar pelo Google.</p>
                          <p className="break-words text-xs text-muted-foreground">{socialError}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="orange"
                          className="h-8 text-xs"
                          onClick={focusEmailFallback}
                          data-testid="social-fallback-use-email"
                        >
                          Entrar com e-mail e senha
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setSocialError(null)}
                        >
                          Dispensar
                        </Button>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={loginForm.handleSubmit(handleLogin)}
                    className="space-y-4"
                    data-testid="login-form"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white/90">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                          id="login-email"
                          data-testid="login-email-input"
                          type="email"
                          placeholder="seu@email.com"
                          className="h-12 rounded-xl border-white/10 bg-white/10 pl-10 lowercase text-white backdrop-blur-md transition-all duration-300 placeholder:text-white/40 focus:bg-white/20"
                          {...loginForm.register('email')}
                          ref={(el) => {
                            loginForm.register('email').ref(el);
                            emailInputRef.current = el;
                          }}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive" data-testid="login-error-msg">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white/90">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                          id="login-password"
                          data-testid="login-password-input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-12 rounded-xl border-white/10 bg-white/10 pl-10 pr-10 text-white backdrop-blur-md transition-all duration-300 placeholder:text-white/40 focus:bg-white/20"
                          {...loginForm.register('password')}
                        />
                        <button
                          type="button"
                          data-testid="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -mr-2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-white/50 transition-colors hover:text-orange"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        data-testid="login-forgot-link"
                        variant="link-secondary"
                        className="h-auto p-0 text-xs font-bold uppercase tracking-wider text-white/70 transition-colors hover:text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        ESQUECI MINHA SENHA
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      data-testid="login-submit"
                      className="h-12 w-full rounded-xl bg-[#3B82F6] text-base font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-[#2563EB] hover:shadow-xl hover:shadow-primary/40"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#0A0D14]/0 px-2 font-bold text-white/50 backdrop-blur-sm">
                          OU
                        </span>
                      </div>
                    </div>

                    <SocialLoginButtons onError={handleSocialError} />

                    <PasskeyLogin
                      email={loginForm.watch('email')}
                      disabled={isSubmitting}
                      onSuccess={async (userId) => {
                        setIsSubmitting(true);
                        try {
                          await validateAndRedirect(userId, loginForm.getValues('email'));
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    />
                  </form>
                </CardContent>
              </>
            )}
          </Card>

          {/* IP/Location Widget */}
          {currentIP && (
            <div
              className="mx-auto flex max-w-fit items-center justify-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 opacity-0 shadow-2xl backdrop-blur-xl"
              style={{ animation: 'scale-fade-in 0.5s ease-out 600ms forwards' }}
            >
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono font-bold tracking-tighter">{currentIP}</span>
              </div>
              {geoLocation && (
                <>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Wifi className="h-3.5 w-3.5 text-success" />
                    <span className="font-bold">{geoLocation}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito a usuários autorizados.
            <br />
            Contate o administrador para obter suas credenciais.
          </p>
        </div>
      </div>
    </main>
  );
}
