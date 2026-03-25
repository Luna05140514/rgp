export interface EyeData {
  sphere: number;
  sphereSign: '+' | '-';
  cylinder: number;
  flatRadius: number;
  steepRadius: number;
  trialPower: number;
  trialRadius: number;
  overRefraction: number;
  overRefractionSign: '+' | '-';
  adjustmentSteps: number;
  fittingMethod: 'calculation' | 'trial';
}

export interface CalculationResult {
  flatRadius: number;
  steepRadius: number;
  radiusDiff: number;
  cornealAstigmatism: number;
  finalPower: number;
  finalRadius: number;
}
