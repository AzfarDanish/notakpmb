import { NextRequest, NextResponse } from 'next/server'
import { searchCourses } from '@/lib/courses'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const query = q.trim()
  if (!query) {
    return NextResponse.json({ courses: [] })
  }
  if (query.length > 100) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 })
  }
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 20) : 10
  const programmeId = request.nextUrl.searchParams.get('programmeId') ?? request.nextUrl.searchParams.get('programme_id') ?? undefined

  try {
    const courses = await searchCourses(query, limit, programmeId)
    const payload = courses.map(({ subject, programme }) => ({
      id: subject.id,
      code: subject.code,
      title: subject.title,
      programme: {
        id: programme.id,
        code: programme.code,
        title: programme.title,
      },
      href: `/subject/${subject.id}`,
    }))
    return NextResponse.json({ courses: payload }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (e) {
    console.error('Course search error:', e)
    return NextResponse.json({ error: 'Failed to search courses' }, { status: 500 })
  }
}
