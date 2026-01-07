import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, HelpCircle, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface ImprovedFormFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  tooltip?: string;
  error?: string;
  success?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ImprovedFormField({
  label,
  required,
  optional,
  tooltip,
  error,
  success,
  loading,
  className,
  children,
}: ImprovedFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label
          className={cn(
            "text-sm font-medium transition-colors",
            error && "text-destructive",
            success && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>

        {optional && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            opcional
          </Badge>
        )}

        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}

        {success && !loading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-emerald-600 dark:text-emerald-400"
          >
            <Check className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </div>

      <div className="relative">
        {children}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-destructive mt-1.5 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ImprovedSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ImprovedSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  searchable,
  loading,
  emptyMessage = "Nenhuma opção encontrada",
  className,
}: ImprovedSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-11 transition-all",
          value && "border-primary/30",
          className
        )}
      >
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <div className="flex items-center gap-2">
              {selectedOption.icon}
              <span>{selectedOption.label}</span>
              {selectedOption.badge && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {selectedOption.badge}
                </Badge>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="py-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {option.icon && (
                  <div className="shrink-0 text-muted-foreground">
                    {option.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {option.badge && (
                      <Badge variant="outline" className="text-[10px]">
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
                {value === option.value && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

interface ImprovedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
}

export const ImprovedInput = forwardRef<HTMLInputElement, ImprovedInputProps>(
  ({ icon, suffix, loading, className, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            "h-11 transition-all",
            icon && "pl-10",
            (suffix || loading) && "pr-10",
            className
          )}
          {...props}
        />
        {(suffix || loading) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : suffix}
          </div>
        )}
      </div>
    );
  }
);

ImprovedInput.displayName = "ImprovedInput";
