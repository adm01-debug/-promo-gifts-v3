import { forwardRef, useState, useCallback, InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EnhancedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  isLoading?: boolean;
  showValidation?: boolean;
  mask?: "phone" | "cpf" | "cnpj" | "cep" | "currency" | "date";
  onChange?: (value: string, rawValue: string) => void;
  onValidate?: (value: string) => boolean | Promise<boolean>;
}

const masks = {
  phone: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    },
    placeholder: "(00) 00000-0000",
  },
  cpf: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    },
    placeholder: "000.000.000-00",
  },
  cnpj: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 14);
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
      if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    },
    placeholder: "00.000.000/0000-00",
  },
  cep: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    },
    placeholder: "00000-000",
  },
  currency: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "");
      if (!digits) return "";
      const number = parseInt(digits, 10) / 100;
      return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },
    placeholder: "R$ 0,00",
  },
  date: {
    apply: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    },
    placeholder: "DD/MM/AAAA",
  },
};

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      isLoading,
      showValidation = true,
      mask,
      onChange,
      onValidate,
      className,
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    const isPassword = type === "password";
    const hasError = !!error;
    const hasSuccess = !!success || (isValid === true && showValidation);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        let rawValue = value;

        if (mask && masks[mask]) {
          rawValue = value.replace(/\D/g, "");
          value = masks[mask].apply(value);
        }

        onChange?.(value, rawValue);

        if (onValidate && value) {
          const result = await onValidate(value);
          setIsValid(result);
        } else {
          setIsValid(null);
        }
      },
      [mask, onChange, onValidate]
    );

    const getInputType = () => {
      if (isPassword) return showPassword ? "text" : "password";
      return type;
    };

    const getPlaceholder = () => {
      if (props.placeholder) return props.placeholder;
      if (mask && masks[mask]) return masks[mask].placeholder;
      return undefined;
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor={inputId} className="text-sm font-medium">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={getInputType()}
            placeholder={getPlaceholder()}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "pr-10 transition-all duration-200",
              hasError && "border-destructive focus-visible:ring-destructive/50",
              hasSuccess && "border-success focus-visible:ring-success/50",
              isFocused && !hasError && !hasSuccess && "ring-2 ring-primary/20"
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {!isLoading && showValidation && isValid === true && !hasError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-success"
              >
                <Check className="h-4 w-4" />
              </motion.div>
            )}

            {!isLoading && hasError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
              </motion.div>
            )}

            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              id={`${inputId}-error`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-destructive flex items-center gap-1"
              role="alert"
            >
              <X className="h-3 w-3" />
              {error}
            </motion.p>
          )}

          {success && !error && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-success flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              {success}
            </motion.p>
          )}

          {hint && !error && !success && (
            <motion.p
              key="hint"
              id={`${inputId}-hint`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

/**
 * Character counter for textareas
 */
interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <span
      className={cn(
        "text-xs transition-colors",
        isAtLimit ? "text-destructive" : isNearLimit ? "text-warning" : "text-muted-foreground",
        className
      )}
    >
      {current}/{max}
    </span>
  );
}

/**
 * Password strength indicator
 */
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Fraca", color: "bg-destructive" };
    if (score <= 4) return { score: 2, label: "Média", color: "bg-warning" };
    return { score: 3, label: "Forte", color: "bg-success" };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <motion.div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full",
              level <= strength.score ? strength.color : "bg-muted"
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: level * 0.1 }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Força: <span className={cn(strength.color.replace("bg-", "text-"))}>{strength.label}</span>
      </p>
    </div>
  );
}
