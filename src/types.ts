export interface EyeData {
  sphere: number;
  sphereSign: '+' | '-';
  cylinder: number;
  flatRadius: number;
  steepRadius: number;
  adjustmentSteps: number;
}

export interface CalculationResult {
  flatRadius: number;
  steepRadius: number;
  radiusDiff: number;
  cornealAstigmatism: number;
  finalPower: number;
  finalRadius: number;
}
