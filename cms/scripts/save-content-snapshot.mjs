/** Prevent maintenance jobs from overwriting edits made after their initial read. */
export async function saveContentSnapshot(connection, originalJson, nextContent) {
  const [result] = await connection.query(
    'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1 AND SHA2(content, 256) = SHA2(?, 256)',
    [JSON.stringify(nextContent), originalJson],
  );
  if (result.affectedRows !== 1) {
    throw new Error('Content changed while this job was running. No changes were saved; rerun against the latest snapshot.');
  }
}
