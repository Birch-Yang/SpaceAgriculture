/** Experimental pre-turn preparation thresholds. Keep these out of live hazard UI. */
export const HAZARD_AVOIDANCE = {
  minimumIntegrity: 0.85,
  shelterIntegrity: 0.9,
  thermalAllocation: 0.5,
  stableTemperatureMin: 16,
  stableTemperatureMax: 24,
  temperaturePowerReserve: 12,
  radiationOxygenReserve: 25,
  impactBaseIntegrity: 0.9,
  communicationsBackupAllocation: 0.2,
  communicationsPowerReserve: 12,
  powerReserve: 18,
} as const;
