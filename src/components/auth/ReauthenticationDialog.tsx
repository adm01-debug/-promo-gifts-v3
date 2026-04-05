import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReauthentication } from '@/hooks/useReauthentication';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

interface ReauthenticationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  actionDescription?: string;
}

export function ReauthenticationDialog({
  open,
  onOpenChange,
  onSuccess,
  actionDescription = 'Esta ação requer confirmação de identidade',
}: ReauthenticationDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { reauthenticate, isReauthenticating } = useReauthentication();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({ title: 'Erro', description: 'Digite sua senha', variant: 'destructive' });
      return;
    }

    const result = await reauthenticate(password);
    
    if (result.success) {
      setPassword('');
      setShowPassword(false);
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Confirmar Identidade
          </DialogTitle>
          <DialogDescription>{actionDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-password">Senha atual</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reauth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="pl-10 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isReauthenticating}>
              {isReauthenticating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
