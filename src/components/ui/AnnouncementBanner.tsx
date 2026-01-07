import { useState } from 'react';
import { X, Sparkles, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AnnouncementType = 'info' | 'success' | 'warning';

interface Announcement {
  id: string;
  message: string;
  type: AnnouncementType;
  badge?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}

interface AnnouncementBannerProps {
  announcement: Announcement;
  className?: string;
  onDismiss?: () => void;
}

const typeConfig: Record<AnnouncementType, { 
  bg: string; 
  border: string;
  icon: typeof Info;
  iconClass: string;
}> = {
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    icon: Info,
    iconClass: 'text-info',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    icon: CheckCircle2,
    iconClass: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
};

export function AnnouncementBanner({ 
  announcement, 
  className,
  onDismiss 
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(() => {
    const dismissed = localStorage.getItem(`announcement-${announcement.id}`);
    return !dismissed;
  });

  const handleDismiss = () => {
    localStorage.setItem(`announcement-${announcement.id}`, 'true');
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const config = typeConfig[announcement.type];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "border-b px-4 py-3 transition-all duration-200",
        config.bg,
        config.border,
        className
      )}
      role="banner"
      aria-label="Anúncio"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className={cn("w-5 h-5 shrink-0", config.iconClass)} aria-hidden="true" />
          {announcement.badge && (
            <Badge variant="secondary" className="shrink-0">
              {announcement.badge}
            </Badge>
          )}
          <p className="text-sm font-medium text-foreground truncate">
            {announcement.message}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {announcement.cta && (
            <Button
              onClick={announcement.cta.onClick}
              size="sm"
              variant="outline"
            >
              {announcement.cta.label}
            </Button>
          )}
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Fechar anúncio"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Versão simples para notificações inline
interface SimpleAnnouncementProps {
  message: string;
  type?: AnnouncementType;
  className?: string;
}

export function SimpleAnnouncement({ 
  message, 
  type = 'info',
  className 
}: SimpleAnnouncementProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        config.bg,
        className
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", config.iconClass)} />
      <span className="text-foreground">{message}</span>
    </div>
  );
}
