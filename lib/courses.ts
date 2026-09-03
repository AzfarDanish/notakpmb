import { d1Or, queryD1 } from '@/lib/d1'
import {
  getProgramme as getStaticProgramme,
  getProgrammes as getStaticProgrammes,
  type Programme,
  type Subject,
  type SubjectContext,
} from '@/lib/data'

export type Course = Subject & { programmeId: string }

export async function getAllCourses(): Promise<Course[]> {
  return d1Or(async () => {
    const res = await queryD1('SELECT id, code, title, programme_id FROM courses ORDER BY title ASC')
    return res.results.map((r) => ({
      id: String(r.id ?? ''),
      code: String(r.code ?? ''),
      title: String(r.title ?? ''),
      programmeId: String(r.programme_id ?? 'dcs'),
    }))
  }, [])
}

export async function getCoursesByProgramme(programmeId: string): Promise<Subject[]> {
  const courses = await getAllCourses()
  return courses
    .filter((c) => c.programmeId === programmeId)
    .map((c) => ({ id: c.id, title: c.title, code: c.code }))
}

export async function getCourse(id: string): Promise<SubjectContext | undefined> {
  return d1Or(async () => {
    const res = await queryD1(
      `SELECT c.id, c.code, c.title, c.programme_id, p.code as p_code, p.title as p_title, p.description as p_desc
       FROM courses c LEFT JOIN programmes p ON p.id = c.programme_id WHERE c.id = ? LIMIT 1`,
      [id],
    )
    if (res.results.length === 0) return undefined
    const r = res.results[0]
    const programmeId = String(r.programme_id ?? 'dcs')
    const programme: Programme = {
      id: programmeId,
      code: String(r.p_code ?? getStaticProgramme(programmeId)?.code ?? ''),
      title: String(r.p_title ?? getStaticProgramme(programmeId)?.title ?? ''),
      description: String(r.p_desc ?? getStaticProgramme(programmeId)?.description ?? ''),
      subjects: [],
    }
    return {
      subject: { id: String(r.id ?? ''), title: String(r.title ?? ''), code: String(r.code ?? '') },
      programme,
    }
  }, undefined)
}

export async function searchCourses(query: string, limit = 10, programmeId?: string): Promise<SubjectContext[]> {
  const q = query.trim()
  if (!q) return []
  const like = `%${q.toLowerCase()}%`
  const capped = Math.min(Math.max(limit, 1), 20)
  return d1Or(async () => {
    const filterProgramme = programmeId ? ` AND c.programme_id = ?` : ''
    const params: (string | number | null)[] = programmeId
      ? [like, like, programmeId, q, q, `${q.toLowerCase()}%`, String(capped)]
      : [like, like, q, q, `${q.toLowerCase()}%`, String(capped)]
    const res = await queryD1(
      `SELECT c.id, c.code, c.title, c.programme_id, p.code as p_code, p.title as p_title, p.description as p_desc
       FROM courses c LEFT JOIN programmes p ON p.id = c.programme_id
       WHERE (lower(c.title) LIKE ? OR lower(c.code) LIKE ?)${filterProgramme}
       ORDER BY
          CASE WHEN lower(c.code) = lower(?) THEN 0
               WHEN lower(c.title) = lower(?) THEN 1
               WHEN lower(c.code) LIKE lower(?) THEN 2
               ELSE 3 END,
          c.title ASC
        LIMIT ?`,
      params,
    )
    if (res.results.length === 0) return []
    const results: SubjectContext[] = []
    for (const r of res.results) {
      const pid = String(r.programme_id ?? 'dcs')
      const programme: Programme = {
        id: pid,
        code: String(r.p_code ?? getStaticProgramme(pid)?.code ?? pid),
        title: String(r.p_title ?? getStaticProgramme(pid)?.title ?? ''),
        description: String(r.p_desc ?? getStaticProgramme(pid)?.description ?? ''),
        subjects: [],
      }
      results.push({
        subject: { id: String(r.id ?? ''), title: String(r.title ?? ''), code: String(r.code ?? '') },
        programme,
      })
    }
    return results
  }, [])
}

// For programme pages: START EMPTY — courses are catalog pick-list, not auto-enrolled.
// Programmes start with 0 subjects; they only show subjects added via UI (ledger custom).
export async function getProgrammesWithCourses(): Promise<Programme[]> {
  const fallbackProgrammes = getStaticProgrammes()
  return d1Or(async () => {
    const progRes = await queryD1('SELECT id, code, title, description FROM programmes ORDER BY id')
    const programmes: Programme[] = progRes.results.map((r) => ({
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
