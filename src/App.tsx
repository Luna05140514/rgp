/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Calculator, Info, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import { EyeData, CalculationResult } from './types';

const K_CONSTANT = 337.5;
const VERTEX_DISTANCE = 0.012; // 12mm in meters

const convertToCornealPlane = (power: number): number => {
  if (power === 0) return 0;
  return power / (1 - VERTEX_DISTANCE * power);
};

const convertToSpectaclePlane = (power: number): number => {
  if (power === 0) return 0;
  return power / (1 + VERTEX_DISTANCE * power);
};

export default function App() {
  // RGP State
  const [rgpData, setRgpData] = useState<EyeData>({
    sphere: 0,
    sphereSign: '-',
    cylinder: 0,
    flatRadius: 0,
    steepRadius: 0,
    trialPower: 0,
    trialRadius: 0,
    overRefraction: 0,
    overRefractionSign: '-',
    calculationAdjustment: 0,
    trialAdjustment: 0,
    fittingMethod: 'calculation',
  });

  const calculateEye = (data: EyeData): CalculationResult | null => {
    if (data.flatRadius === 0 || data.steepRadius === 0) return null;

    const flatRadius = data.flatRadius;
    const steepRadius = data.steepRadius;
    const radiusDiff = Math.abs(flatRadius - steepRadius);
    
    // Corneal Astigmatism = (337.5 / flatRadius) - (337.5 / steepRadius)
    const cornealAstigmatism = (K_CONSTANT / flatRadius) - (K_CONSTANT / steepRadius);
    
    // Vertex Distance Conversion (12mm)
    const specSphere = data.sphereSign === '+' ? Math.abs(data.sphere) : -Math.abs(data.sphere);
    const specCylinder = -Math.abs(data.cylinder);
    
    // Convert principal meridians to corneal plane
    const clPowerFlat = convertToCornealPlane(specSphere);
    const clPowerSteep = convertToCornealPlane(specSphere + specCylinder);
    
    const clSphere = clPowerFlat;
    const clCylinder = clPowerSteep - clPowerFlat;
    
    // 使用者要求：公式調整：近視 - abs((閃光 - 角膜散光) / 2)
    // 這表示不論散光差異正負，一律扣除其絕對值的二分之一（增加負號度數）
    const residualCyl = clCylinder - cornealAstigmatism;
    const finalPower = clSphere - Math.abs(residualCyl / 2);
    const finalRadius = flatRadius;

    return {
      flatRadius,
      steepRadius,
      radiusDiff,
      cornealAstigmatism,
      finalPower,
      finalRadius,
    };
  };

  const CORRECTION_FACTOR = 0.058;
  const RADIUS_STEP = 0.05;

  const rgpResult = useMemo(() => calculateEye(rgpData), [rgpData]);

  const handleInputChange = (
    field: keyof EyeData,
    value: string | '+' | '-' | number
  ) => {
    if (field === 'sphereSign' || field === 'overRefractionSign' || field === 'fittingMethod') {
      setRgpData({ ...rgpData, [field]: value as any });
    } else if (field === 'calculationAdjustment' || field === 'trialAdjustment') {
      setRgpData({ ...rgpData, [field]: value as number });
    } else {
      const valStr = value as string;
      // Fixed-point logic: strip all non-digits and treat as value / 100
      const cleanStr = valStr.replace(/\D/g, '');
      
      const isDegreeField = field === 'sphere' || field === 'cylinder' || field === 'trialPower' || field === 'overRefraction';
      const isRadiusField = field === 'flatRadius' || field === 'steepRadius' || field === 'trialRadius';
      
      let numValue = parseFloat(valStr) || 0;

      if (isDegreeField && cleanStr.length > 0) {
        numValue = parseInt(cleanStr, 10) / 100;
      } else if (isRadiusField && cleanStr.length > 0) {
        // Radius fields: 2 decimal places (e.g., 760 -> 7.60)
        numValue = parseInt(cleanStr, 10) / 100;
      }

      // Store as absolute value, sign is handled separately or fixed
      numValue = Math.abs(numValue);
      setRgpData({ ...rgpData, [field]: numValue });
    }
  };

  const resetAll = () => {
    setRgpData({
      sphere: 0,
      sphereSign: '-',
      cylinder: 0,
      flatRadius: 0,
      steepRadius: 0,
      trialPower: 0,
      trialRadius: 0,
      overRefraction: 0,
      overRefractionSign: '-',
      calculationAdjustment: 0,
      trialAdjustment: 0,
      fittingMethod: 'calculation',
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Producer Badge */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">製作人 ＴＯＮＹ</span>
        </div>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight flex items-center gap-3">
              <Calculator className="w-8 h-8 text-blue-600" />
              RGP處方計算
            </h1>
          </div>
        </header>

        {/* Eye Data Grid */}
        <div className="max-w-2xl mx-auto">
          <EyeSection 
            title="處方輸入" 
            data={rgpData} 
            result={rgpResult}
            onChange={handleInputChange}
            onReset={resetAll}
          />
        </div>

        {/* Summary Footer */}
        <footer className="text-center text-xs text-gray-400 pt-8 border-t border-gray-200">
          <p>© 2026 RGP處方計算 • 專業眼科工具</p>
        </footer>
      </div>
    </div>
  );
}

interface EyeSectionProps {
  title: string;
  data: EyeData;
  result: CalculationResult | null;
  onChange: (field: keyof EyeData, value: any) => void;
  onReset: () => void;
}

function EyeSection({ title, data, result, onChange, onReset }: EyeSectionProps) {
  const CORRECTION_FACTOR = 0.058;
  const RADIUS_STEP = 0.05;

  const clSphere = useMemo(() => {
    const s = data.sphereSign === '+' ? Math.abs(data.sphere) : -Math.abs(data.sphere);
    const converted = convertToCornealPlane(s);
    return `${converted > 0 ? '+' : ''}${converted.toFixed(2)}`;
  }, [data.sphere, data.sphereSign]);

  const clCylinder = useMemo(() => {
    const s = data.sphereSign === '+' ? Math.abs(data.sphere) : -Math.abs(data.sphere);
    const c = -Math.abs(data.cylinder);
    const pFlat = convertToCornealPlane(s);
    const pSteep = convertToCornealPlane(s + c);
    const converted = pSteep - pFlat;
    return `${converted > 0 ? '+' : ''}${converted.toFixed(2)}`;
  }, [data.sphere, data.sphereSign, data.cylinder]);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
    >
      <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
        <h2 className="text-xl font-medium flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-500" />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重設資料
          </button>
          {result && (
            <span className="text-xs font-bold px-2 py-1.5 bg-green-100 text-green-700 rounded-lg uppercase">
              計算完成
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8 flex-grow">
        {/* 眼鏡 Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <div className="w-1 h-3 bg-blue-500 rounded-full" />
            眼鏡
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputGroup 
              label="Ｓ" 
              value={data.sphere} 
              onChange={(v) => onChange('sphere', v)} 
              sign={data.sphereSign}
              onSignChange={(s) => onChange('sphereSign', s)}
              allowSignToggle
              secondaryValue={`CL: ${clSphere}`}
              inline
            />
            <InputGroup 
              label="Ｃ" 
              value={data.cylinder} 
              onChange={(v) => onChange('cylinder', v)} 
              sign="-"
              secondaryValue={`CL: ${clCylinder}`}
              inline
            />
          </div>
        </div>

        {/* 角膜弧度 Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <div className="w-1 h-3 bg-blue-500 rounded-full" />
            角膜弧度
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputGroup 
              label="平Ｋ" 
              value={data.flatRadius} 
              onChange={(v) => onChange('flatRadius', v)} 
              placeholder="如 7.60" 
              precision={2}
              secondaryValue={data.flatRadius > 0 ? `${(K_CONSTANT / data.flatRadius).toFixed(2)} D` : undefined}
              inline
            />
            <InputGroup 
              label="陡Ｋ" 
              value={data.steepRadius} 
              onChange={(v) => onChange('steepRadius', v)} 
              placeholder="如 7.40" 
              precision={2}
              secondaryValue={data.steepRadius > 0 ? `${(K_CONSTANT / data.steepRadius).toFixed(2)} D` : undefined}
              inline
            />
          </div>
        </div>

        {/* 試片 Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <div className="w-1 h-3 bg-blue-500 rounded-full" />
            試片
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputGroup 
              label="度數" 
              value={data.trialPower} 
              onChange={(v) => onChange('trialPower', v)} 
              placeholder="如 3.00" 
              sign="-"
              inline
            />
            <InputGroup 
              label="弧度" 
              value={data.trialRadius} 
              onChange={(v) => onChange('trialRadius', v)} 
              placeholder="如 7.60" 
              precision={2}
              inline
            />
            <InputGroup 
              label="插片" 
              value={data.overRefraction} 
              onChange={(v) => onChange('overRefraction', v)} 
              placeholder="如 0.25" 
              sign={data.overRefractionSign}
              onSignChange={(s) => onChange('overRefractionSign', s)}
              allowSignToggle
              inline
            />
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">插片建議值</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-medium text-blue-600">
                  {(() => {
                    if (!result || data.trialPower === 0 || data.trialRadius === 0) return '--';
                    const idealRadius = result.finalRadius;
                    const roundedIdealRadius = Math.round(idealRadius / RADIUS_STEP) * RADIUS_STEP;
                    
                    // Ideal Power at the rounded ideal radius
                    const idealPower = result.finalPower + ((roundedIdealRadius - result.finalRadius) * 100 * CORRECTION_FACTOR);
                    
                    // Target Power at the trial radius (FAP: Flatter Add Plus)
                    // If trialRadius is flatter (larger) than roundedIdealRadius, we need more plus power.
                    const targetPowerAtTrialRadius = idealPower + ((data.trialRadius - roundedIdealRadius) * 100 * CORRECTION_FACTOR);
                    
                    // OR = Target Power - Trial Power
                    const trialPower = -Math.abs(data.trialPower);
                    const orPowerCorneal = targetPowerAtTrialRadius - trialPower;
                    
                    const orPowerSpectacle = convertToSpectaclePlane(orPowerCorneal);
                    return `${orPowerSpectacle > 0 ? '+' : ''}${orPowerSpectacle.toFixed(2)}`;
                  })()}
                </span>
                <span className="text-xs font-bold text-blue-400 uppercase">D</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          {/* Fitting Method Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
            <button
              onClick={() => onChange('fittingMethod', 'calculation')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                data.fittingMethod === 'calculation'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              計算驗配法
            </button>
            <button
              onClick={() => onChange('fittingMethod', 'trial')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                data.fittingMethod === 'trial'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              試片驗配法
            </button>
          </div>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={data.fittingMethod}
                initial={{ opacity: 0, x: data.fittingMethod === 'calculation' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: data.fittingMethod === 'calculation' ? 10 : -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Box 1: Ideal Value */}
                    <div className="flex-1 bg-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Calculator className="w-16 h-16" />
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">
                          {data.fittingMethod === 'calculation' ? '計算理想值' : '試片理想值'}
                        </p>
                        <div className="flex items-center gap-3">
                          {(() => {
                            let idealPower: number;
                            let idealRadius: number;

                            if (data.fittingMethod === 'calculation') {
                              const baseIdealRadius = result.finalRadius;
                              idealRadius = Math.round(baseIdealRadius / RADIUS_STEP) * RADIUS_STEP;
                              const radiusDiff = idealRadius - baseIdealRadius;
                              idealPower = result.finalPower + (radiusDiff * 100 * CORRECTION_FACTOR);
                            } else {
                              // 試片理想值＝插片度數轉換成隱眼度數+試片度數 / 試片弧度
                              const orSign = data.overRefractionSign === '+' ? 1 : -1;
                              const orPowerSpectacle = Math.abs(data.overRefraction) * orSign;
                              const orPowerCorneal = convertToCornealPlane(orPowerSpectacle);
                              
                              const trialPower = -Math.abs(data.trialPower);
                              idealPower = trialPower + orPowerCorneal;
                              idealRadius = data.trialRadius;
                            }
                            
                            return (
                              <>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-light tracking-tighter">
                                    {idealPower > 0 ? '+' : ''}{idealPower.toFixed(2)}
                                  </span>
                                  <span className="text-sm opacity-60 font-medium">D</span>
                                </div>
                                
                                <span className="text-3xl font-thin opacity-30">/</span>
                                
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-light tracking-tighter">
                                    {idealRadius.toFixed(2)}
                                  </span>
                                  <span className="text-sm opacity-60 font-medium">mm</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjustment Buttons */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    <button
                      onClick={() => {
                        const field = data.fittingMethod === 'calculation' ? 'calculationAdjustment' : 'trialAdjustment';
                        onChange(field, data[field] - 1);
                      }}
                      className="flex-1 bg-white border border-gray-200 hover:border-blue-400 text-blue-600 px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      緊一格
                    </button>
                    
                    <button
                      onClick={() => {
                        const field = data.fittingMethod === 'calculation' ? 'calculationAdjustment' : 'trialAdjustment';
                        onChange(field, 0);
                      }}
                      className="bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-500 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      重置
                    </button>

                    <button
                      onClick={() => {
                        const field = data.fittingMethod === 'calculation' ? 'calculationAdjustment' : 'trialAdjustment';
                        onChange(field, data[field] + 1);
                      }}
                      className="flex-1 bg-white border border-gray-200 hover:border-blue-400 text-blue-600 px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      鬆一格
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Box 2: Adjusted Value */}
                    <div className="bg-blue-500 p-5 rounded-2xl text-white shadow-lg shadow-blue-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <RefreshCw className="w-16 h-16" />
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">
                          {data.fittingMethod === 'calculation' ? '計算建議值' : '試片建議值'} {(() => {
                            const steps = data.fittingMethod === 'calculation' ? data.calculationAdjustment : data.trialAdjustment;
                            if (steps === 0) return null;
                            return (
                              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[9px]">
                                {steps > 0 ? '+' : ''}{steps} 格
                              </span>
                            );
                          })()}
                        </p>
                        <div className="flex items-center gap-3">
                          {(() => {
                            let adjPower: number;
                            let adjRadius: number;

                            if (data.fittingMethod === 'calculation') {
                              const baseIdealRadius = result.finalRadius;
                              const roundedIdealRadius = Math.round(baseIdealRadius / RADIUS_STEP) * RADIUS_STEP;
                              const radiusDiff = roundedIdealRadius - baseIdealRadius;
                              const idealPower = result.finalPower + (radiusDiff * 100 * CORRECTION_FACTOR);
                              
                              adjRadius = roundedIdealRadius + (data.calculationAdjustment * RADIUS_STEP);
                              adjPower = idealPower + ((adjRadius - roundedIdealRadius) * 100 * CORRECTION_FACTOR);
                            } else {
                              // 試片計算值 (Adjusted Trial Value)
                              const orSign = data.overRefractionSign === '+' ? 1 : -1;
                              const orPowerSpectacle = Math.abs(data.overRefraction) * orSign;
                              const orPowerCorneal = convertToCornealPlane(orPowerSpectacle);
                              
                              const trialPower = -Math.abs(data.trialPower);
                              const idealPower = trialPower + orPowerCorneal;
                              const idealRadius = data.trialRadius;

                              adjRadius = idealRadius + (data.trialAdjustment * RADIUS_STEP);
                              adjPower = idealPower + ((adjRadius - idealRadius) * 100 * CORRECTION_FACTOR);
                            }
                            
                            return (
                              <>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-light tracking-tighter">
                                    {adjPower > 0 ? '+' : ''}{adjPower.toFixed(2)}
                                  </span>
                                  <span className="text-sm opacity-60 font-medium">D</span>
                                </div>
                                
                                <span className="text-3xl font-thin opacity-30">/</span>
                                
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-light tracking-tighter">
                                    {adjRadius.toFixed(2)}
                                  </span>
                                  <span className="text-sm opacity-60 font-medium">mm</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 text-gray-300 gap-3"
              >
                <AlertCircle className="w-10 h-10" />
                <p className="text-sm font-medium">請輸入 K 值以開始計算</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

function InputGroup({ 
  label, 
  value, 
  onChange, 
  placeholder = "0.00",
  sign,
  onSignChange,
  allowSignToggle = false,
  secondaryValue,
  precision = 2,
  inline = false
}: { 
  label: string, 
  value: number, 
  onChange: (v: string) => void, 
  placeholder?: string,
  sign?: '+' | '-',
  onSignChange?: (s: '+' | '-') => void,
  allowSignToggle?: boolean,
  secondaryValue?: string,
  precision?: number,
  inline?: boolean
}) {
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : value.toString());

  useEffect(() => {
    if (value === 0) {
      setLocalValue('');
    } else {
      const currentNum = parseFloat(localValue);
      // If the numeric value changed significantly (not just typing decimals), update local state
      if (isNaN(currentNum) || currentNum !== value) {
        setLocalValue(value.toFixed(precision));
      }
    }
  }, [value, precision]);

  const handleLocalChange = (v: string) => {
    setLocalValue(v);
    onChange(v);
  };

  const handleBlur = () => {
    if (value !== 0) {
      setLocalValue(value.toFixed(precision));
    }
  };

  return (
    <div className={inline ? "flex items-center gap-2" : "space-y-1.5"}>
      <label className={inline ? "text-[11px] font-bold text-gray-400 shrink-0 min-w-[1.25rem] flex flex-col items-center justify-center leading-none tracking-tighter" : "text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 block"}>
        {inline ? label.split('').map((char, i) => <span key={i}>{char}</span>) : label}
      </label>
      <div className="flex-1 flex flex-col">
        <div className="relative flex items-center">
          {sign && (
            <div className="absolute left-0 flex items-center h-full">
              {allowSignToggle ? (
                <button
                  onClick={() => onSignChange?.(sign === '+' ? '-' : '+')}
                  className="h-full px-2.5 text-lg font-bold text-blue-600 hover:bg-gray-100 rounded-l-xl transition-colors border-r border-gray-100"
                >
                  {sign}
                </button>
              ) : (
                <span className="px-3 text-lg font-medium text-gray-400 border-r border-gray-100">
                  {sign}
                </span>
              )}
            </div>
          )}
          <input
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={(e) => handleLocalChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`w-full py-3 pr-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl outline-none transition-all text-base font-medium ${
              sign ? 'pl-11' : 'pl-4'
            }`}
          />
        </div>
        {secondaryValue && (
          <div className="flex justify-end px-1 mt-0.5">
            <span className="text-[10px] font-mono text-blue-500 font-bold">{secondaryValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, unit, description }: { label: string, value: string, unit: string, description?: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center">
      <div className="flex justify-between items-start mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        {description && <span className="text-[9px] text-gray-300 font-mono">{description}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium text-gray-800">{value}</span>
        <span className="text-xs font-bold text-gray-400 uppercase">{unit}</span>
      </div>
    </div>
  );
}
