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
  assert.match(output, /\$react-ts/);
  assert.doesNotMatch(output, /# React \/ TypeScript 스택 표준/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'react-ts', 'SKILL.md')), true);
});

test('apply cursor project writes one file per pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-cursor-'));

  await run(['apply', 'docs', '--tool', 'cursor', '--scope', 'project', '--project-path', projectDir]);

  const outputPath = path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc');
  assert.equal(fs.existsSync(outputPath), true);
  const output = fs.readFileSync(outputPath, 'utf8');
  assert.match(output, /AI 지침 문서/);
});

test('apply without --tool defaults to claude only', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-default-'));

  await run(['apply', 'docs', '--scope', 'project', '--project-path', projectDir]);

  assert.equal(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc')), false);
});

test('apply spring alias resolves to spring-boot pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-spring-'));

  await run(['apply', 'spring', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /\$react-ts|# Consis Rules: spring-boot|Spring Boot/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'spring-boot', 'SKILL.md')), true);
});

test('auto mode adds docs but not common for default claude target', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-auto-'));

  await run(['react-ts', '--auto', '--project-path', projectDir]);

  const claudeOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeOutput, /consis-rules:start react-ts/);
  assert.match(claudeOutput, /consis-rules:start docs/);
  assert.doesNotMatch(claudeOutput, /consis-rules:start common/);
  assert.match(claudeOutput, /\/ai-instructions/);
  assert.match(claudeOutput, /\/react-ts/);
  assert.doesNotMatch(claudeOutput, /# React \/ TypeScript 스택 표준/);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'react-ts', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);
});

test('auto mode with codex writes codex docs hint and skill file', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consis-rules-auto-codex-'));

  await run(['apply', 'spring', '--auto', '--tool', 'codex', '--project-path', projectDir]);

  const agentsOutput = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(agentsOutput, /consis-rules:start spring-boot/);
  assert.match(agentsOutput, /consis-rules:start docs/);
  assert.match(agentsOutput, /\$ai-instructions/);
  assert.doesNotMatch(agentsOutput, /# Spring Boot Architecture/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'spring-boot', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'ai-instructions', 'SKILL.md')), true);
});
