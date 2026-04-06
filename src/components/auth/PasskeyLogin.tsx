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
      className="w-full gap-2 border-orange/30 hover:border-orange hover:bg-orange/10"
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Fingerprint className="h-4 w-4 text-orange" />
      )}
      Entrar com Biometria
    </Button>
  );
});
