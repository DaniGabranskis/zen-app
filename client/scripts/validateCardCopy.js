#!/usr/bin/env node
/**
 * Validates card copy length constraints:
 * - title <= 15 characters
 * - options[0].label <= 15 characters
 * - options[1].label <= 15 characters
 * - hint is required and not empty (error)
 * - hint.length > 80 (warning only)
 */

const fs = require('fs');
const path = require('path');

const MAX_TITLE_LENGTH = 15;
const MAX_LABEL_LENGTH = 15;
const WARN_HINT_LENGTH = 80;

const L1_PATH = path.join(__dirname, '../src/data/flow/L1.json');
const L2_PATH = path.join(__dirname, '../src/data/flow/L2.json');

function validateCard(card, filePath) {
  const errors = [];
  const warnings = [];

  // Validate title
  if (!card.title || typeof card.title !== 'string') {
    errors.push({
      cardId: card.id || 'unknown',
      field: 'title',
      issue: 'missing or invalid',
      value: card.title,
    });
  } else if (card.title.length > MAX_TITLE_LENGTH) {
    errors.push({
      cardId: card.id || 'unknown',
      field: 'title',
      issue: `exceeds ${MAX_TITLE_LENGTH} characters`,
      length: card.title.length,
      value: card.title,
    });
  }

  // Validate hint (required, not empty)
  if (!card.hint || typeof card.hint !== 'string' || card.hint.trim().length === 0) {
    errors.push({
      cardId: card.id || 'unknown',
      field: 'hint',
      issue: 'missing or empty (required)',
      value: card.hint || '(missing)',
    });
  } else if (card.hint.length > WARN_HINT_LENGTH) {
    // Warning if too long (but still valid)
    warnings.push({
      cardId: card.id || 'unknown',
      field: 'hint',
      issue: `exceeds ${WARN_HINT_LENGTH} characters (warning only)`,
      length: card.hint.length,
      value: card.hint.substring(0, 60) + '...',
    });
  }

  // Validate options
  if (!Array.isArray(card.options) || card.options.length < 2) {
    errors.push({
      cardId: card.id || 'unknown',
      field: 'options',
      issue: 'missing or invalid (need at least 2 options)',
      value: card.options,
    });
  } else {
    card.options.forEach((opt, idx) => {
      if (!opt.label || typeof opt.label !== 'string') {
        errors.push({
          cardId: card.id || 'unknown',
          field: `options[${idx}].label`,
          issue: 'missing or invalid',
          value: opt.label,
        });
      } else if (opt.label.length > MAX_LABEL_LENGTH) {
        errors.push({
          cardId: card.id || 'unknown',
          field: `options[${idx}].label`,
          issue: `exceeds ${MAX_LABEL_LENGTH} characters`,
          length: opt.label.length,
          value: opt.label,
        });
      }
    });
  }

  return { errors, warnings };
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const cards = JSON.parse(content);

  if (!Array.isArray(cards)) {
    console.error(`[ERROR] ${filePath}: Expected array, got ${typeof cards}`);
    return { errors: [{ file: filePath, issue: 'Invalid JSON structure' }], warnings: [] };
  }

  const allErrors = [];
  const allWarnings = [];

  cards.forEach((card) => {
    const { errors, warnings } = validateCard(card, filePath);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  });

  return { errors: allErrors, warnings: allWarnings };
}

// Main
console.log('Validating card copy length constraints...\n');

const l1Result = validateFile(L1_PATH);
const l2Result = validateFile(L2_PATH);

const allErrors = [...l1Result.errors, ...l2Result.errors];
const allWarnings = [...l1Result.warnings, ...l2Result.warnings];

// Print warnings
if (allWarnings.length > 0) {
  console.log('⚠️  Warnings:');
  allWarnings.forEach((w) => {
    console.log(`  [${w.cardId}] ${w.field}: ${w.issue}`);
    console.log(`    Length: ${w.length}, Value: ${w.value}`);
  });
  console.log('');
}

// Print errors
if (allErrors.length > 0) {
  console.log('❌ Errors:');
  allErrors.forEach((e) => {
    console.log(`  [${e.cardId}] ${e.field}: ${e.issue}`);
    if (e.length !== undefined) {
      console.log(`    Length: ${e.length}, Max: ${e.field.includes('label') ? MAX_LABEL_LENGTH : MAX_TITLE_LENGTH}`);
    }
    console.log(`    Value: "${e.value}"`);
  });
  console.log('');
  console.log(`Total: ${allErrors.length} error(s), ${allWarnings.length} warning(s)`);
  process.exit(1);
}

// Success
console.log('✅ All cards pass validation!');
if (allWarnings.length > 0) {
  console.log(`   (${allWarnings.length} warning(s) - check above)`);
}
process.exit(0);
