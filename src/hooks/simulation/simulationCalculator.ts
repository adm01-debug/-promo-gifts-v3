/**
 * simulationCalculator — Pure calculation logic for the simulator.
 * Extracted from useSimulation.ts to eliminate 3x duplication.
 */
import type { Technique, TechniqueSettings, SimulationOption } from "@/types/simulation";

function getCostMultiplier(codeUpper: string, settings: TechniqueSettings, area: number): number {
  if (codeUpper.includes("SILK") || codeUpper.includes("SERIGRAFIA")) return settings.colors;
  if (codeUpper.includes("DTF") || codeUpper.includes("SUB") || codeUpper.includes("TRANSFER")) return Math.max(1, area / 100);
  if (codeUpper.includes("BORD") || codeUpper.includes("EMBROID")) return Math.max(1, (area / 50) * Math.max(1, settings.colors * 0.5));
  if (codeUpper.includes("LASER")) return Math.max(1, area / 100);
  return 1;
}

export function calculateOptionForTechnique(
  technique: Technique,
  settings: TechniqueSettings,
  quantity: number,
  productUnitPrice: number,
  idSuffix?: string,
): SimulationOption {
  const area = settings.width * settings.height;
  const codeUpper = technique.code?.toUpperCase() || "";
  const unitCostMultiplier = getCostMultiplier(codeUpper, settings, area);

  const unitCost = technique.unit_cost * unitCostMultiplier * settings.positions;
  const setupCost = technique.setup_cost * settings.positions * (codeUpper.includes("SILK") ? settings.colors : 1);
  const totalPersonalizationCost = (unitCost * quantity) + setupCost;
  const costPerUnit = totalPersonalizationCost / quantity;
  const totalProductCost = productUnitPrice * quantity;
  const grandTotal = totalProductCost + totalPersonalizationCost;
  const grandTotalPerUnit = grandTotal / quantity;

  return {
    id: `${technique.id}-${idSuffix || Date.now()}`,
    techniqueId: technique.id,
    techniqueName: technique.name,
    techniqueCode: technique.code || "",
    colors: settings.colors,
    width: settings.width,
    height: settings.height,
    positions: settings.positions,
    unitCost,
    setupCost,
    totalPersonalizationCost,
    costPerUnit,
    estimatedDays: technique.estimated_days,
    productUnitPrice,
    totalProductCost,
    grandTotal,
    grandTotalPerUnit,
  };
}

export function calculateAllOptions(
  selectedTechniqueIds: string[],
  techniques: Technique[] | undefined,
  techniqueSettings: Record<string, TechniqueSettings>,
  quantity: number,
  productUnitPrice: number,
  idSuffix?: string,
): SimulationOption[] {
  return selectedTechniqueIds.map(techId => {
    const technique = techniques?.find(t => t.id === techId);
    if (!technique) return null;
    const settings = techniqueSettings[techId] || { colors: 1, width: 10, height: 10, positions: 1 };
    return calculateOptionForTechnique(technique, settings, quantity, productUnitPrice, idSuffix);
  }).filter(Boolean) as SimulationOption[];
}
