import mysql from 'mysql2/promise';
import {
  buildHistoricalHeadliners,
  findBestExistingHeadliner,
  getCanonicalArtistKey,
  getHistoricalManagedYears,
  reconcileHistoricalHeadliners,
} from './headliners-patch-utils.mjs';
import { getDbConfig } from './load-db-env.mjs';

const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

function getYearArtists(headliners, year) {
  const artists = new Map();
  for (const item of headliners) {
    if (item.years?.includes(year)) {
      artists.set(getCanonicalArtistKey(item.name), item.name);
    }
  }
  return artists;
}

function validateExactHistory(headliners, historical) {
  for (const year of getHistoricalManagedYears()) {
    const expected = historical.filter((item) => item.years?.includes(year));
    const unmatchedActual = headliners.filter((item) => item.years?.includes(year));
    const missing = [];

    for (const target of expected) {
      const match = findBestExistingHeadliner(unmatchedActual, target.name);
      if (!match) {
        missing.push(target.name);
        continue;
      }
      unmatchedActual.splice(match.index, 1);
    }

    if (missing.length || unmatchedActual.length) {
      throw new Error(
        `Historical reconciliation failed for ${year}: ` +
        `${missing.length} missing, ${unmatchedActual.length} extra`,
      );
    }
  }
}

function validateUnmanagedYearsUnchanged(before, after) {
  const managedYears = new Set(getHistoricalManagedYears());

  before.forEach((item, index) => {
    const beforeYears = (item.years ?? []).filter((year) => !managedYears.has(year));
    const afterYears = (after[index]?.years ?? []).filter((year) => !managedYears.has(year));
    if (JSON.stringify(beforeYears) !== JSON.stringify(afterYears)) {
      throw new Error(`Years outside 2007..2025 changed for ${item.name}`);
    }
  });
}

function printYearSummary(before, after) {
  for (const year of getHistoricalManagedYears()) {
    const previous = getYearArtists(before, year);
    const next = getYearArtists(after, year);
    const added = [...next].filter(([key]) => !previous.has(key)).map(([, name]) => name);
    const removed = [...previous].filter(([key]) => !next.has(key)).map(([, name]) => name);

    if (!added.length && !removed.length) {
      continue;
    }

    console.log(
      `${year}: ${previous.size} -> ${next.size}; +${added.length}, -${removed.length}`,
    );
    if (verbose) {
      if (added.length) console.log(`  Added: ${added.join(', ')}`);
      if (removed.length) console.log(`  Removed: ${removed.join(', ')}`);
    }
  }
}

async function main() {
  const historical = buildHistoricalHeadliners();
  const db = getDbConfig();

  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
  });

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT content FROM app_content WHERE id = 1 LIMIT 1 FOR UPDATE',
    );
    const row = rows[0];
    if (!row) {
      throw new Error('No app_content row — run npm run db:install --prefix cms');
    }

    const content = JSON.parse(row.content);
    const existing = Array.isArray(content.headliners) ? content.headliners : [];
    const {
      merged,
      added,
      changed,
      addedYearTags,
      matches,
      removedYearTags,
      preserved,
    } = reconcileHistoricalHeadliners(existing, historical);

    validateExactHistory(merged, historical);
    validateUnmanagedYearsUnchanged(existing, merged);
    printYearSummary(existing, merged);

    console.log(
      `Official history reconciliation: ${historical.length} artist records, ` +
      `${preserved} existing preserved, ${added} added, ${changed} existing changed, ` +
      `+${addedYearTags}/-${removedYearTags} year tags (${merged.length} total)`,
    );
    if (matches.length) {
      console.log(`Matched ${matches.length} source-name variants to existing headliners:`);
      for (const match of matches) {
        console.log(
          `  ${match.sourceName} -> ${match.existingName} (${match.method}` +
          `${match.distance === undefined ? '' : `, distance ${match.distance}`}` +
          `${match.alternatives.length ? `; preferred over ${match.alternatives.join(', ')}` : ''})`,
        );
      }
    }
    console.log('Years outside 2007..2025 were validated unchanged (including 2026).');

    if (dryRun) {
      await connection.rollback();
      console.log('Dry run complete; transaction rolled back.');
      return;
    }

    content.headliners = merged;
    await connection.query(
      'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(content)],
    );
    await connection.commit();
    console.log('Official 2007..2025 history saved to app_content.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
