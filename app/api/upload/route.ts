import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { extractReceiptData } from '@/lib/ai/orchestrator'
import { insertTransaction } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only image files are accepted (JPEG, PNG, WebP)' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  try {
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const extracted = await extractReceiptData(base64, file.type)

    if (!extracted) {
      return NextResponse.json({
        error: 'Could not read receipt. Please ensure the image is clear and contains a receipt.',
      }, { status: 422 })
    }

    // Save to DB
    const transaction = await insertTransaction({
      user_id: userId,
      date: extracted.date,
      description: extracted.merchant,
      amount: -Math.abs(extracted.amount), // expenses are negative
      category: extracted.category,
      merchant: extracted.merchant,
      source: 'receipt',
    })

    return NextResponse.json({
      transaction,
      extracted,
      message: `Receipt from ${extracted.merchant} recorded: $${extracted.amount.toFixed(2)} in ${extracted.category}`,
    })
  } catch (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 })
  }
}
