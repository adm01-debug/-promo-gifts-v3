import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RememberMeCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function RememberMeCheckbox({ checked, onCheckedChange }: RememberMeCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="remember-me"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-orange data-[state=checked]:border-orange"
      />
      <Label 
        htmlFor="remember-me" 
        className="text-sm text-muted-foreground cursor-pointer select-none"
      >
        Lembrar de mim por 30 dias
      </Label>
    </div>
  );
}
