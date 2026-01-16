// analyzeSessionResults.js (AJ3 & AJ4 - Session Results Analysis)
// Analyzes telemetry logs to generate success metrics and identify false positives

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

/**
 * Parse telemetry logs to extract session decision payloads
 * @param {string} logPath - Path to telemetry log file
 * @returns {Array} Array of session payloads
 */
function parseTelemetryLogs(logPath) {
  if (!fs.existsSync(logPath)) {
    console.warn(`Log file not found: ${logPath}`);
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const sessions = [];
  
  for (const line of lines) {
    if (!line.trim() || !line.startsWith('[EVT]')) continue;
    
    try {
      const jsonStr = line.replace(/^\[EVT\]\s*/, '');
      const event = JSON.parse(jsonStr);
      
      if (event.type === 'session_decision_payload') {
        sessions.push(event);
      }
      
      if (event.type === 'session_feedback') {
        // Match feedback to session by timestamp proximity
        const session = sessions.find(s => 
          Math.abs(new Date(s.ts) - new Date(event.ts)) < 5000
        );
        if (session) {
          session.feedback = event;
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  return sessions;
}

/**
 * Task AJ3: Evaluate session results
 * @param {Array} sessions - Array of session payloads with feedback
 * @returns {Object} Evaluation metrics
 */
function evaluateSessionResults(sessions) {
  const total = sessions.length;
  if (total === 0) {
    return { error: 'No sessions found' };
  }
  
  // Rating distribution
  const ratings = sessions
    .filter(s => s.feedback?.rating)
    .map(s => s.feedback.rating);
  
  const rating4Plus = ratings.filter(r => r >= 4).length;
  const rating4PlusRate = ratings.length > 0 ? (rating4Plus / ratings.length) * 100 : 0;
  
  // Cluster match (closest state in same cluster)
  const clusterMatches = sessions.filter(s => {
    if (!s.feedback?.closestState) return false; // Rating >= 4, no closest needed
    if (s.feedback.rating >= 4) return true; // High rating = match
    
    // Check if closest state is in same cluster
    const clusters = {
      stress: ['pressured', 'blocked', 'overloaded'],
      low_energy: ['exhausted', 'down', 'averse', 'detached'],
      positive: ['grounded', 'engaged', 'connected', 'capable'],
    };
    
    const baselineMacro = s.baselineOutput?.stateKey;
    const closestState = s.feedback.closestState;
    
    for (const cluster of Object.values(clusters)) {
      if (cluster.includes(baselineMacro) && cluster.includes(closestState)) {
        return true;
      }
    }
    
    return false;
  }).length;
  
  const clusterMatchRate = total > 0 ? (clusterMatches / total) * 100 : 0;
  
  // NeedsRefine rate
  const needsRefineCount = sessions.filter(s => 
    s.baselineOutput?.needsRefine || s.deepOutput?.needsRefine
  ).length;
  const needsRefineRate = (needsRefineCount / total) * 100;
  
  // Micro null rate (deep sessions only)
  const deepSessions = sessions.filter(s => s.flowMode === 'deep');
  const microNullCount = deepSessions.filter(s => 
    !s.deepOutput?.microKey || s.deepOutput.microKey === null
  ).length;
  const microNullRate = deepSessions.length > 0 
    ? (microNullCount / deepSessions.length) * 100 
    : 0;
  
  // Success criteria (AJ3)
  const successRate = Math.max(rating4PlusRate, clusterMatchRate);
  const successThreshold = 70; // ≥70% sessions have rating ≥4 or cluster match
  const needsRefineThreshold = 35; // ≤35% sessions show needsRefine
  const microNullThreshold = 35; // ≤35% deep sessions have micro null
  
  const success = {
    rating4Plus: rating4PlusRate >= successThreshold,
    needsRefine: needsRefineRate <= needsRefineThreshold,
    microNull: microNullRate <= microNullThreshold,
  };
  
  return {
    total,
    ratings: {
      count: ratings.length,
      distribution: {
        1: ratings.filter(r => r === 1).length,
        2: ratings.filter(r => r === 2).length,
        3: ratings.filter(r => r === 3).length,
        4: ratings.filter(r => r === 4).length,
        5: ratings.filter(r => r === 5).length,
      },
      average: ratings.length > 0 
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
        : null,
      rate4Plus: rating4PlusRate.toFixed(2),
    },
    clusterMatch: {
      count: clusterMatches,
      rate: clusterMatchRate.toFixed(2),
    },
    needsRefine: {
      count: needsRefineCount,
      rate: needsRefineRate.toFixed(2),
    },
    microNull: {
      count: microNullCount,
      totalDeep: deepSessions.length,
      rate: microNullRate.toFixed(2),
    },
    success,
    thresholds: {
      success: successThreshold,
      needsRefine: needsRefineThreshold,
      microNull: microNullThreshold,
    },
  };
}

/**
 * Task AJ4: Identify false positives
 * @param {Array} sessions - Array of session payloads with feedback
 * @returns {Array} Array of false positive cases
 */
function identifyFalsePositives(sessions) {
  const falsePositives = [];
  
  for (const session of sessions) {
    if (!session.feedback) continue;
    
    const rating = session.feedback.rating;
    const closestState = session.feedback.closestState;
    const baselineMacro = session.baselineOutput?.stateKey;
    const deepMacro = session.deepOutput?.stateKey || session.deepOutput?.macroKey;
    const finalMacro = deepMacro || baselineMacro;
    
    // False positive: low rating (< 4) and closest state is different
    if (rating < 4 && closestState && closestState !== finalMacro) {
      falsePositives.push({
        sessionId: session.id || session.ts,
        baselineMacro,
        deepMacro,
        finalMacro,
        closestState,
        rating,
        baselineInputs: session.baselineInputs,
        baselineOutput: session.baselineOutput,
        deepInputs: session.deepInputs,
        deepOutput: session.deepOutput,
        diagnostic: {
          // Common false positive patterns
          pattern: identifyFalsePositivePattern(session),
          axes: session.baselineInputs?.derivedLevels,
          evidenceTags: session.deepInputs?.evidenceTags || [],
        },
      });
    }
  }
  
  return falsePositives;
}

/**
 * Identify false positive pattern
 * @param {Object} session - Session payload
 * @returns {string} Pattern name
 */
function identifyFalsePositivePattern(session) {
  const baselineMacro = session.baselineOutput?.stateKey;
  const closestState = session.feedback?.closestState;
  const levels = session.baselineInputs?.derivedLevels;
  
  // Pattern 1: "User says exhausted + wants connection, system gives connected"
  if (baselineMacro === 'exhausted' && closestState === 'connected') {
    if (levels?.F_high || levels?.Ar_low) {
      return 'exhausted_wants_connection_but_connected_blocked';
    }
  }
  
  // Pattern 2: "User says overloaded, system gives pressured/exhausted"
  if (baselineMacro === 'overloaded' && 
      (closestState === 'pressured' || closestState === 'exhausted')) {
    return 'overloaded_misclassified_as_pressured_exhausted';
  }
  
  // Pattern 3: "User says pressured, system gives blocked"
  if (baselineMacro === 'pressured' && closestState === 'blocked') {
    return 'pressured_misclassified_as_blocked';
  }
  
  // Pattern 4: "User says grounded, system gives capable"
  if (baselineMacro === 'grounded' && closestState === 'capable') {
    return 'grounded_misclassified_as_capable';
  }
  
  return 'unknown_pattern';
}

/**
 * Generate report
 */
function generateReport(evaluation, falsePositives) {
  console.log('='.repeat(80));
  console.log('SESSION RESULTS ANALYSIS (Task AJ3 & AJ4)');
  console.log('='.repeat(80));
  console.log('');
  
  if (evaluation.error) {
    console.error(`❌ ${evaluation.error}`);
    return;
  }
  
  console.log(`Total sessions: ${evaluation.total}`);
  console.log('');
  
  // Task AJ3: Success metrics
  console.log('📊 SUCCESS METRICS (Task AJ3)');
  console.log('-'.repeat(80));
  console.log(`Rating ≥4 rate: ${evaluation.ratings.rate4Plus}% (threshold: ≥${evaluation.thresholds.success}%)`);
  console.log(`Cluster match rate: ${evaluation.clusterMatch.rate}%`);
  console.log(`NeedsRefine rate: ${evaluation.needsRefine.rate}% (threshold: ≤${evaluation.thresholds.needsRefine}%)`);
  console.log(`Micro null rate: ${evaluation.microNull.rate}% (threshold: ≤${evaluation.thresholds.microNull}%)`);
  console.log('');
  
  console.log('✅ SUCCESS CRITERIA:');
  console.log(`  Rating ≥4: ${evaluation.success.rating4Plus ? '✅' : '❌'}`);
  console.log(`  NeedsRefine: ${evaluation.success.needsRefine ? '✅' : '❌'}`);
  console.log(`  Micro null: ${evaluation.success.microNull ? '✅' : '❌'}`);
  console.log('');
  
  // Task AJ4: False positives
  console.log('🔍 FALSE POSITIVES (Task AJ4)');
  console.log('-'.repeat(80));
  console.log(`Total false positives: ${falsePositives.length}`);
  console.log('');
  
  if (falsePositives.length > 0) {
    // Group by pattern
    const byPattern = {};
    for (const fp of falsePositives) {
      const pattern = fp.diagnostic.pattern;
      if (!byPattern[pattern]) {
        byPattern[pattern] = [];
      }
      byPattern[pattern].push(fp);
    }
    
    console.log('Pattern breakdown:');
    for (const [pattern, cases] of Object.entries(byPattern)) {
      console.log(`  ${pattern}: ${cases.length} cases`);
    }
    console.log('');
    
    // Show top 5 examples
    console.log('Top 5 examples:');
    for (let i = 0; i < Math.min(5, falsePositives.length); i++) {
      const fp = falsePositives[i];
      console.log(`\n  ${i + 1}. ${fp.diagnostic.pattern}`);
      console.log(`     Baseline: ${fp.baselineMacro} → Final: ${fp.finalMacro}`);
      console.log(`     Closest: ${fp.closestState}, Rating: ${fp.rating}`);
      console.log(`     Axes: F_high=${fp.diagnostic.axes?.F_high}, T_high=${fp.diagnostic.axes?.T_high}, Vneg=${fp.diagnostic.axes?.Vneg}`);
      console.log(`     Evidence tags: ${fp.diagnostic.evidenceTags.slice(0, 3).join(', ')}...`);
    }
  } else {
    console.log('✅ No false positives detected!');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  const logPath = process.argv[2] || path.join(__dirname, '../telemetry.log');
  
  console.log(`Reading telemetry logs from: ${logPath}`);
  const sessions = parseTelemetryLogs(logPath);
  
  if (sessions.length === 0) {
    console.warn('No sessions found in log file. Run some sessions first to generate telemetry.');
    return;
  }
  
  const evaluation = evaluateSessionResults(sessions);
  const falsePositives = identifyFalsePositives(sessions);
  
  generateReport(evaluation, falsePositives);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
