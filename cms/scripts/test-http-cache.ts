import assert from 'node:assert/strict';
import { matchesIfNoneMatch } from '../src/lib/http-cache';

const etag = '"' + 'a'.repeat(64) + '"';
assert.equal(matchesIfNoneMatch(null, etag), false);
assert.equal(matchesIfNoneMatch('', etag), false);
assert.equal(matchesIfNoneMatch(etag, etag), true);
assert.equal(matchesIfNoneMatch('W/' + etag, etag), true);
assert.equal(matchesIfNoneMatch(' "old", W/' + etag + ' ', etag), true);
assert.equal(matchesIfNoneMatch('*', etag), true);
assert.equal(matchesIfNoneMatch('"old"', etag), false);
assert.equal(matchesIfNoneMatch('w/' + etag, etag), false);
assert.equal(matchesIfNoneMatch(etag.slice(1, -1), etag), false);
console.log('HTTP cache: strong, weak, multiple and wildcard entity tags passed.');
