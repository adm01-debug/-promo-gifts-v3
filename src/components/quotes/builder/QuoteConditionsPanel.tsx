import { Package, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CompanyContactSelector } from '@/components/quotes/CompanyContactSelector';

interface QuoteConditionsPanelProps {
  s: any; // State facade
}

export function QuoteConditionsPanel({ s }: QuoteConditionsPanelProps) {
  return (
    <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto pr-1">
      {/* Empresa + Contato */}
      <div
        className={cn(
          'space-y-4 rounded-2xl border bg-card p-4',
          s.validationErrors.includes('empresa') || s.validationErrors.includes('contato')
            ? 'border-destructive/50'
            : 'border-border/50',
        )}
      >
        <CompanyContactSelector
          companyId={s.clientId}
          contactId={s.contactId}
          onCompanyChange={s.setClientId}
          onContactChange={s.setContactId}
          onCompanyInfoChange={s.setCompanyInfo}
          onContactInfoChange={s.setContactInfo}
        />
        {(s.validationErrors.includes('empresa') || s.validationErrors.includes('contato')) && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {s.validationErrors.includes('empresa') ? 'Selecione uma empresa' : 'Selecione um contato'}
          </p>
        )}
      </div>

      {/* Validade */}
      <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <span className="text-primary">📅</span>Validade | Proposta
        </h3>
        <Select
          value={s.validityDays}
          onValueChange={(val) => {
            s.setValidityDays(val);
            const { format, addDays } = require('date-fns');
            s.setValidUntil(format(addDays(new Date(), parseInt(val)), 'yyyy-MM-dd'));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 dia</SelectItem>
            <SelectItem value="3">3 dias</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Condições Comerciais */}
      <div
        className={cn(
          'space-y-3 rounded-2xl border bg-card p-4',
          ['prazo_pagamento', 'prazo_entrega', 'frete', 'valor_frete'].some(e => s.validationErrors.includes(e))
            ? 'border-destructive/50'
            : 'border-border/50',
        )}
      >
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Package className="h-4 w-4 text-primary" />
          Condições
        </h3>

        {/* Pagamento */}
        <div className="space-y-1">
          <Label className={cn('text-xs', s.validationErrors.includes('prazo_pagamento') ? 'text-destructive' : 'text-muted-foreground')}>
            Prazo | Pagamento {s.validationErrors.includes('prazo_pagamento') && <span className="ml-1">*</span>}
          </Label>
          <Select value={s.paymentTerms} onValueChange={s.setPaymentTerms}>
            <SelectTrigger className={cn('h-8 text-xs', s.validationErrors.includes('prazo_pagamento') && 'border-destructive')}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="21_dias">21 dias | A partir da entrega</SelectItem>
              <SelectItem value="28_dias">28 dias | A partir da entrega</SelectItem>
              <SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entrega */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className={cn('text-xs', s.validationErrors.includes('prazo_entrega') ? 'text-destructive' : 'text-muted-foreground')}>
              Prazo | Entrega {s.validationErrors.includes('prazo_entrega') && <span className="ml-1">*</span>}
            </Label>
            <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
              {['prazo', 'data'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    s.setDeliveryMode(mode);
                    s.setDeliveryTime('');
                    if (mode === 'prazo') s.setDeliveryDate(undefined);
                  }}
                  className={cn(
                    'rounded-sm px-2 py-0.5 text-[10px] font-medium transition-colors',
                    s.deliveryMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {s.deliveryMode === 'prazo' ? (
            <Select value={s.deliveryTime} onValueChange={s.setDeliveryTime}>
              <SelectTrigger className={cn('h-8 text-xs', s.validationErrors.includes('prazo_entrega') && 'border-destructive')}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14_dias">14 dias | Após aprovação</SelectItem>
                <SelectItem value="21_dias">21 dias | Após aprovação</SelectItem>
                <SelectItem value="28_dias">28 dias | Após aprovação</SelectItem>
                <SelectItem value="45_dias">45 dias | Após aprovação</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-8 w-full justify-start text-left text-xs font-normal',
                    !s.deliveryDate && 'text-muted-foreground',
                    s.validationErrors.includes('prazo_entrega') && 'border-destructive',
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {s.deliveryDate ? format(s.deliveryDate, 'dd/MM/yyyy') : 'Escolha uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={s.deliveryDate}
                  onSelect={(date) => {
                    s.setDeliveryDate(date);
                    if (date) s.setDeliveryTime(`date:${format(date, 'yyyy-MM-dd')}`);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Frete */}
        <div className="space-y-1">
          <Label className={cn('text-xs', s.validationErrors.includes('frete') ? 'text-destructive' : 'text-muted-foreground')}>
            Frete {s.validationErrors.includes('frete') && <span className="ml-1">*</span>}
          </Label>
          <Select value={s.shippingType} onValueChange={s.setShippingType}>
            <SelectTrigger className={cn('h-8 text-xs', s.validationErrors.includes('frete') && 'border-destructive')}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cif">CIF | Por conta do fornecedor</SelectItem>
              <SelectItem value="fob">FOB | Por conta do cliente</SelectItem>
              <SelectItem value="fob_pre">FOB Antecipado | Pago pelo cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(s.shippingType === 'fob_pre' || s.shippingType === 'fob') && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
            <Label className={cn('text-xs', s.validationErrors.includes('valor_frete') ? 'text-destructive' : 'text-muted-foreground')}>
              Valor do Frete {s.validationErrors.includes('valor_frete') && <span className="ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={s.shippingCost}
              onChange={(e) => s.setShippingCost(parseFloat(e.target.value) || 0)}
              className={cn('h-8 text-xs', s.validationErrors.includes('valor_frete') && 'border-destructive')}
              placeholder="R$ 0,00"
            />
          </div>
        )}
      </div>
    </div>
  );
}
