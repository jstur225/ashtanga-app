import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

const POLL_KEY = 'pose_library_improvement'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type VoteChoice = 'yes' | 'no'

interface VoteRow {
  voter_id: string
  choice: VoteChoice
}

const summarizeVotes = (rows: VoteRow[] = []) => {
  const yes = rows.filter(row => row.choice === 'yes').length
  const no = rows.filter(row => row.choice === 'no').length
  return { total: yes + no, yes, no }
}

const loadVoteSummary = async (voterId?: string) => {
  const { data, error } = await getSupabaseServiceClient()
    .from('feature_votes')
    .select('voter_id, choice')
    .eq('poll_key', POLL_KEY)

  if (error) throw error
  const rows = (data ?? []) as VoteRow[]
  return {
    counts: summarizeVotes(rows),
    choice: voterId ? rows.find(row => row.voter_id === voterId)?.choice ?? null : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const voterId = request.nextUrl.searchParams.get('voterId')?.trim()
    if (voterId && !UUID_PATTERN.test(voterId)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_VOTER' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      ...await loadVoteSummary(voterId),
    })
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

    const summary = await loadVoteSummary(voterId)
    return NextResponse.json({
      success: true,
      choice,
      counts: summary.counts,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
