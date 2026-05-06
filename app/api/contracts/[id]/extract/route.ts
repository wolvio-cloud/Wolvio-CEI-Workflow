import { join } from 'path'
import { readFile } from 'fs/promises'
import sql from '@/lib/db'
import { parsePDF } from '@/lib/pdf/parse'
import { anthropic } from '@/lib/extraction/claude'
import { CONTRACT_EXTRACTION_SYSTEM_PROMPT } from '@/lib/extraction/contract-prompt'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/contracts/extract')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 1. Get contract from DB
    const contract = (await sql`SELECT * FROM contracts WHERE id = ${id}`)[0]
    if (!contract) return Response.json({ error: 'Contract not found' }, { status: 404 })

    // 2. Parse PDF for text (if not already stored)
    let text = contract.raw_text
    if (!text && contract.pdf_path) {
      const buffer = await readFile(contract.pdf_path)
      const parsed = await parsePDF(buffer)
      text = parsed.text
    }

    if (!text) return Response.json({ error: 'No text found in contract' }, { status: 422 })

    // 3. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: CONTRACT_EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Extract parameters from this contract text:\n\n${text.substring(0, 50000)}` }]
    })

    const content = (response.content[0] as any).text
    const extractedData = JSON.parse(content)

    // 4. Update DB
    await sql.begin(async (tx: any) => {
      // Update main contract record
      await tx`
        UPDATE contracts SET 
          customer_name = ${extractedData.customer_name},
          site_name = ${extractedData.site_name},
          extraction_status = 'completed',
          extraction_quality_score = 95,
          parameters = ${JSON.stringify(extractedData)}
        WHERE id = ${id}
      `

      // Delete old parameters
      await tx`DELETE FROM contract_parameters WHERE contract_id = ${id}`

      // Insert into contract_parameters table for flat access
      for (const [key, val] of Object.entries(extractedData)) {
        if (typeof val === 'object' && val !== null && 'value' in (val as any)) {
          const p = val as any
          await tx`
            INSERT INTO contract_parameters (
              contract_id, field_name, value, clause_reference, page_number, source_text, confidence
            ) VALUES (
              ${id}, ${key}, ${JSON.stringify(p.value)}, ${p.clause_reference}, ${p.page_number}, ${p.source_text}, ${p.confidence}
            )
          `
        }
      }
    })

    return Response.json({ 
      contract_id: id, 
      parameter_count: Object.keys(extractedData).length,
      quality_score: 95 
    })

  } catch (err: any) {
    logger.error('Extraction failed', err)
    return Response.json({ error: 'Extraction failed: ' + err.message }, { status: 500 })
  }
}
