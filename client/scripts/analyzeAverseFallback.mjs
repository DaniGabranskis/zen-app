// analyzeAverseFallback.mjs (Task P1.8)
// Analyzes fallback cases specifically for averse macro to identify missing tags
//
// Usage:
//   node scripts/analyzeAverseFallback.mjs --json scripts/out/deep_balance_noisy_mixed.json

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    jsonPath: path.join(__dirname, 'out', 'deep_balance_noisy_mixed.json'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && args[i + 1]) {
      config.jsonPath = args[i + 1];
      i++;
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();
  
  console.log('='.repeat(80));
  console.log('AVERSE FALLBACK ANALYZER (Task P1.8)');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Reading JSON: ${config.jsonPath}`);
  
  if (!fs.existsSync(config.jsonPath)) {
    console.error(`Error: File not found: ${config.jsonPath}`);
    console.error('Run checkDeepBalance.js first to generate the JSON file.');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(config.jsonPath, 'utf8'));
  
  // Load microEvidenceTags to check what tags are already defined
  const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
  
  // Get all averse micro keys and their evidence tags
  const averseMicros = ['averse.irritated', 'averse.angry', 'averse.disgust_avoid'];
  const averseEvidenceTags = {};
  const allAverseTags = new Set();
  
  for (const microKey of averseMicros) {
    const evidence = getMicroEvidenceTags(microKey);
    if (evidence) {
      averseEvidenceTags[microKey] = {
        mustHave: new Set(evidence.mustHave || []),
        supporting: new Set(evidence.supporting || []),
      };
      evidence.mustHave?.forEach(tag => allAverseTags.add(tag));
      evidence.supporting?.forEach(tag => allAverseTags.add(tag));
    }
  }
  
  // Extract averse fallback cases from the JSON
  // We need to reconstruct fallback cases from the data
  // Since the JSON doesn't store individual fallback cases, we'll work with fallbackTagsByMacro
  
  const averseFallbackTags = data.fallbackTagsByMacro?.averse || [];
  const averseFallbackCount = data.microFallbackByMacro?.averse || 0;
  
  console.log(`Averse fallback cases: ${averseFallbackCount}`);
  console.log(`Total tags in averse fallback: ${averseFallbackTags.length}`);
  console.log('');
  
  // Count tags in averse fallback cases
  const tagCounts = {};
  for (const tag of averseFallbackTags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  
  // Sort by count
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  console.log('Top 20 tags in averse fallback cases:');
  console.log('-'.repeat(80));
  topTags.forEach(([tag, count], idx) => {
    const percentage = ((count / averseFallbackCount) * 100).toFixed(2);
    const inMustHave = averseMicros.some(micro => averseEvidenceTags[micro]?.mustHave.has(tag));
    const inSupporting = averseMicros.some(micro => averseEvidenceTags[micro]?.supporting.has(tag));
    const status = inMustHave ? '✓ mustHave' : inSupporting ? '✓ supporting' : '✗ MISSING';
    console.log(`${(idx + 1).toString().padStart(2)}. ${tag.padEnd(40)} ${count.toString().padStart(4)} (${percentage.padStart(6)}%) ${status}`);
  });
  console.log('');
  
  // Identify missing tags (tags that appear in fallback but are not in any averse micro evidence)
  const missingTags = topTags
    .filter(([tag]) => !allAverseTags.has(tag))
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: ((count / averseFallbackCount) * 100).toFixed(2),
    }));
  
  console.log('='.repeat(80));
  console.log('MISSING TAGS ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Tags that appear in averse fallback but are NOT in any averse micro evidence:`);
  console.log(`(Total missing: ${missingTags.length} out of top 20)`);
  console.log('');
  
  if (missingTags.length > 0) {
    console.log('Missing tags → where to add:');
    console.log('-'.repeat(80));
    missingTags.forEach(({ tag, count, percentage }, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${tag.padEnd(40)} ${count.toString().padStart(4)} (${percentage.padStart(6)}%)`);
      console.log(`    → Recommended: Add to supporting for averse.irritated (safest averse micro)`);
    });
    console.log('');
    
    // Group by tag prefix for better recommendations
    const byPrefix = {};
    for (const { tag, count, percentage } of missingTags) {
      const prefix = tag.split('.').slice(0, 2).join('.');
      if (!byPrefix[prefix]) {
        byPrefix[prefix] = [];
      }
      byPrefix[prefix].push({ tag, count, percentage });
    }
    
    console.log('Missing tags grouped by prefix:');
    console.log('-'.repeat(80));
    Object.entries(byPrefix)
      .sort((a, b) => {
        const sumA = a[1].reduce((s, t) => s + parseInt(t.count), 0);
        const sumB = b[1].reduce((s, t) => s + parseInt(t.count), 0);
        return sumB - sumA;
      })
      .forEach(([prefix, tags]) => {
        const totalCount = tags.reduce((s, t) => s + parseInt(t.count), 0);
        const totalPct = ((totalCount / averseFallbackCount) * 100).toFixed(2);
        console.log(`${prefix}*: ${totalCount} occurrences (${totalPct}%)`);
        tags.forEach(({ tag, count, percentage }) => {
          console.log(`  - ${tag}: ${count} (${percentage}%)`);
        });
      });
  } else {
    console.log('✅ All top 20 tags are already covered in averse micro evidence!');
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('');
  
  if (missingTags.length > 0) {
    const topMissing = missingTags.slice(0, 5);
    console.log('Top 5 missing tags to add:');
    topMissing.forEach(({ tag, count, percentage }, idx) => {
      console.log(`${idx + 1}. ${tag} (${count} occurrences, ${percentage}%)`);
    });
    console.log('');
    console.log('Action: Add these tags to supporting array for averse.irritated in microEvidenceTags.js');
  } else {
    console.log('No immediate action needed - all top tags are covered.');
    console.log('Consider reviewing lower-frequency tags if fallback rate is still high.');
  }
  
  console.log('');
  console.log('✅ Analysis complete');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
