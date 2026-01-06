import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface AvatarStackProps {
  avatars: {
    src?: string;
    name: string;
    fallback?: string;
  }[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: { avatar: "w-7 h-7 text-xs", overlap: "-ml-2", border: "border-2" },
  md: { avatar: "w-9 h-9 text-sm", overlap: "-ml-3", border: "border-2" },
  lg: { avatar: "w-12 h-12 text-base", overlap: "-ml-4", border: "border-[3px]" },
};

export function AvatarStack({ avatars, max = 4, size = "md", className }: AvatarStackProps) {
  const styles = sizeStyles[size];
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            "rounded-full bg-muted flex items-center justify-center border-background shrink-0 overflow-hidden",
            styles.avatar,
            styles.border,
            index > 0 && styles.overlap
          )}
          title={avatar.name}
        >
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={avatar.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-medium text-muted-foreground">
              {avatar.fallback || getInitials(avatar.name)}
            </span>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-muted flex items-center justify-center border-background shrink-0",
            styles.avatar,
            styles.border,
            styles.overlap
          )}
        >
          <span className="font-medium text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

// Single Avatar with status indicator
interface AvatarWithStatusProps {
  src?: string;
  name: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
  showStatus?: boolean;
  className?: string;
}

const avatarSizeStyles = {
  sm: { avatar: "w-8 h-8", status: "w-2.5 h-2.5 border", text: "text-xs" },
  md: { avatar: "w-10 h-10", status: "w-3 h-3 border-2", text: "text-sm" },
  lg: { avatar: "w-14 h-14", status: "w-4 h-4 border-2", text: "text-base" },
  xl: { avatar: "w-20 h-20", status: "w-5 h-5 border-2", text: "text-lg" },
};

const statusColors = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  busy: "bg-destructive",
  away: "bg-warning",
};

export function AvatarWithStatus({
  src,
  name,
  fallback,
  size = "md",
  status,
  showStatus = true,
  className,
}: AvatarWithStatusProps) {
  const styles = avatarSizeStyles[size];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center overflow-hidden",
          styles.avatar
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className={cn("font-medium text-muted-foreground", styles.text)}>
            {fallback || getInitials(name)}
          </span>
        )}
      </div>
      {showStatus && status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-background",
            styles.status,
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// User Info Card (Avatar + Name + Role)
interface UserInfoProps {
  name: string;
  role?: string;
  email?: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

export function UserInfo({ name, role, email, avatar, size = "md", status, className }: UserInfoProps) {
  const textSizes = {
    sm: { name: "text-sm", role: "text-xs" },
    md: { name: "text-base", role: "text-sm" },
    lg: { name: "text-lg", role: "text-base" },
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AvatarWithStatus
        src={avatar}
        name={name}
        size={size}
        status={status}
        showStatus={!!status}
      />
      <div className="min-w-0">
        <p className={cn("font-medium text-foreground truncate", textSizes[size].name)}>
          {name}
        </p>
        {(role || email) && (
          <p className={cn("text-muted-foreground truncate", textSizes[size].role)}>
            {role || email}
          </p>
        )}
      </div>
    </div>
  );
}
