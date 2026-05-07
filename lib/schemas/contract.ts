import { z } from 'zod'

export const ContractParameterSchema = z.object({
  value: z.any(),
  source_text: z.string().optional(),
  clause_reference: z.string().optional(),
  page_number: z.number().optional(),
  confidence: z.number().optional()
})

export const ContractSchema = z.object({
  id: z.string().uuid(),
  contract_id: z.string(),
  customer_name: z.string(),
  site_location: z.string().optional(),
  pdf_storage_path: z.string().optional(),
  extraction_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  parameters: z.record(ContractParameterSchema).default({}),
  created_at: z.date().or(z.string()),
  updated_at: z.date().or(z.string())
})

export type Contract = z.infer<typeof ContractSchema>
export type ContractParameter = z.infer<typeof ContractParameterSchema>
