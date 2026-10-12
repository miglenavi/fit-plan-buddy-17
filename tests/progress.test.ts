import { describe, expect, it } from "vitest";
import { betterDirection, formatLoad, progressionHint, weightLabel } from "../src/lib/progress";

describe("assisted progress rules", () => {
  const normal = { is_assisted: false, equipment: "barbell" };
  const assistedMachine = { is_assisted: true, equipment: "machine" };
  const assistedBand = { is_assisted: true, equipment: "resistance_band" };

  it("inverts direction for assisted exercises", () => {
    expect(betterDirection(normal)).toBe(1);
    expect(betterDirection(assistedMachine)).toBe(-1);
  });
  it("labels the load clearly", () => {
    expect(weightLabel(assistedMachine)).toBe("Assistance (kg)");
    expect(formatLoad({ weight: 20 }, assistedMachine)).toBe(" @ 20kg assistance");
    expect(formatLoad({ band_level: 2 }, assistedBand)).toBe(" @ Light (red) band");
  });
  it("suggests less assistance / a lighter band, never below zero", () => {
    expect(progressionHint([{ weight: 20 }, { weight: 25 }], assistedMachine)).toContain("less assistance today (17.5kg)");
    expect(progressionHint([{ weight: 1 }], assistedMachine)).toContain("without assistance");
    expect(progressionHint([{ band_level: 3 }], assistedBand)).toContain("Light (red)");
    expect(progressionHint([{ weight: 60 }], normal)).toContain("62.5kg");
  });
});

import { workingSetNumber } from "../src/lib/progress";
import { test as t2, expect as e2 } from "vitest";
t2("dropset does not advance working set number", () => {
  const sets = [{ is_dropset: false }, { is_dropset: false }, { is_dropset: true }, { is_dropset: false }];
  e2(sets.map((_, i) => workingSetNumber(sets, i))).toEqual([1, 2, 2, 3]);
});
