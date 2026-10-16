/** GET revalidation compares entity tags without requiring byte-identical encodings. */
export function matchesIfNoneMatch(header: string | null, etag: string): boolean {
  if (!header) return false;
  const current = etag.replace(/^W\//, '');
  return header.split(',').some((value) => {
    const candidate = value.trim();
    return candidate === '*' || candidate.replace(/^W\//, '') === current;
  });
}
