// client/scripts/goldenSessions/goldenDoctor.js
// GS-HYGIENE-05: Doctor command to check snapshot health
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashFixture } from './hashFixture.js';
import { GOLDEN_SNAPSHOT_VERSION } from './stableProjection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Check all snapshots for health issues
 */
export function doctor() {
  const root = path.join(__dirname);
  const fixturesDir = path.join(root, 'fixtures');
  const snapshotsDir = path.join(root, 'snapshots');

  if (!fs.existsSync(fixturesDir)) {
    console.error(`❌ Fixtures directory not found: ${fixturesDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(snapshotsDir)) {
    console.error(`❌ Snapshots directory not found: ${snapshotsDir}`);
    process.exit(1);
  }

  const fixtureFiles = fs.readdirSync(fixturesDir)
    .filter(f => f.endsWith('.fixture.json'))
    .sort();

  const snapshotFiles = fs.readdirSync(snapshotsDir)
    .filter(f => f.endsWith('.snapshot.json'))
    .sort();

  console.log(`\n🔍 Golden Sessions Doctor\n`);
  console.log(`Fixtures: ${fixtureFiles.length}`);
  console.log(`Snapshots: ${snapshotFiles.length}\n`);

  const issues = [];
  const outdated = [];
  const missing = [];

  // Check each fixture
  for (const fixtureFile of fixtureFiles) {
    const fixturePath = path.join(fixturesDir, fixtureFile);
    const fixture = readJson(fixturePath);
    const id = fixture.id || path.basename(fixtureFile, '.fixture.json');
    const snapshotPath = path.join(snapshotsDir, `${id}.snapshot.json`);

    if (!fs.existsSync(snapshotPath)) {
      missing.push(id);
      continue;
    }

    const snapshot = readJson(snapshotPath);
    const expectedHash = hashFixture(fixture);
    const actualHash = snapshot?.config?.fixtureHash;
    const actualVersion = snapshot?.config?.snapshotVersion;

    // Check fixtureHash
    if (!actualHash) {
      issues.push(`${id}: Missing config.fixtureHash`);
    } else if (actualHash !== expectedHash) {
      outdated.push({
        id,
        reason: 'fixtureHash mismatch',
        expected: expectedHash.substring(0, 8),
        actual: actualHash.substring(0, 8),
      });
    }

    // Check snapshotVersion
    if (!actualVersion) {
      issues.push(`${id}: Missing config.snapshotVersion`);
    } else if (actualVersion !== GOLDEN_SNAPSHOT_VERSION) {
      outdated.push({
        id,
        reason: 'snapshotVersion mismatch',
        expected: GOLDEN_SNAPSHOT_VERSION,
        actual: actualVersion,
      });
    }
  }

  // Check for orphaned snapshots (snapshot without fixture)
  const fixtureIds = new Set(fixtureFiles.map(f => {
    const fixture = readJson(path.join(fixturesDir, f));
    return fixture.id || path.basename(f, '.fixture.json');
  }));

  const orphaned = snapshotFiles
    .map(f => path.basename(f, '.snapshot.json'))
    .filter(id => !fixtureIds.has(id));

  // Report results
  if (missing.length > 0) {
    console.log(`❌ Missing snapshots (${missing.length}):`);
    missing.forEach(id => console.log(`   - ${id}`));
    console.log();
  }

  if (orphaned.length > 0) {
    console.log(`⚠️  Orphaned snapshots (${orphaned.length}):`);
    orphaned.forEach(id => console.log(`   - ${id} (no fixture found)`));
    console.log();
  }

  if (issues.length > 0) {
    console.log(`❌ Health issues (${issues.length}):`);
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log();
  }

  if (outdated.length > 0) {
    console.log(`⚠️  Outdated snapshots (${outdated.length}):`);
    outdated.forEach(item => {
      if (item.reason === 'fixtureHash mismatch') {
        console.log(`   - ${item.id}: fixtureHash mismatch (expected: ${item.expected}..., actual: ${item.actual}...)`);
      } else {
        console.log(`   - ${item.id}: snapshotVersion mismatch (expected: ${item.expected}, actual: ${item.actual})`);
      }
    });
    console.log();
    console.log(`💡 Run: npm run golden:update`);
    console.log();
  }

  // GS-HARDEN-02: Track if there are any errors (for CI)
  const hasErrors = missing.length > 0 || orphaned.length > 0 || issues.length > 0 || outdated.length > 0;

  if (!hasErrors) {
    console.log(`✅ All snapshots are healthy`);
    console.log();
    return true;
  }

  // GS-HARDEN-02: Return false if any issues found (CI will fail)
  return false;
}

/**
 * CLI entry point
 */
export function main() {
  const healthy = doctor();
  process.exit(healthy ? 0 : 1);
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('goldenDoctor.js')) {
  main();
}
