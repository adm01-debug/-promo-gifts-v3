import { describe, it, expect } from "vitest";
import {
  groupPrintAreasByComponent,
  getUniqueTechniques,
  filterGroupsByTechnique,
  countTotalAreas,
} from "@/lib/print-area-grouping";
import type { PrintAreaWithTechniques } from "@/types/gravacao";

const mockAreas: PrintAreaWithTechniques[] = [
  {
    area_id: "a1",
    area_code: "FRENTE",
    area_name: "Frente",
    component_name: "Corpo",
    location_name: "Frente",
    max_width: 10,
    max_height: 5,
    unit: "cm",
    shape: "retangular",
    is_curved: false,
    is_primary: true,
    display_order: 1,
    techniques: [
      { id: "t1", code: "SER", name: "Serigrafia", max_colors: 4 },
      { id: "t2", code: "BOR", name: "Bordado", max_colors: 8 },
    ],
  },
  {
    area_id: "a2",
    area_code: "COSTAS",
    area_name: "Costas",
    component_name: "Corpo",
    location_name: "Costas",
    max_width: 20,
    max_height: 15,
    unit: "cm",
    shape: "retangular",
    is_curved: false,
    is_primary: false,
    display_order: 2,
    techniques: [
      { id: "t1", code: "SER", name: "Serigrafia", max_colors: 4 },
    ],
  },
  {
    area_id: "a3",
    area_code: "MANGA",
    area_name: "Manga",
    component_name: "Manga",
    location_name: "Manga Esquerda",
    max_width: 5,
    max_height: 5,
    unit: "cm",
    shape: "circular",
    is_curved: true,
    is_primary: false,
    display_order: 3,
    techniques: [
      { id: "t2", code: "BOR", name: "Bordado", max_colors: 8 },
    ],
  },
  {
    area_id: "a4",
    area_code: "GERAL",
    area_name: "Geral",
    component_name: null,
    location_name: null,
    max_width: 8,
    max_height: 4,
    unit: "cm",
    shape: "retangular",
    is_curved: false,
    is_primary: false,
    display_order: 4,
    techniques: [
      { id: "t3", code: "LAZ", name: "Laser", max_colors: 1 },
    ],
  },
];

describe("groupPrintAreasByComponent", () => {
  it("groups areas by component and location", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(groups).toHaveLength(3); // Produto, Corpo, Manga

    const corpo = groups.find((g) => g.componentName === "Corpo");
    expect(corpo).toBeDefined();
    expect(corpo!.locations).toHaveLength(2); // Frente, Costas
  });

  it("puts null component under 'Produto'", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(groups[0].componentName).toBe("Produto"); // first due to sort
  });

  it("sorts primary areas first within locations", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const corpo = groups.find((g) => g.componentName === "Corpo")!;
    const firstLoc = corpo.locations[0];
    expect(firstLoc.techniques.some((t) => t.isPrimary)).toBe(true);
  });

  it("calculates areaCm2 correctly", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const corpo = groups.find((g) => g.componentName === "Corpo")!;
    const frente = corpo.locations.find((l) => l.locationName === "Frente")!;
    expect(frente.techniques[0].areaCm2).toBe(50); // 10 * 5
  });

  it("handles empty array", () => {
    expect(groupPrintAreasByComponent([])).toEqual([]);
  });
});

describe("getUniqueTechniques", () => {
  it("returns unique technique codes sorted", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const techs = getUniqueTechniques(groups);
    expect(techs).toEqual(["BOR", "LAZ", "SER"]);
  });
});

describe("filterGroupsByTechnique", () => {
  it("filters to only groups containing the technique", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const filtered = filterGroupsByTechnique(groups, "BOR");
    expect(filtered).toHaveLength(2); // Corpo (Frente has BOR) and Manga
  });

  it("returns empty for unknown technique", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(filterGroupsByTechnique(groups, "UNKNOWN")).toEqual([]);
  });
});

describe("countTotalAreas", () => {
  it("counts all technique entries across all groups", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(countTotalAreas(groups)).toBe(5); // 2 (Frente) + 1 (Costas) + 1 (Manga) + 1 (Geral)
  });
});
