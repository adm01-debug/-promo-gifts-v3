import { useState, useEffect, forwardRef } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebAuthn } from "@/hooks/useWebAuthn";

interface PasskeyLoginProps {
  onSuccess: (userId: string) => void;
  email?: string;
  disabled?: boolean;
}

export const PasskeyLogin = forwardRef<HTMLButtonElement, PasskeyLoginProps>(function PasskeyLogin({ onSuccess, email, disabled }, ref) {
  const { isSupported, isLoading, authenticateWithPasskey, checkPlatformAuthenticator } = useWebAuthn();
  const [hasPlatformAuth, setHasPlatformAuth] = useState(false);

  useEffect(() => {
    checkPlatformAuthenticator().then(setHasPlatformAuth);
  }, [checkPlatformAuthenticator]);

  if (!isSupported || !hasPlatformAuth) {
    return null;
  }

  const handleClick = async () => {
    const result = await authenticateWithPasskey(email || "");
    if (result.success && result.userId) {
      onSuccess(result.userId);
    }
  };

  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className="w-full h-12 gap-3 font-bold uppercase tracking-widest border-border/40 bg-background/50 hover:bg-muted/50 transition-all shadow-sm text-primary hover:text-primary-glow group active:scale-[0.99] rounded-xl"
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Fingerprint className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
      )}
      Entrar com Biometria
    </Button>
  );
});