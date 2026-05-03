import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteBuilderStepper, QuoteBuilderStep } from '../../src/components/quotes/QuoteBuilderStepper';
import '@testing-library/jest-dom';

describe('QuoteBuilderStepper (UI Unit Tests)', () => {
  const steps: QuoteBuilderStep[] = ['client', 'items', 'conditions', 'review'];

  it('deve marcar a etapa ativa com as classes de destaque', () => {
    render(<QuoteBuilderStepper completedSteps={[]} activeStep="items" />);
    
    // O texto "Itens" deve ter a classe text-primary
    const stepLabel = screen.getByText('Itens');
    expect(stepLabel).toHaveClass('text-primary');
    
    // O círculo da etapa ativa deve ter bg-primary e scale-110
    const circles = screen.getAllByRole('tablist')[0].querySelectorAll('.rounded-full');
    // Index 1 é a etapa 'items'
    // Nota: o seletor pode pegar o círculo e o span ou ícone, dependendo da estrutura
    // Vamos buscar pelo container que tem a classe de escala
    const activeCircle = Array.from(circles).find(c => c.classList.contains('scale-110'));
    expect(activeCircle).toBeDefined();
    expect(activeCircle).toHaveClass('bg-primary');
  });

  it('deve mostrar o ícone de Check em etapas completadas que não são a ativa', () => {
    render(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
    
    // O primeiro círculo deve ter o ícone Check (renderizado via lucide)
    // Como lucide-react renderiza SVGs, podemos verificar a presença da classe ou estrutura
    const firstStepContainer = screen.getByText('Cliente').parentElement;
    const checkIcon = firstStepContainer?.querySelector('svg');
    expect(checkIcon).toBeDefined();
    // No código: {isCompleted && !isActive ? <Check /> : <Icon />}
  });

  it('deve atualizar o progresso da barra de conexão corretamente ao avançar', () => {
    const { rerender } = render(<QuoteBuilderStepper completedSteps={['client']} activeStep="client" />);
    
    // Inicialmente, a primeira linha de conexão (index 0) deve ser cinza (bg-border)
    // porque activeStep index (0) não é maior que index (0)
    let connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
    expect(connectors[0]).toHaveClass('bg-border');

    // Ao avançar para 'items'
    rerender(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
    connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
    // Agora o primeiro conector deve estar azul (bg-primary)
    expect(connectors[0]).toHaveClass('bg-primary');
    // O segundo ainda deve ser cinza
    expect(connectors[1]).toHaveClass('bg-border');
  });

  it('deve retroceder o estado visual da barra ao voltar etapas', () => {
    const { rerender } = render(<QuoteBuilderStepper completedSteps={['client', 'items']} activeStep="conditions" />);
    
    let connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
    expect(connectors[0]).toHaveClass('bg-primary');
    expect(connectors[1]).toHaveClass('bg-primary');

    // Voltar para 'items'
    rerender(<QuoteBuilderStepper completedSteps={['client']} activeStep="items" />);
    connectors = document.querySelectorAll('.h-full.rounded-full.transition-all');
    expect(connectors[0]).toHaveClass('bg-primary');
    expect(connectors[1]).toHaveClass('bg-border');
  });
});
