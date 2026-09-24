/**
 * PostgREST parses `.or("full_name.ilike.%TERM%,email.ilike.%TERM%")` as a
 * mini filter-list DSL: commas separate conditions and parentheses group
 * them. Interpolating raw user input into that string means a search term
 * like `x,role.eq.super_admin` doesn't stay a search term — it can add
 * extra filter conditions PostgREST will happily parse and OR in. `%`/`_`
 * are ILIKE's own wildcard characters, so leaving those in lets a search
 * term change what pattern it actually matches.
 *
 * These pages are already auth-gated and every query is still scoped by
 * RLS + role filters underneath, so this isn't an open privilege-escalation
 * hole — but it's still real breakage (a name with a comma in it can 500
 * the query) and real filter confusion, so every `.or()` search built from
 * user input should go through this first.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%_]/g, ' ').trim();
}
