import { seed } from '@/scripts/seed-demo'

export async function POST() {
  try {
    await seed()
    return Response.json({ success: true })
  } catch (err: any) {
    console.error('Seed error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
