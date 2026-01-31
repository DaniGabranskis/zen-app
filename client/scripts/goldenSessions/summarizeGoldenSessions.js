// client/scripts/goldenSessions/summarizeGoldenSessions.js
// GS+4: Generate summary markdown for Golden Sessions
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveSigTagsFromArray, buildScoringTags } from '../../src/domain/tags/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read all snapshots and generate summary table
 */
function summarizeGoldenSessions() {
  const snapshotsDir = path.join(__dirname, 'snapshots');
  const outDir = path.join(__dirname, '../../out');
  
  if (!fs.existsSync(snapshotsDir)) {
    console.error(`Snapshots directory not found: ${snapshotsDir}`);
    process.exit(1);
  }
  
  ensureDir(outDir);
  
  const snapshotFiles = fs.readdirSync(snapshotsDir)
    .filter(f => f.endsWith('.snapshot.json'))
    .sort();
  
  if (snapshotFiles.length === 0) {
    console.error('No snapshot files found');
    process.exit(1);
  }
  
  const rows = [];
  
  for (const file of snapshotFiles) {
    const snapshotPath = path.join(snapshotsDir, file);
    const id = path.basename(file, '.snapshot.json');
    
    try {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const { config, final, events } = snapshot;
      
      // Extract gate hits
      const gateHitsAny = final.gatesHitAny || {};
      const gateHitsCardsOnly = final.gatesHitCardsOnly || {};
      const coreGates = ['valence', 'arousal', 'agency', 'clarity', 'safety'];
      const coreGatesAny = coreGates.filter(g => gateHitsAny[g]).length;
      const coreGatesCardsOnly = coreGates.filter(g => gateHitsCardsOnly[g]).length;
      
      // Extract macro (before/after)
      const macroBefore = final.macroBeforeCards || 'none';
      const macroAfter = final.macroAfterL2 || final.macroAfterL1 || macroBefore;
      
      // Extract micro
      const microSelected = final.micro?.selected || 'null';
      const microSource = final.micro?.source || 'not_computed';
      
      // GS-MEANING-06: Read signal quality from projection (not recomputed)
      const expectedMacro = final.expectedMacro || null;
      const signalScore = final.signalScore ?? null;
      const scoringTagCount = final.scoringTagCount ?? null;
      const axisTagCount = final.axisTagCount ?? null;
      const eligibleForContradiction = final.eligibleForContradiction ?? false;
      const topSignals = final.topSignals || [];
      const hasContradiction = final.hasContradiction ?? false;
      
      // If not in projection, compute (for backward compatibility)
      let computedAnalysis = null;
      if (expectedMacro === null || signalScore === null) {
        computedAnalysis = detectContradiction(final, macroAfter);
      }
      
      rows.push({
        id,
        endedReason: final.endedReason || 'unknown',
        askedL1Count: final.askedL1Count || 0,
        askedL2Count: final.askedL2Count || 0,
        notSureCount: final.notSureCount || 0,
        macroBefore,
        macroAfter,
        microSelected: microSource === 'selected' ? microSelected : `${microSource}`,
        coreGatesAny,
        coreGatesCardsOnly,
        expectedMacro: expectedMacro || computedAnalysis?.expectedMacro || 'mixed',
        signalScore: signalScore ?? computedAnalysis?.signalScore ?? 0,
        contradiction: hasContradiction || computedAnalysis?.hasContradiction ? 'YES' : 'NO',
        topSignals: (topSignals.length > 0 ? topSignals : computedAnalysis?.topSignals || []).join(', '),
        eligibleForContradiction: eligibleForContradiction || computedAnalysis?.eligibleForContradiction || false,
      });
    } catch (e) {
      console.error(`Failed to process ${file}: ${e.message}`);
    }
  }
  
  // Generate markdown
  const md = generateMarkdown(rows);
  const outputPath = path.join(outDir, 'GOLDEN_SESSIONS_SUMMARY.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  
  console.log(`✅ Summary generated: ${outputPath}`);
  console.log(`   ${rows.length} sessions summarized`);
}

/**
 * GS-MEANING-01: Detect contradictions between signal polarity and final macro
 * @param {Object} final - Final state from snapshot
 * @param {string} finalMacro - Final macro state
 * @returns {Object} Contradiction analysis
 */
function detectContradiction(final, finalMacro) {
  // GS-MEANING-05: Use eligibility rules instead of hard-coded exclusions
  // Extract evidence tags
  const evidenceTags = final.evidenceTags || final.cardEvidenceTags || [];
  
  // Build scoring tags (exclude context)
  const scoringTags = buildScoringTags(evidenceTags, { excludeContext: true });
  const scoringTagCount = scoringTags.length;
  
  // Count axis tags (for signal quality)
  const axisTagCount = evidenceTags.filter(t => t && t.startsWith('sig.axis.')).length;
  
  // Derive sig tags from scoring tags
  const sigTags = deriveSigTagsFromArray(scoringTags);
  
  // Compute signal score
  let signalScore = 0;
  const signalWeights = {};
  
  for (const tag of sigTags) {
    if (tag === 'sig.valence.pos') {
      signalScore += 2;
      signalWeights['sig.valence.pos'] = (signalWeights['sig.valence.pos'] || 0) + 2;
    } else if (tag === 'sig.valence.neg') {
      signalScore -= 2;
      signalWeights['sig.valence.neg'] = (signalWeights['sig.valence.neg'] || 0) + 2;
    } else if (tag === 'sig.valence.neutral') {
      // neutral doesn't change score
    } else if (tag === 'sig.arousal.high') {
      signalScore += 1;
      signalWeights['sig.arousal.high'] = (signalWeights['sig.arousal.high'] || 0) + 1;
    } else if (tag === 'sig.fatigue.high') {
      signalScore -= 1;
      signalWeights['sig.fatigue.high'] = (signalWeights['sig.fatigue.high'] || 0) + 1;
    } else if (tag === 'sig.tension.high') {
      signalScore -= 1;
      signalWeights['sig.tension.high'] = (signalWeights['sig.tension.high'] || 0) + 1;
    } else if (tag === 'sig.tension.low') {
      signalScore += 1;
      signalWeights['sig.tension.low'] = (signalWeights['sig.tension.low'] || 0) + 1;
    } else if (tag === 'sig.clarity.high') {
      signalScore += 1;
      signalWeights['sig.clarity.high'] = (signalWeights['sig.clarity.high'] || 0) + 1;
    } else if (tag === 'sig.clarity.low') {
      signalScore -= 1;
      signalWeights['sig.clarity.low'] = (signalWeights['sig.clarity.low'] || 0) + 1;
    } else if (tag === 'sig.agency.high') {
      signalScore += 1;
      signalWeights['sig.agency.high'] = (signalWeights['sig.agency.high'] || 0) + 1;
    } else if (tag === 'sig.agency.low') {
      signalScore -= 1;
      signalWeights['sig.agency.low'] = (signalWeights['sig.agency.low'] || 0) + 1;
    }
  }
  
  // Determine expected macro
  let expectedMacro = 'mixed';
  if (signalScore >= 2) {
    expectedMacro = 'up';
  } else if (signalScore <= -2) {
    // Check if fatigue dominates
    const fatigueWeight = signalWeights['sig.fatigue.high'] || 0;
    const tensionWeight = signalWeights['sig.tension.high'] || 0;
    if (fatigueWeight > tensionWeight) {
      expectedMacro = 'exhausted';
    } else {
      expectedMacro = 'down';
    }
  }
  
  // GS-MEANING-05: Eligibility rules (no hard-coded exclusions)
  const eligibleForContradiction = Math.abs(signalScore) >= 2 && scoringTagCount >= 3;
  
  // GS-MEANING-07: Consider down-like macros (down, overloaded, blocked, pressured) as down for contradiction detection
  const isDownLike = ['down', 'overloaded', 'blocked', 'pressured'].includes(finalMacro);
  const isUpLike = ['up', 'connected', 'capable', 'engaged', 'grounded'].includes(finalMacro);
  
  // Check for contradiction (only if eligible)
  const hasContradiction = eligibleForContradiction && (
    (expectedMacro === 'up' && (isDownLike || finalMacro === 'exhausted')) ||
    ((expectedMacro === 'down' || expectedMacro === 'exhausted') && isUpLike)
  );
  
  // Get top 5 signals by weight
  const topSignals = Object.entries(signalWeights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
    .map(([tag]) => tag);
  
  return {
    expectedMacro,
    signalScore,
    hasContradiction,
    topSignals,
    scoringTagCount,
    axisTagCount,
    eligibleForContradiction,
  };
}

/**
 * Generate markdown table
 */
function generateMarkdown(rows) {
  const lines = [
    '# Golden Sessions Summary',
    '',
    'Generated summary of all Golden Session snapshots.',
    '',
    '## Overview',
    '',
    '| ID | Ended Reason | L1/L2/NS | Macro (Before → After) | Micro | Core Gates (Any/CardsOnly) | Expected Macro | Signal Score | Contradiction | Top Signals |',
    '|----|-------------|----------|-------------------------|-------|----------------------------|----------------|--------------|---------------|-------------|',
  ];
  
  for (const row of rows) {
    const l1l2ns = `${row.askedL1Count}/${row.askedL2Count}/${row.notSureCount}`;
    const macro = row.macroBefore === row.macroAfter 
      ? row.macroAfter 
      : `${row.macroBefore} → ${row.macroAfter}`;
    const gates = `${row.coreGatesAny}/${row.coreGatesCardsOnly}`;
    const contradiction = row.contradiction === 'YES' ? '⚠️ YES' : '✅ NO';
    const topSignals = row.topSignals || 'none';
    
    lines.push(
      `| ${row.id} | ${row.endedReason} | ${l1l2ns} | ${macro} | ${row.microSelected} | ${gates} | ${row.expectedMacro} | ${row.signalScore} | ${contradiction} | ${topSignals} |`
    );
  }
  
  lines.push('');
  lines.push('## Legend');
  lines.push('');
  lines.push('- **L1/L2/NS**: Asked L1 count / Asked L2 count / Not Sure count');
  lines.push('- **Macro**: Macro state before cards → after L2 (or L1 if no L2)');
  lines.push('- **Micro**: Selected micro (or source if not selected)');
  lines.push('- **Core Gates**: Number of core gates hit (Any source / CardsOnly)');
  lines.push('- **Expected Macro**: Macro predicted from signal polarity score');
  lines.push('- **Signal Score**: Computed from scoring tags (valence ±2, arousal/fatigue/tension/clarity/agency ±1)');
  lines.push('- **Contradiction**: ⚠️ YES = expected macro contradicts final macro, ✅ NO = no contradiction');
  lines.push('- **Top Signals**: Top 5 scoring tags driving the signal score');
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This summary is generated from snapshot files.');
  lines.push('- For detailed event logs, see individual snapshot files.');
  lines.push('- Contradiction detection uses signal polarity from scoring tags.');
  lines.push('- Low-signal sessions (e.g., GS10 with many "not_sure") should show neutral/mixed expected macro.');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * GS-MEANING-03: Check contradiction budget (max 1, only GS15 allowed)
 * @param {Array} rows - Summary rows
 * @returns {Object} { hasErrors: boolean, contradictionCount: number, message: string }
 */
function checkContradictionBudget(rows) {
  // GS-MEANING-09: Budget applies only to eligible sessions
  const eligibleContradictions = rows.filter(r => 
    r.contradiction === 'YES' && r.eligibleForContradiction === true
  );
  const contradictionCount = eligibleContradictions.length;
  
  // GS-MEANING-09: Check for intentional_contradiction flag in fixtures
  const fixturesDir = path.join(__dirname, 'fixtures');
  const intentionalContradictions = [];
  
  for (const row of eligibleContradictions) {
    try {
      const fixtureFiles = fs.readdirSync(fixturesDir)
        .filter(f => f.startsWith(`${row.id}_`) && f.endsWith('.fixture.json'));
      
      if (fixtureFiles.length > 0) {
        const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, fixtureFiles[0]), 'utf8'));
        const tags = fixture.tags || [];
        if (tags.includes('intentional_contradiction')) {
          intentionalContradictions.push(row.id);
        }
      }
    } catch (e) {
      // If fixture not found, treat as unexpected
    }
  }
  
  const unexpectedContradictions = eligibleContradictions.filter(r => 
    !intentionalContradictions.includes(r.id)
  );
  
  if (unexpectedContradictions.length > 0) {
    const unexpectedIds = unexpectedContradictions.map(r => r.id);
    return {
      hasErrors: true,
      contradictionCount,
      message: `Contradiction budget exceeded: ${unexpectedContradictions.length} unexpected contradiction(s) found. Unexpected: ${unexpectedIds.join(', ')}. All contradictions must have tags: ["intentional_contradiction"] in fixture.`,
    };
  }
  
  if (intentionalContradictions.length > 1) {
    return {
      hasErrors: true,
      contradictionCount,
      message: `Contradiction budget exceeded: ${intentionalContradictions.length} intentional contradiction(s) found (max 1 allowed).`,
    };
  }
  
  return {
    hasErrors: false,
    contradictionCount,
    message: `Contradiction budget OK: ${contradictionCount} eligible contradiction(s) found (${intentionalContradictions.length} intentional).`,
  };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('summarizeGoldenSessions.js')) {
  const debugMode = process.argv.includes('--debug');
  const snapshotsDir = path.join(__dirname, 'snapshots');
  const outDir = path.join(__dirname, '../../out');
  
  if (!fs.existsSync(snapshotsDir)) {
    console.error(`Snapshots directory not found: ${snapshotsDir}`);
    process.exit(1);
  }
  
  ensureDir(outDir);
  
  const snapshotFiles = fs.readdirSync(snapshotsDir)
    .filter(f => f.endsWith('.snapshot.json'))
    .sort();
  
  if (snapshotFiles.length === 0) {
    console.error('No snapshot files found');
    process.exit(1);
  }
  
  const rows = [];
  
  for (const file of snapshotFiles) {
    const snapshotPath = path.join(snapshotsDir, file);
    const id = path.basename(file, '.snapshot.json');
    
    try {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const { config, final, events } = snapshot;
      
      // Extract gate hits
      const gateHitsAny = final.gatesHitAny || {};
      const gateHitsCardsOnly = final.gatesHitCardsOnly || {};
      const coreGates = ['valence', 'arousal', 'agency', 'clarity', 'safety'];
      const coreGatesAny = coreGates.filter(g => gateHitsAny[g]).length;
      const coreGatesCardsOnly = coreGates.filter(g => gateHitsCardsOnly[g]).length;
      
      // Extract macro (before/after)
      const macroBefore = final.macroBeforeCards || 'none';
      const macroAfter = final.macroAfterL2 || final.macroAfterL1 || macroBefore;
      
      // Extract micro
      const microSelected = final.micro?.selected || 'null';
      const microSource = final.micro?.source || 'not_computed';
      
      // GS-MEANING-06: Read signal quality from projection (not recomputed)
      const expectedMacro = final.expectedMacro || null;
      const signalScore = final.signalScore ?? null;
      const scoringTagCount = final.scoringTagCount ?? null;
      const axisTagCount = final.axisTagCount ?? null;
      const eligibleForContradiction = final.eligibleForContradiction ?? false;
      const topSignals = final.topSignals || [];
      const hasContradiction = final.hasContradiction ?? false;
      
      // If not in projection, compute (for backward compatibility)
      let computedAnalysis = null;
      if (expectedMacro === null || signalScore === null) {
        computedAnalysis = detectContradiction(final, macroAfter);
      }
      
      rows.push({
        id,
        endedReason: final.endedReason || 'unknown',
        askedL1Count: final.askedL1Count || 0,
        askedL2Count: final.askedL2Count || 0,
        notSureCount: final.notSureCount || 0,
        macroBefore,
        macroAfter,
        microSelected: microSource === 'selected' ? microSelected : `${microSource}`,
        coreGatesAny,
        coreGatesCardsOnly,
        expectedMacro: expectedMacro || computedAnalysis?.expectedMacro || 'mixed',
        signalScore: signalScore ?? computedAnalysis?.signalScore ?? 0,
        contradiction: hasContradiction || computedAnalysis?.hasContradiction ? 'YES' : 'NO',
        topSignals: (topSignals.length > 0 ? topSignals : computedAnalysis?.topSignals || []).join(', '),
        eligibleForContradiction: eligibleForContradiction || computedAnalysis?.eligibleForContradiction || false,
      });
      
      // GS-MEANING-12: Diagnostic output for contradictions
      if (debugMode && id === 'GS06' && (hasContradiction || computedAnalysis?.hasContradiction)) {
        console.error('\n=== GS06 Contradiction Diagnostic ===');
        console.error(`Expected Macro: ${expectedMacro}`);
        console.error(`Actual Macro: ${macroAfter}`);
        console.error(`Signal Score: ${signalScore}`);
        console.error(`Scoring Tag Count: ${scoringTagCount}`);
        console.error(`Axis Tag Count: ${axisTagCount}`);
        console.error(`Top Signals: ${topSignals.join(', ')}`);
        console.error(`Eligible: ${eligibleForContradiction}`);
        
        // Last 6 events
        const lastEvents = events.slice(-6);
        console.error('\nLast 6 events:');
        for (const e of lastEvents) {
          const eventInfo = {
            type: e.type,
            step: e.step,
            cardId: e.cardId,
            choice: e.choice,
            tags: e.tags ? (Array.isArray(e.tags) ? e.tags.slice(0, 3).join(', ') : String(e.tags).substring(0, 50)) : null,
            gate: e.gate,
            scope: e.scope,
            macro: e.macro,
          };
          console.error(`  ${JSON.stringify(eventInfo, null, 2)}`);
        }
        console.error('=====================================\n');
      }
    } catch (e) {
      console.error(`Failed to process ${file}: ${e.message}`);
    }
  }
  
  // Generate markdown
  const md = generateMarkdown(rows);
  const outputPath = path.join(outDir, 'GOLDEN_SESSIONS_SUMMARY.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  
  console.log(`✅ Summary generated: ${outputPath}`);
  console.log(`   ${rows.length} sessions summarized`);
  
  // GS-MEANING-03: Check contradiction budget
  const budgetCheck = checkContradictionBudget(rows);
  console.log(`\n${budgetCheck.message}`);
  
  if (budgetCheck.hasErrors) {
    console.error(`\n❌ Contradiction budget check FAILED`);
    process.exit(1);
  } else {
    console.log(`✅ Contradiction budget check PASSED`);
  }
}
