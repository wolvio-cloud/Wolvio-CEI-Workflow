export interface WPIPoint {
  year: number
  value: number
}

export interface ExclusionDetail {
  type: string
  hours: number
}

export interface ExplainedItem {
  item: string
  delta: number
  explanation: string
  clause?: string
}

export interface InvoiceLineItems {
  baseFee: number
  variableAmount: number
  gstAmount: number
  total: number
}

export interface GenerationData {
  total_kwh: number
  availability_pct: number
  period_start: string
  period_end: string
}

export async function runValidation(params: any, inv: any, gen: any): Promise<any[]> {
  return [] // Mock implementation for legacy code
}

/**
 * Function 1 — calculateWPIEscalation
 * Pure math for WPI escalation based on contractual rules.
 */
export function calculateWPIEscalation(params: {
  baseMonthlyFee: number
  wpiBaseYear: number
  wpiCurrentYear: number
  wpiData: WPIPoint[]
  capPct: number
  floorPct: number
}) {
  const baseWPIObj = params.wpiData.find(d => d.year === params.wpiBaseYear)
  const currentWPIObj = params.wpiData.find(d => d.year === params.wpiCurrentYear)

  if (!baseWPIObj || !currentWPIObj) {
    throw new Error(`WPI data missing for years ${params.wpiBaseYear} or ${params.wpiCurrentYear}`)
  }

  const baseWPI = baseWPIObj.value
  const currentWPI = currentWPIObj.value
  const rawFactor = currentWPI / baseWPI
  
  // Escalation factor = (currentWPI / baseWPI)
  // Cap and Floor are applied to the factor relative to 1.0 (0% change)
  const rawChangePct = (rawFactor - 1) * 100
  const cappedChangePct = Math.min(Math.max(rawChangePct, params.floorPct), params.capPct)
  const cappedFactor = 1 + (cappedChangePct / 100)

  const escalatedFee = Math.round(params.baseMonthlyFee * cappedFactor)
  const escalationAmount = escalatedFee - params.baseMonthlyFee

  return {
    baseWPI,
    currentWPI,
    rawFactor,
    cappedFactor,
    escalatedFee,
    escalationAmount,
    capApplied: rawChangePct > params.capPct,
    floorApplied: rawChangePct < params.floorPct
  }
}

/**
 * Function 2 — calculateVariableComponent
 * Net energy generated * rate per kWh.
 */
export function calculateVariableComponent(params: {
  netKwh: number
  ratePerKwh: number
}) {
  const variableAmount = Math.round(params.netKwh * params.ratePerKwh)
  return {
    netKwh: params.netKwh,
    ratePerKwh: params.ratePerKwh,
    variableAmount
  }
}

/**
 * Function 3 — calculateInvoiceTotal
 * Aggregates components and calculates GST.
 */
export function calculateInvoiceTotal(params: {
  baseFeeAfterEscalation: number
  variableAmount: number
  gstRate: number
  invoiceDate: Date
  paymentTermsDays: number
}) {
  const subtotal = params.baseFeeAfterEscalation + params.variableAmount
  const gstAmount = Math.round(subtotal * (params.gstRate / 100))
  const total = subtotal + gstAmount
  
  const dueDate = new Date(params.invoiceDate)
  dueDate.setDate(dueDate.getDate() + params.paymentTermsDays)

  return {
    subtotal,
    gstAmount,
    total,
    dueDate
  }
}

/**
 * Function 4 — calculateTrendVariance
 * Compares current invoice to previous and explains every rupee of difference.
 */
export function calculateTrendVariance(params: {
  currentInvoice: InvoiceLineItems
  previousInvoice: InvoiceLineItems
  wpiEscalationApplied: boolean
  wpiEscalationAmount: number
  variableChangeDelta: number
}) {
  const totalDifference = params.currentInvoice.total - params.previousInvoice.total
  const explainedVariance: ExplainedItem[] = []

  if (params.wpiEscalationApplied) {
    explainedVariance.push({
      item: 'WPI Annual Escalation',
      delta: params.wpiEscalationAmount,
      explanation: 'Annual price adjustment based on January WPI index',
      clause: 'Clause 5.2'
    })
  }

  explainedVariance.push({
    item: 'Variable Generation Change',
    delta: params.variableChangeDelta,
    explanation: 'Change in net energy generated vs previous period',
    clause: 'Clause 6.1'
  })

  // Calculate tax delta based on subtotal change
  const subtotalDelta = params.currentInvoice.baseFee + params.currentInvoice.variableAmount - 
                       (params.previousInvoice.baseFee + params.previousInvoice.variableAmount)
  const gstDelta = params.currentInvoice.gstAmount - params.previousInvoice.gstAmount
  
  explainedVariance.push({
    item: 'GST Impact',
    delta: gstDelta,
    explanation: 'Proportional GST change on variance',
    clause: 'Clause 6.2'
  })

  const sumExplained = explainedVariance.reduce((s, v) => s + v.delta, 0)
  const unexplainedVariance = Math.abs(totalDifference - sumExplained)

  return {
    totalDifference,
    explainedVariance,
    unexplainedVariance,
    confidenceStatus: unexplainedVariance < 10 ? 'ready' : 'review_required'
  }
}

/**
 * Function 5 — calculateContractualAvailability
 * Availability math with exclusions and LD exposure.
 */
export function calculateContractualAvailability(params: {
  totalContractHours: number
  rawUnavailableHours: number
  curtailmentHours: number
  plannedMaintenanceHours: number
  overlapHours: number
  guaranteePct: number
  ldRatePerPp: number
  ldCapPct: number
  annualFee: number
}) {
  const exclusionsApplied: ExclusionDetail[] = [
    { type: 'Grid Curtailment (SLDC/POSOCO)', hours: params.curtailmentHours },
    { type: 'Planned Maintenance', hours: params.plannedMaintenanceHours }
  ]

  const totalExclusions = params.curtailmentHours + params.plannedMaintenanceHours
  const adjustedContractHours = params.totalContractHours - totalExclusions
  
  // Net unavailable = raw - fault hours that happened during excluded periods
  const netUnavailableHours = params.rawUnavailableHours - params.overlapHours
  
  const contractualAvailabilityPct = parseFloat(((adjustedContractHours - netUnavailableHours) / adjustedContractHours * 100).toFixed(1))
  const rawAvailabilityPct = parseFloat(((params.totalContractHours - params.rawUnavailableHours) / params.totalContractHours * 100).toFixed(1))

  const shortfallPp = Math.max(0, params.guaranteePct - contractualAvailabilityPct)
  
  // LD = Annual Fee * Rate * ShortfallPP
  const ldExposure = params.annualFee * (params.ldRatePerPp / 100) * shortfallPp
  const ldCap = params.annualFee * (params.ldCapPct / 100)
  const finalLd = Math.round(Math.min(ldExposure, ldCap))

  let status: 'clean' | 'ld_exposure' | 'bonus_eligible' = 'clean'
  if (shortfallPp > 0) status = 'ld_exposure'
  else if (contractualAvailabilityPct > 98.0) status = 'bonus_eligible'

  return {
    rawAvailabilityPct,
    adjustedContractHours,
    netUnavailableHours,
    contractualAvailabilityPct,
    guaranteePct: params.guaranteePct,
    shortfallPp,
    ldExposure: Math.round(ldExposure),
    ldCap: Math.round(ldCap),
    finalLd,
    status,
    exclusionsApplied
  }
}
