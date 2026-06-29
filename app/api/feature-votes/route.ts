import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

const POLL_KEY = 'pose_library_improvement'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type VoteChoice = 'yes' | 'no'

interface VoteRow {
  choice: VoteChoice
}

const summarizeVotes = (rows: VoteRow[] = []) => {
  const yes = rows.filter(row => row.choice === 'yes').length
  const no = rows.filter(row => row.choice === 'no').length
  return { total: yes + no, yes, no }
}

const loadVoteCounts = async () => {
  const { data, error } = await getSupabaseServiceClient()
    .from('feature_votes')
    .select('choice')
    .eq('poll_key', POLL_KEY)

  if (error) throw error
  return summarizeVotes((data ?? []) as VoteRow[])
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, counts: await loadVoteCounts() })
  } catch {
    return NextResponse.json(
      { success: false, error: 'QUERY_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const voterId = typeof body.voterId === 'string' ? body.voterId.trim() : ''
    const choice = body.choice as VoteChoice

    if (!UUID_PATTERN.test(voterId) || (choice !== 'yes' && choice !== 'no')) {
      return NextResponse.json(
        { success: false, error: 'INVALID_VOTE' },
        { status: 400 }
      )
    }

    const { error } = await getSupabaseServiceClient()
      .from('feature_votes')
      .upsert(
        {
          poll_key: POLL_KEY,
          voter_id: voterId,
          choice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'poll_key,voter_id' }
      )

    if (error) {
      return NextResponse.json(
        { success: false, error: 'SAVE_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      choice,
      counts: await loadVoteCounts(),
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

