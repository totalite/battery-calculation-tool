import React, { useState, useMemo } from 'react';
import { Battery, Zap, Clock, AlertCircle, Info } from 'lucide-react';

export default function BatteryCalculator() {
  const [ledPower, setLedPower] = useState(50);
  const [integrationCycles, setIntegrationCycles] = useState(3);
  const [measurementInterval, setMeasurementInterval] = useState(900);
  const [deploymentDays, setDeploymentDays] = useState(30);
  const [voltage, setVoltage] = useState(12);
  const [tempCondition, setTempCondition] = useState('normal');
  const [lteCondition, setLteCondition] = useState('good');

  const IDLE_POWER = 0.066;
  const TILT_SENSOR_COLD = 0.071;
  const SLOPE_3_CYCLES = 0.00233;
  const INTERCEPT_3_CYCLES = 0.3367;
  
  const calculatePower = useMemo(() => {
    let basePower = SLOPE_3_CYCLES * ledPower + INTERCEPT_3_CYCLES;
    
    if (integrationCycles === 1) {
      basePower = basePower * 0.54;
    }
    
    if (voltage === 24) {
      basePower = basePower * 1.12;
    }
    
    if (tempCondition === 'cold') {
      basePower += TILT_SENSOR_COLD;
    }
    
    if (lteCondition === 'poor') {
      basePower = basePower * 1.15;
    }
    
    let measurementDuration = 380 + (100 - ledPower) * 0.22;
    if (integrationCycles === 1) {
      measurementDuration = measurementDuration * 0.95;
    }
    
    const idleTime = Math.max(0, measurementInterval - measurementDuration);
    const activePowerContrib = (basePower * measurementDuration) / measurementInterval;
    const idlePowerContrib = (IDLE_POWER * idleTime) / measurementInterval;
    const avgPower = activePowerContrib + idlePowerContrib;
    
    return {
      avgPower,
      measurementDuration,
      idleTime,
      activePowerContrib,
      idlePowerContrib,
      basePower
    };
  }, [ledPower, integrationCycles, measurementInterval, voltage, tempCondition, lteCondition]);

  const batteryCalc = useMemo(() => {
    const { avgPower } = calculatePower;
    const hoursInDeployment = deploymentDays * 24;
    const totalEnergyWh = avgPower * hoursInDeployment;
    const requiredCapacityWh = totalEnergyWh * 1.3;
    const requiredCapacityAh = requiredCapacityWh / voltage;
    const totalMeasurements = (deploymentDays * 24 * 3600) / measurementInterval;
    const energyPerMeasurement = (avgPower * measurementInterval) / 3600;
    
    return {
      totalEnergyWh,
      requiredCapacityWh,
      requiredCapacityAh,
      totalMeasurements,
      energyPerMeasurement
    };
  }, [calculatePower, deploymentDays, voltage, measurementInterval]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins + 'm ' + secs + 's';
  };

  const formatInterval = (seconds) => {
    if (seconds < 3600) return (seconds / 60) + ' minutes';
    if (seconds < 86400) return (seconds / 3600) + ' hours';
    return (seconds / 86400) + ' days';
  };

  const getDistanceGuide = (led) => {
    if (led <= 10) return '≤10m targets';
    if (led <= 25) return '10-35m targets';
    if (led <= 50) return '35-60m targets';
    return '60-100m targets';
  };

  const activePercent = ((calculatePower.activePowerContrib / calculatePower.avgPower) * 100).toFixed(1);
  const idlePercent = ((calculatePower.idlePowerContrib / calculatePower.avgPower) * 100).toFixed(1);
  const recommendedAh = Math.ceil(batteryCalc.requiredCapacityAh / 10) * 10;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Battery className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">TotaLite Battery Calculator</h1>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              Calculate the required battery capacity for your TotaLite deployment based on measurement settings, 
              environmental conditions, and deployment duration. Includes 30% safety margin for battery degradation and reserves.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Measurement Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                LED Power: {ledPower}%
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={ledPower}
                onChange={(e) => setLedPower(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-slate-500 mt-1">
                {getDistanceGuide(ledPower)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Integration Cycles
              </label>
              <select
                value={integrationCycles}
                onChange={(e) => setIntegrationCycles(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="1">1 cycle (lower power, less precision)</option>
                <option value="3">3 cycles (recommended)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Measurement Interval
              </label>
              <select
                value={measurementInterval}
                onChange={(e) => setMeasurementInterval(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="300">5 minutes</option>
                <option value="900">15 minutes</option>
                <option value="1800">30 minutes</option>
                <option value="3600">1 hour</option>
                <option value="7200">2 hours</option>
                <option value="14400">4 hours</option>
                <option value="21600">6 hours</option>
                <option value="43200">12 hours</option>
                <option value="86400">24 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Input Voltage
              </label>
              <select
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="12">12V DC (standard)</option>
                <option value="24">24V DC</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Deployment Conditions
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deployment Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={deploymentDays}
                onChange={(e) => setDeploymentDays(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Temperature Conditions
              </label>
              <select
                value={tempCondition}
                onChange={(e) => setTempCondition(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="normal">Normal (10°C to 40°C)</option>
                <option value="cold">Cold (less than 10°C, tilt sensor heating)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                LTE Coverage
              </label>
              <select
                value={lteCondition}
                onChange={(e) => setLteCondition(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="good">Good (normal conditions)</option>
                <option value="poor">Poor (increased transmission power)</option>
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-700">
                  <strong>Note:</strong> These calculations are based on controlled test data. 
                  Actual consumption may vary with specific site conditions.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Battery Requirements</h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Required Capacity</div>
              <div className="text-3xl font-bold">{batteryCalc.requiredCapacityAh.toFixed(1)} Ah</div>
              <div className="text-xs opacity-75 mt-1">at {voltage}V DC</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Energy Required</div>
              <div className="text-3xl font-bold">{batteryCalc.requiredCapacityWh.toFixed(0)} Wh</div>
              <div className="text-xs opacity-75 mt-1">with 30% safety margin</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
              <div className="text-sm opacity-90 mb-1">Avg Power Draw</div>
              <div className="text-3xl font-bold">{calculatePower.avgPower.toFixed(3)} W</div>
              <div className="text-xs opacity-75 mt-1">continuous average</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Power Breakdown</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Peak during measurement:</span>
                  <span className="font-medium">{calculatePower.basePower.toFixed(3)} W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Idle power:</span>
                  <span className="font-medium">{IDLE_POWER} W</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Measurement duration:</span>
                  <span className="font-medium">{formatTime(calculatePower.measurementDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Idle duration:</span>
                  <span className="font-medium">{formatTime(calculatePower.idleTime)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-slate-600">Active contribution:</span>
                  <span className="font-medium">{activePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Idle contribution:</span>
                  <span className="font-medium">{idlePercent}%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Deployment Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total measurements:</span>
                  <span className="font-medium">{batteryCalc.totalMeasurements.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Energy per measurement:</span>
                  <span className="font-medium">{batteryCalc.energyPerMeasurement.toFixed(4)} Wh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Measurement interval:</span>
                  <span className="font-medium">{formatInterval(measurementInterval)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total energy (no margin):</span>
                  <span className="font-medium">{batteryCalc.totalEnergyWh.toFixed(1)} Wh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Deployment duration:</span>
                  <span className="font-medium">{deploymentDays} days</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-slate-600">Safety margin applied:</span>
                  <span className="font-medium">30%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Recommended Battery Selection</h3>
            <p className="text-sm text-slate-700">
              Select a battery with capacity of at least <strong>{batteryCalc.requiredCapacityAh.toFixed(1)} Ah at {voltage}V</strong> ({batteryCalc.requiredCapacityWh.toFixed(0)} Wh total).
              For optimal performance, consider using a battery rated for <strong>{recommendedAh} Ah</strong> or higher.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}