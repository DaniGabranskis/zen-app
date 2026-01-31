// client/scripts/runGoldenSessions.js
// Task A3.4.3: Runner harness for Golden Sessions test suite
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeepSessionRunner, createFlowConfig } from '../src/domain/deepSession/index.js';
import { createSessionEndEvent } from '../src/domain/deepSession/events.js';
import { buildRunnerDeps } from './goldenSessions/wireDeps.js';
import { stableProjection } from './goldenSessions/stableProjection.js';
import { assertGoldenInvariants } from './goldenSessions/assertGoldenInvariants.js';
import { getFixtureExpectations, validateExpectations } from './goldenSessions/expectations.js';
import { validateAllSnapshots, validateSnapshot } from './goldenSessions/validateSnapshots.js';
import { hashFixture, hashObject } from './goldenSessions/hashFixture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

function parseArgs(argv) {
  const args = { update: false, only: null, printDiff: true, debug: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--update') args.update = true;
    else if (a === '--no-printDiff') args.printDiff = false;
    else if (a === '--printDiff') args.printDiff = true;
    else if (a === '--debug') args.debug = true;
    else if (a === '--only' || a === '--id') {
      const value = argv[++i] || '';
      args.only = value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (a.startsWith('--only=') || a.startsWith('--id=')) {
      args.only = a.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return args;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function stableStringify(obj) {
  // Stable JSON stringify (sort object keys recursively)
  function sortRec(v) {
    if (Array.isArray(v)) return v.map(sortRec);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sortRec(v[k]);
      return out;
    }
    return v;
  }
  return JSON.stringify(sortRec(obj), null, 2);
}

function diffText(a, b) {
  // Minimal diff: show first differing line
  const A = a.split('\n');
  const B = b.split('\n');
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    if (A[i] !== B[i]) {
      return `First diff at line ${i + 1}:\n- ${A[i] ?? ''}\n+ ${B[i] ?? ''}\n`;
    }
  }
  return 'No diff';
}

async function runOneFixture(fixturePath, options = {}) {
  const { debug = false } = options;
  const fixture = readJson(fixturePath);
  const fixtureId = fixture.id || path.basename(fixturePath).split('.')[0];
  
  // Create RNG with seed
  const rngObj = new SeededRandom(fixture.seed);
  const rng = () => rngObj.random();
  
  // Build flow config
  // GS11-FIX-02: Use nullish coalescing to allow maxL2=0
  const flowConfig = createFlowConfig({
    maxL1: fixture.flowConfigOverrides?.maxL1 ?? 5,
    maxL2: fixture.flowConfigOverrides?.maxL2 ?? 5,
    minL1: fixture.flowConfigOverrides?.minL1 ?? 3,
    minL2: fixture.flowConfigOverrides?.minL2 ?? 2,
    stopOnGates: fixture.flowConfigOverrides?.stopOnGates !== false,
    notSureRate: fixture.flowConfigOverrides?.notSureRate ?? 0.2,
    profile: fixture.flowConfigOverrides?.profile ?? 'mix',
    coverageFirstEnabled: true,
    baselineInjectionEnabled: true,
  });
  
  // Build deps (GS11-FIX-01: pass fixture for forcedL1CardOrder support)
  const deps = buildRunnerDeps(rng, fixture);
  deps.flowConfig = flowConfig;
  
  // Create runner
  const runner = createDeepSessionRunner(deps);
  // GS-MEANING-16: Pass fixture tags to runner for eligibility check
  runner.init(fixture.baselineMetrics, fixture.tags || []);
  
  // Suppress console.log from l1CardSelector during golden sessions
  const originalLog = console.log;
  console.log = (...args) => {
    // Only suppress l1CardSelector logs, keep others
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[l1CardSelector]')) {
      return; // Suppress
    }
    originalLog(...args);
  };
  
  // Drive session until ended - canonical loop: 1 getNextCard → 1 commitAnswer
  const HARD_CAP = 64; // Safety against infinite loops
  
  let steps = 0;
  while (steps < HARD_CAP) {
    const next = runner.getNextCard(); // MUST be called exactly once per step
    if (!next) break; // runner signals end
    
    const state = runner.getState();
    const card = next.card; // getNextCard returns { layer, card, reason }
    const cardId = card.id;
    
    // Choose answer deterministically from fixture (or fixture policy)
    const choice = deps.answerSampler.sample({
      fixture,
      state,
      nextCardId: cardId,
      stepIndex: state.step,
      rng,
    });
    
    // Task 5: Commit exactly once for the current card - fail-fast on errors
    try {
      runner.commitAnswer({ cardId, choice });
    } catch (e) {
      throw new Error(`Golden failed: commitAnswer error for ${cardId}: ${e.message}`);
    }
    
    steps += 1;
  }
  
  // Restore console.log
  console.log = originalLog;
  
  let finalState = runner.getState();
  let finalEvents = runner.getEvents();
  
  // Task 5: HARD_CAP should be FAIL, not warn
  if (steps >= HARD_CAP && !finalState.endedReason) {
    throw new Error(`Golden failed: session did not end within HARD_CAP=${HARD_CAP} steps. phase=${finalState.phase}, lastCard=${finalState.currentCardId}`);
  }
  
  // Ensure session_end event exists (required by invariants)
  const hasSessionEnd = finalEvents.some(e => e && e.type === 'session_end');
  if (!hasSessionEnd) {
    // Generate session_end if missing (required by invariants)
    if (finalState.phase === 'ENDED') {
      finalEvents = [...finalEvents];
      finalEvents.push(createSessionEndEvent(finalState.step, finalState.endedBy || 'unknown', finalState.endedReason || 'unknown', finalState));
    } else {
      // Task 5: This should not happen - fail fast
      throw new Error(`Golden failed: session did not end naturally. phase=${finalState.phase}, steps=${steps}, lastCard=${finalState.currentCardId}, endedBy=${finalState.endedBy}`);
    }
  }
  
  // Task 5: Final validation - endedReason must not be null
  if (!finalState.endedReason) {
    throw new Error(`Golden failed: finalState.endedReason is null. phase=${finalState.phase}, steps=${steps}`);
  }
  
  // GS-LEFT-02: Diagnostic dump for failing fixtures
  if (debug && (fixtureId === 'GS06' || fixtureId === 'GS12')) {
    console.log('\n=== DIAGNOSTIC DUMP for', fixtureId, '===');
    console.log('Final state:');
    console.log('  phase:', finalState.phase);
    console.log('  endedReason:', finalState.endedReason);
    console.log('  endedBy:', finalState.endedBy);
    const askedL1Count = finalState.askedL1Ids instanceof Set ? finalState.askedL1Ids.size : (Array.isArray(finalState.askedL1Ids) ? finalState.askedL1Ids.length : 'unknown');
    const askedL2Count = finalState.askedL2Ids instanceof Set ? finalState.askedL2Ids.size : (Array.isArray(finalState.askedL2Ids) ? finalState.askedL2Ids.length : 'unknown');
    console.log('  askedL1Count:', askedL1Count);
    console.log('  askedL2Count:', askedL2Count);
    console.log('  notSureCount:', finalState.notSureCount);
    console.log('\nConfig:');
    console.log(JSON.stringify(flowConfig, null, 2));
    console.log('\nLast 25 events:');
    const lastEvents = finalEvents.slice(-25);
    lastEvents.forEach((e, idx) => {
      if (!e) return;
      const eventInfo = {
        step: e.step ?? '?',
        type: e.type ?? '?',
        cardId: e.cardId ?? e.payload?.cardId ?? null,
        choice: e.choice ?? e.payload?.choice ?? null,
        tags: e.tags ?? e.payload?.tags ?? null,
        gate: e.gate ?? e.payload?.gate ?? e.payload?.gateName ?? null,
        scope: e.payload?.scope ?? null,
      };
      console.log(`  [${idx}]`, JSON.stringify(eventInfo));
    });
    console.log('=== END DIAGNOSTIC DUMP ===\n');
  }

  return {
    state: finalState,
    events: finalEvents,
    flowConfig, // Pass flowConfig for stableProjection
  };
}

async function main() {
  const args = parseArgs(process.argv);
  
  const root = path.join(__dirname, 'goldenSessions');
  const fixturesDir = path.join(root, 'fixtures');
  const snapshotsDir = path.join(root, 'snapshots');
  ensureDir(snapshotsDir);
  
  // GS-CURSOR-02: Validate all snapshots first (before running fixtures)
  if (!args.update) {
    const validationResult = validateAllSnapshots(snapshotsDir);
    if (!validationResult.valid) {
      console.error('❌ Snapshot validation failed:');
      validationResult.errors.forEach(err => console.error(`  ${err}`));
      process.exit(1);
    }
  }
  
  const fixtureFiles = fs.readdirSync(fixturesDir)
    .filter(f => f.endsWith('.fixture.json'))
    .map(f => path.join(fixturesDir, f))
    .sort();
  
  const selectedFixtures = args.only
    ? fixtureFiles.filter(fp => {
        const fixture = readJson(fp);
        return args.only.some(id => fixture.id === id || fp.includes(id));
      })
    : fixtureFiles;
  
  if (selectedFixtures.length === 0) {
    console.error('No fixtures selected.');
    process.exit(1);
  }
  
  let failed = 0;
  let updated = 0;
  let passed = 0;
  
  for (const fixturePath of selectedFixtures) {
    const fixture = readJson(fixturePath);
    const id = fixture.id || path.basename(fixturePath).split('.')[0];
    const snapshotPath = path.join(snapshotsDir, `${id}.snapshot.json`);
    
    try {
      const run = await runOneFixture(fixturePath, { debug: args.debug && (id === 'GS06' || id === 'GS12') });
      const projection = stableProjection(run, { id, seed: fixture.seed, tags: fixture.tags || [] });
      
      // GS-HYGIENE-01: Add fixtureHash to config
      const fixtureHash = hashFixture(fixture);
      projection.config.fixtureHash = fixtureHash;
      
      // GS-HARDEN-03: Add configHash for resolved config (detects default/resolution changes)
      const resolvedConfig = projection.config;
      const configHash = hashObject(resolvedConfig);
      projection.config.configHash = configHash;
      
      // A3.4.3: Always validate invariants (both update and check modes)
      try {
        assertGoldenInvariants(projection, { id });
      } catch (error) {
        console.error(`[INVARIANT FAIL] ${id}: ${error.message}`);
        if (args.printDiff) {
          console.error(`\nFull error:\n${error.stack}`);
        }
        failed++;
        continue;
      }
      
      // Task 6: Validate expectations (fixture-specific checks) - FAIL on errors
      const expectations = getFixtureExpectations(fixture);
      const expectationErrors = validateExpectations(projection, expectations, id);
      if (expectationErrors.length > 0) {
        console.error(`[EXPECTATION FAIL] ${id}:`);
        expectationErrors.forEach(err => console.error(`  ${err}`));
        if (!args.update) {
          failed++;
          continue;
        }
        // In update mode, warn but allow update (for debugging)
        console.warn(`  (Allowing update for debugging)`);
      }
      
      const actualText = stableStringify(projection);
      
      if (args.update) {
        fs.writeFileSync(snapshotPath, actualText, 'utf8');
        console.log(`[UPDATED] ${id}`);
        updated++;
        continue;
      }
      
      if (!fs.existsSync(snapshotPath)) {
        console.error(`[FAIL] Missing snapshot for ${id}. Run with --update.`);
        failed++;
        continue;
      }
      
      // GS-CURSOR-02: Validate snapshot before diff
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      
      // GS-HYGIENE-01: Check fixtureHash mismatch (fail-fast)
      const expectedHash = hashFixture(fixture);
      const actualHash = snapshot?.config?.fixtureHash;
      
      if (!actualHash) {
        console.error(`[GOLDEN] ${id}: Missing config.fixtureHash in snapshot. Run: npm run golden:update -- --id ${id}`);
        failed++;
        continue;
      }
      
      if (actualHash !== expectedHash) {
        console.error(`[GOLDEN] ${id}: Snapshot is OUTDATED (fixtureHash mismatch). Run: npm run golden:update -- --id ${id}`);
        console.error(`  Expected: ${expectedHash.substring(0, 8)}...`);
        console.error(`  Actual:   ${actualHash.substring(0, 8)}...`);
        failed++;
        continue;
      }
      
      const snapshotErrors = validateSnapshot(snapshot, id);
      if (snapshotErrors.length > 0) {
        console.error(`[VALIDATION FAIL] ${id}:`);
        snapshotErrors.forEach(err => console.error(`  ${err}`));
        failed++;
        continue;
      }
      
      const expectedText = fs.readFileSync(snapshotPath, 'utf8');
      
      // Use text equality to avoid key order issues
      if (actualText === expectedText) {
        console.log(`[PASS] ${id}`);
        passed++;
      } else {
        console.error(`[FAIL] ${id}`);
        if (args.printDiff) {
          console.error(diffText(expectedText, actualText));
        }
        failed++;
      }
    } catch (error) {
      console.error(`[ERROR] ${id}: ${error.message}`);
      if (args.printDiff) {
        console.error(error.stack);
      }
      failed++;
    }
  }
  
  // Summary
  console.log(`\n=== Summary ===`);
  if (args.update) {
    console.log(`Updated: ${updated}/${selectedFixtures.length}`);
  } else {
    console.log(`Passed: ${passed}/${selectedFixtures.length}`);
    if (failed > 0) {
      console.error(`Failed: ${failed}/${selectedFixtures.length}`);
      process.exit(1);
    }
  }
  
  if (failed === 0 && !args.update) {
    console.log(`\n✅ All tests passed`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
