export type ImpactLedger = {
  treesEquivalent: number;
  fuelAvoidedLitres: number;
  costSavedRM: number;
};

// Negative input is floored to 0; all three outputs will be 0.
export function computeImpactLedger(totalCarbonKg: number): ImpactLedger {
  const kg = Math.max(0, totalCarbonKg);
  const fuelAvoidedLitres = kg / 2.31;
  return {
    treesEquivalent: kg / 21.77,
    fuelAvoidedLitres,
    costSavedRM: fuelAvoidedLitres * 2.05,
  };
}
