import { dbOr, supabaseAdmin } from '@/lib/supabase'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import {
  getProgramme as getStaticProgramme,
  getProgrammes as getStaticProgrammes,
  type Programme,
  type Subject,
  type SubjectContext,
} from '@/lib/data'

export type Course = Subject & { programmeId: string }

const D1_CACHE_SECONDS = 60

type CourseRow = { id: string; code: string; title: string; programme_id: string }
type ProgrammeRow = { id: string; code: string; title: string; description: string }

async function readAllCourses(): Promise<Course[]> {
  return dbOr(async () => {
    const { data, error } = await supabaseAdmin()
      .from('courses')
      .select('id, code, title, programme_id')
      .order('title', { ascending: true });
    if (error) throw error;
    return (data as CourseRow[]).map((r) => ({
      id: String(r.id ?? ''),
      code: String(r.code ?? ''),
      title: String(r.title ?? ''),
      programmeId: String(r.programme_id ?? 'dcs'),
    }))
  }, [])
}

export const getAllCourses = cache(
  unstable_cache(readAllCourses, ['all-courses'], {
    revalidate: D1_CACHE_SECONDS,
    tags: ['courses'],
  }),
)

export const getCoursesByProgramme = cache(async (programmeId: string): Promise<Subject[]> => {
  const courses = await getAllCourses()
  return courses
    .filter((c) => c.programmeId === programmeId)
    .map((c) => ({ id: c.id, title: c.title, code: c.code }))
})

async function readCourse(id: string): Promise<SubjectContext | undefined> {
  return dbOr(async () => {
    const { data, error } = await supabaseAdmin()
      .from('courses')
      .select('id, code, title, programme_id, programmes!courses_programme_id_fkey(id, code, title, description)')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined
    const r = data as unknown as CourseRow & { programmes: ProgrammeRow | ProgrammeRow[] | null };
    const prog = Array.isArray(r.programmes) ? r.programmes[0] : r.programmes;
    const programmeId = String(r.programme_id ?? 'dcs')
    const programme: Programme = {
      id: programmeId,
      code: String(prog?.code ?? getStaticProgramme(programmeId)?.code ?? ''),
      title: String(prog?.title ?? getStaticProgramme(programmeId)?.title ?? ''),
      description: String(prog?.description ?? getStaticProgramme(programmeId)?.description ?? ''),
      subjects: [],
    }
    return {
      subject: { id: String(r.id ?? ''), title: String(r.title ?? ''), code: String(r.code ?? '') },
      programme,
    }
  }, undefined)
}

export const getCourse = cache(
  unstable_cache(readCourse, ['course-by-id'], {
    revalidate: D1_CACHE_SECONDS,
    tags: ['courses'],
  }),
)

export const searchCourses = cache(async (query: string, limit = 10, programmeId?: string): Promise<SubjectContext[]> => {
  const q = query.trim()
  if (!q) return []
  const capped = Math.min(Math.max(limit, 1), 20)
  return dbOr(async () => {
    let builder = supabaseAdmin()
      .from('courses')
      .select('id, code, title, programme_id, programmes!courses_programme_id_fkey(id, code, title, description)')
      .or(`title.ilike.%${q}%,code.ilike.%${q}%`)
      .limit(capped);
    if (programmeId) builder = builder.eq('programme_id', programmeId);
    const { data, error } = await builder;
    if (error) throw error;
    if (!data || data.length === 0) return []
    const ql = q.toLowerCase();
    const rows = (data as unknown as (CourseRow & { programmes: ProgrammeRow | ProgrammeRow[] | null })[]);
    const rank = (r: CourseRow) => {
      if (String(r.code ?? '').toLowerCase() === ql) return 0;
      if (String(r.title ?? '').toLowerCase() === ql) return 1;
      if (String(r.code ?? '').toLowerCase().startsWith(ql)) return 2;
      return 3;
    };
    rows.sort((a, b) => rank(a) - rank(b) || String(a.title ?? '').localeCompare(String(b.title ?? '')));
    const results: SubjectContext[] = []
    for (const r of rows) {
      const pid = String(r.programme_id ?? 'dcs')
      const prog = Array.isArray(r.programmes) ? r.programmes[0] : r.programmes;
      const programme: Programme = {
        id: pid,
        code: String(prog?.code ?? getStaticProgramme(pid)?.code ?? pid),
        title: String(prog?.title ?? getStaticProgramme(pid)?.title ?? ''),
        description: String(prog?.description ?? getStaticProgramme(pid)?.description ?? ''),
        subjects: [],
      }
      results.push({
        subject: { id: String(r.id ?? ''), title: String(r.title ?? ''), code: String(r.code ?? '') },
        programme,
      })
    }
    return results
  }, [])
})
// For programme pages: START EMPTY — courses are catalog pick-list, not auto-enrolled.
// Programmes start with 0 subjects; they only show subjects added via UI (ledger custom).
async function readProgrammesWithCourses(): Promise<Programme[]> {
  const fallbackProgrammes = getStaticProgrammes()
  return dbOr(async () => {
    const { data, error } = await supabaseAdmin()
      .from('programmes')
      .select('id, code, title, description')
      .order('id', { ascending: true });
    if (error) throw error;
    const programmes: Programme[] = ((data ?? []) as ProgrammeRow[]).map((r) => ({
      id: String(r.id ?? ''),
      code: String(r.code ?? ''),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      subjects: [],
    }))
    const progIds = new Set(programmes.map((p) => p.id))
    for (const p of fallbackProgrammes) if (!progIds.has(p.id)) programmes.push({ ...p, subjects: [] })
    return programmes.map((p) => ({ ...p, subjects: [] }))
  }, fallbackProgrammes.map((p) => ({ ...p, subjects: [] })))
}

export const getProgrammesWithCourses = cache(
  unstable_cache(readProgrammesWithCourses, ['programmes-with-courses'], {
    revalidate: D1_CACHE_SECONDS,
    tags: ['programmes', 'courses'],
  }),
)
