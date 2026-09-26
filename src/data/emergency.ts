/** Experimental emergency balance; prior emergency branch: 70f14f5. */
export const EMERGENCY = {
  suppliesPerRun: 2,
  refillFraction: 0.25,
  pausedDemandFraction: 0.25,
  mitigatedSeverityFraction: 0.30,
  powerReserveMitigationThreshold: 12,
  thermalAllocationMitigationThreshold: 0.5,
  thermalDeliveryMitigationThreshold: 0.5,
  shelterMitigationThreshold: 0.15,
} as const;
