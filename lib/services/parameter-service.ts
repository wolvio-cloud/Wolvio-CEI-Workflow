import sql from '@/lib/db'

export class ParameterService {
  static async getParameters(contractId: string) {
    const rows = await sql`
      SELECT field_name, value 
      FROM contract_parameters 
      WHERE contract_id = ${contractId}
    `
    
    // Transform into a key-value object
    const params: any = {}
    rows.forEach(row => {
      params[row.field_name] = { value: row.value }
    })
    
    return params
  }
}
