const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { run } = require('../src/cli');

test('apply codex project writes AGENTS.md managed blocks', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-project-'));

  await run(['apply', 'common', 'react-ts', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /consis-rules:start common/);
  assert.match(output, /consis-rules:start react-ts/);
});

test('apply cursor project writes one file per pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-cursor-'));

  await run(['apply', 'docs', '--tool', 'cursor', '--scope', 'project', '--project-path', projectDir]);

  const outputPath = path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc');
  assert.equal(fs.existsSync(outputPath), true);
  const output = fs.readFileSync(outputPath, 'utf8');
  assert.match(output, /AI 지침 문서/);
});

test('apply without --tool writes docs to claude, codex, and cursor targets', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-all-tools-'));

  await run(['apply', 'docs', '--scope', 'project', '--project-path', projectDir]);

  assert.equal(fs.existsSync(path.join(projectDir, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'ai-instructions', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);
});

test('apply spring alias resolves to spring-boot pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-spring-'));

  await run(['apply', 'spring', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /Spring Boot/);
});
