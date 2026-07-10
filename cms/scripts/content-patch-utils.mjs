export function sessionKey(item) {
  return `${item.stageId}|${item.date}|${item.startTime}|${item.artist}`;
}

export function matchesRemoval(item, rule) {
  return (
    item.stageId === rule.stageId &&
    item.date === rule.date &&
    item.startTime === rule.startTime &&
    item.artist === rule.artist
  );
}

export function collectImageTransfers(existingItems, rules = []) {
  const transfers = new Map();

  for (const item of existingItems) {
    if (!item.imageUrl) {
      continue;
    }

    for (const { from, to } of rules) {
      if (matchesRemoval(item, from)) {
        transfers.set(sessionKey(to), item.imageUrl);
      }
    }
  }

  return transfers;
}

export function pickSeedItems(seedItems, keys) {
  const byKey = new Map(seedItems.map((item) => [sessionKey(item), item]));
  const picked = [];
  const missing = [];

  for (const key of keys) {
    const item = byKey.get(sessionKey(key));
    if (item) {
      picked.push(item);
    } else {
      missing.push(key);
    }
  }

  return { picked, missing };
}

function mergeItem(existing, next, transferredImageUrl) {
  const imageUrl = existing?.imageUrl || transferredImageUrl;
  if (!imageUrl) {
    return next;
  }

  return {
    ...next,
    imageUrl,
  };
}

export function applyContentPatch(existingItems, seedItems, { removals, replacements, upsertKeys }) {
  const { picked, missing } = pickSeedItems(seedItems, upsertKeys);
  if (missing.length > 0) {
    const details = missing
      .map((item) => `${item.stageId} ${item.date} ${item.startTime} ${item.artist}`)
      .join(', ');
    throw new Error(`Seed is missing items for patch keys: ${details}`);
  }

  const imageTransfers = collectImageTransfers(existingItems, replacements);
  const byId = new Map();
  let removed = 0;

  for (const item of existingItems) {
    if (removals.some((rule) => matchesRemoval(item, rule))) {
      removed += 1;
      continue;
    }
    byId.set(item.id, item);
  }

  let added = 0;
  let updated = 0;
  let imagesPreserved = 0;

  for (const item of picked) {
    const previous = byId.get(item.id);
    const transferredImageUrl = imageTransfers.get(sessionKey(item));
    const merged = mergeItem(previous, item, transferredImageUrl);
    byId.set(item.id, merged);

    if (!previous) {
      added += 1;
    } else if (JSON.stringify(previous) !== JSON.stringify(merged)) {
      updated += 1;
    }

    if (merged.imageUrl && !previous?.imageUrl && transferredImageUrl) {
      imagesPreserved += 1;
    }
  }

  const merged = [...byId.values()].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) {
      return dateCmp;
    }
    const timeCmp = a.startTime.localeCompare(b.startTime);
    if (timeCmp !== 0) {
      return timeCmp;
    }
    return a.artist.localeCompare(b.artist, 'ru');
  });

  return {
    merged,
    removed,
    added,
    updated,
    imagesPreserved,
    preserved: existingItems.length - removed,
  };
}
