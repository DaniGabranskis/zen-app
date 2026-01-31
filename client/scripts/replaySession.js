// client/scripts/replaySession.js
// A3.5-01: Replay/debugger CLI for Golden Sessions and real sessions
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeepSessionRunner, createFlowConfig } from '../src/domain/deepSession/index.js';
import { buildRunnerDeps } from './goldenSessions/wireDeps.js';
import { stableProjection } from './goldenSessions/stableProjection.js';

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

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function stableStringify(obj) {
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
  const A = a.split('\n');
  const B = b.split('\n');
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    if (A[i] !== B[i]) {
      return {
        line: i + 1,
        expected: A[i] ?? '',
        actual: B[i] ?? '',
      };
    }
  }
  return null;
}

/**
 * A3.5-01: Replay fixture and generate projection
 * @param {string} fixturePath - Path to fixture JSON
 * @param {string} [snapshotPath] - Optional path to snapshot JSON for comparison
 * @param {boolean} [debug] - Print first divergence if snapshot provided
 * @returns {Object} Result with { projection, matches, firstDivergence }
 */
async function replayFixture(fixturePath, snapshotPath = null, debug = false) {
  const fixture = readJson(fixturePath);
  const id = fixture.id || path.basename(fixturePath, '.fixture.json');
  
  // Create RNG with seed
  const rngObj = new SeededRandom(fixture.seed || 42);
  const rng = () => rngObj.random();
  
  // Build flow config
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
  
  // Build deps
  const deps = buildRunnerDeps(rng, fixture);
  deps.flowConfig = flowConfig;
  
  // Create runner
  const runner = createDeepSessionRunner(deps);
  runner.init(fixture.baselineMetrics, fixture.tags || []);
  
  // Run session (simulate user answers)
  const answerPolicy = fixture.answerPolicy || {};
  const forcedAnswers = answerPolicy.forcedAnswers || {};
  let stepCount = 0;
  
  while (true) {
    const nextCard = runner.getNextCard();
    if (!nextCard) {
      break;
    }
    
    const cardId = nextCard.card.id;
    let choice = null;
    
    // Check forced answers
    if (forcedAnswers[cardId]) {
      choice = forcedAnswers[cardId];
    } else {
      // Use answer sampler (from deps)
      const card = deps.decksById.L1[cardId] || deps.decksById.L2[cardId];
      if (card && card.options && card.options.length >= 2) {
        const sampled = deps.answerSampler.sample({ 
          fixture, 
          state: runner.getState(), 
          nextCardId: cardId, 
          stepIndex: stepCount, 
          rng: rng 
        });
        choice = sampled === 'A' ? 'left' : sampled === 'B' ? 'right' : 'not_sure';
      } else {
        choice = 'not_sure';
      }
    }
    
    // Normalize choice
    if (choice === 'A' || choice === 'left') {
      choice = 'left';
    } else if (choice === 'B' || choice === 'right') {
      choice = 'right';
    } else {
      choice = 'not_sure';
    }
    
    const result = runner.commitAnswer({ cardId, choice });
    if (result.ended) {
      break;
    }
  }
  
  // Generate projection
  const finalState = runner.getState();
  const finalEvents = runner.getEvents();
  const run = {
    state: finalState,
    events: finalEvents,
    flowConfig,
  };
  
  const projection = stableProjection(run, { id, seed: fixture.seed, tags: fixture.tags || [] });
  
  // Compare with snapshot if provided
  let matches = true;
  let firstDivergence = null;
  
  if (snapshotPath && fs.existsSync(snapshotPath)) {
    const snapshot = readJson(snapshotPath);
    const projectionStr = stableStringify(projection);
    const snapshotStr = stableStringify(snapshot);
    
    if (projectionStr !== snapshotStr) {
      matches = false;
      
      // Find first divergence in events
      const projEvents = projection.events || [];
      const snapEvents = snapshot.events || [];
      const minLen = Math.min(projEvents.length, snapEvents.length);
      
      for (let i = 0; i < minLen; i++) {
        const projEvent = stableStringify(projEvents[i]);
        const snapEvent = stableStringify(snapEvents[i]);
        if (projEvent !== snapEvent) {
          firstDivergence = {
            eventIndex: i,
            projectionEvent: projEvents[i],
            snapshotEvent: snapEvents[i],
          };
          break;
        }
      }
      
      if (!firstDivergence && projEvents.length !== snapEvents.length) {
        firstDivergence = {
          eventIndex: minLen,
          message: `Event count mismatch: projection has ${projEvents.length}, snapshot has ${snapEvents.length}`,
        };
      }
      
      // Also check overall diff
      const diff = diffText(projectionStr, snapshotStr);
      if (diff && debug) {
        console.error(`\n[REPLAY] First diff at line ${diff.line}:`);
        console.error(`  Expected: ${diff.expected}`);
        console.error(`  Actual:   ${diff.actual}`);
      }
    }
  }
  
  return {
    projection,
    matches,
    firstDivergence,
  };
}

function parseArgs(argv) {
  const args = { fixture: null, snapshot: null, debug: false, outDir: path.join(__dirname, 'out') };
  
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fixture' && i + 1 < argv.length) {
      args.fixture = argv[++i];
    } else if (a === '--snapshot' && i + 1 < argv.length) {
      args.snapshot = argv[++i];
    } else if (a === '--debug') {
      args.debug = true;
    } else if (a === '--outDir' && i + 1 < argv.length) {
      args.outDir = argv[++i];
    }
  }
  
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  
  if (!args.fixture) {
    console.error('Usage: node replaySession.js --fixture <path> [--snapshot <path>] [--debug] [--outDir <path>]');
    process.exit(1);
  }
  
  if (!fs.existsSync(args.fixture)) {
    console.error(`Fixture not found: ${args.fixture}`);
    process.exit(1);
  }
  
  try {
    const result = await replayFixture(args.fixture, args.snapshot, args.debug);
    
    // Write projection
    const fixture = readJson(args.fixture);
    const id = fixture.id || path.basename(args.fixture, '.fixture.json');
    const outPath = path.join(args.outDir, `replay_${id}.json`);
    
    if (!fs.existsSync(args.outDir)) {
      fs.mkdirSync(args.outDir, { recursive: true });
    }
    
    fs.writeFileSync(outPath, JSON.stringify(result.projection, null, 2), 'utf8');
    console.log(`✅ Projection written: ${outPath}`);
    
    // Compare with snapshot
    if (args.snapshot) {
      if (result.matches) {
        console.log('✅ Projection matches snapshot');
        process.exit(0);
      } else {
        console.error('❌ Projection does NOT match snapshot');
        
        if (result.firstDivergence) {
          console.error(`\nFirst divergence at event index ${result.firstDivergence.eventIndex}:`);
          if (result.firstDivergence.projectionEvent && result.firstDivergence.snapshotEvent) {
            console.error('Projection event:', JSON.stringify(result.firstDivergence.projectionEvent, null, 2));
            console.error('Snapshot event:', JSON.stringify(result.firstDivergence.snapshotEvent, null, 2));
          } else if (result.firstDivergence.message) {
            console.error(result.firstDivergence.message);
          }
        }
        
        process.exit(1);
      }
    } else {
      console.log('✅ Replay completed (no snapshot comparison)');
      process.exit(0);
    }
  } catch (e) {
    console.error('❌ Replay failed:', e.message);
    if (args.debug) {
      console.error(e.stack);
    }
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('replaySession.js')) {
  main();
}
