#!/usr/bin/env node
/**
 * Hygiene check: Ensure no legacy deepEngine imports in deep screens
 * Only checks for actual import statements, ignores comments
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENS_TO_CHECK = [
  path.join(__dirname, '..', 'src', 'screens', 'DiagnosticFlowScreen.js'),
  path.join(__dirname, '..', 'src', 'screens', 'ReflectionFlowScreen.js'),
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip comment lines (single-line comments)
    if (/^\s*\/\//.test(line)) continue;
    
    // Skip multi-line comment blocks
    if (/^\s*\/\*/.test(line)) {
      // Find the end of the comment block
      let j = i;
      while (j < lines.length && !lines[j].includes('*/')) {
        j++;
      }
      i = j;
      continue;
    }
    
    // Check if line contains both 'import'/'from' and 'utils/deepEngine'
    if (/import|from/.test(line) && /utils\/deepEngine/.test(line)) {
      violations.push({
        file: path.basename(filePath),
        line: lineNum,
        content: line.trim(),
      });
    }
  }
  
  return violations;
}

function main() {
  let allViolations = [];
  
  for (const filePath of SCREENS_TO_CHECK) {
    try {
      const violations = checkFile(filePath);
      allViolations.push(...violations);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`⚠️  File not found: ${filePath}`);
        continue;
      }
      throw error;
    }
  }
  
  if (allViolations.length > 0) {
    console.error('❌ Legacy deepEngine import detected in deep screens:');
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line}: ${v.content}`);
    }
    console.error('Deep screens must use adapter only, not legacy deepEngine');
    process.exit(1);
  }
  
  console.log('✅ No legacy deepEngine imports found in deep screens');
}

main();
