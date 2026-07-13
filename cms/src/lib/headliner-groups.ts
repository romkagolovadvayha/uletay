import type { Headliner } from '@/types';

function normalizeArtistKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseAlternateNamesInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function formatAlternateNamesInput(names?: string[]): string {
  return names?.join('\n') ?? '';
}

export function parseLinkedHeadlinerIds(formData: FormData): string[] {
  return [
    ...new Set(
      formData
        .getAll('linkedHeadlinerIds')
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

export function getHeadlinerGroup(headliners: Headliner[], headlinerId: string): Headliner[] {
  const byId = new Map(headliners.map((item) => [item.id, item]));
  const start = byId.get(headlinerId);
  if (!start) {
    return [];
  }

  const visited = new Set<string>([headlinerId]);
  const queue = [...(start.linkedHeadlinerIds ?? [])];

  while (queue.length > 0) {
    const id = queue.pop();
    if (!id || visited.has(id)) {
      continue;
    }
    visited.add(id);
    const member = byId.get(id);
    if (!member) {
      continue;
    }
    for (const linkedId of member.linkedHeadlinerIds ?? []) {
      if (!visited.has(linkedId)) {
        queue.push(linkedId);
      }
    }
  }

  return [...visited]
    .map((id) => byId.get(id))
    .filter((item): item is Headliner => Boolean(item));
}

export function collectGroupIdentityNames(headliner: Headliner, allHeadliners: Headliner[]): string[] {
  const names = new Set<string>();
  for (const member of getHeadlinerGroup(allHeadliners, headliner.id)) {
    const trimmed = member.name.trim();
    if (trimmed) {
      names.add(trimmed);
    }
    for (const alternateName of member.alternateNames ?? []) {
      const alt = alternateName.trim();
      if (alt) {
        names.add(alt);
      }
    }
  }
  return [...names];
}

export function applyBidirectionalHeadlinerLinks(
  headliners: Headliner[],
  headlinerId: string,
  linkedIds: string[],
): Headliner[] {
  const targetSet = new Set(linkedIds.filter((id) => id !== headlinerId));

  return headliners.map((headliner) => {
    if (headliner.id === headlinerId) {
      return {
        ...headliner,
        linkedHeadlinerIds: targetSet.size ? [...targetSet] : undefined,
      };
    }

    const links = new Set(headliner.linkedHeadlinerIds ?? []);
    if (targetSet.has(headliner.id)) {
      links.add(headlinerId);
    } else {
      links.delete(headlinerId);
    }

    return {
      ...headliner,
      linkedHeadlinerIds: links.size ? [...links] : undefined,
    };
  });
}

export function headlinerIdentityConfigChanged(
  existing: Headliner,
  next: Pick<Headliner, 'name' | 'alternateNames' | 'linkedHeadlinerIds'>,
): boolean {
  if (normalizeArtistKey(existing.name) !== normalizeArtistKey(next.name)) {
    return true;
  }

  const prevAlt = [...(existing.alternateNames ?? [])].map(normalizeArtistKey).sort().join('|');
  const nextAlt = [...(next.alternateNames ?? [])].map(normalizeArtistKey).sort().join('|');
  if (prevAlt !== nextAlt) {
    return true;
  }

  const prevLinks = [...(existing.linkedHeadlinerIds ?? [])].sort().join('|');
  const nextLinks = [...(next.linkedHeadlinerIds ?? [])].sort().join('|');
  return prevLinks !== nextLinks;
}

export function mergeHeadlinerLinkFields(existing: Headliner, item: Headliner): Headliner {
  return {
    ...existing,
    alternateNames: [
      ...new Set([...(existing.alternateNames ?? []), ...(item.alternateNames ?? [])]),
    ].filter(Boolean),
    linkedHeadlinerIds: [
      ...new Set([...(existing.linkedHeadlinerIds ?? []), ...(item.linkedHeadlinerIds ?? [])]),
    ].filter(Boolean),
  };
}
