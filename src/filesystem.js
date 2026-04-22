const fs = require('fs');
const os = require('os');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function detectTools(projectPath) {
  const tools = [];

  if (fs.existsSync(path.join(projectPath, '.claude')) || fs.existsSync(path.join(projectPath, 'CLAUDE.md'))) {
    tools.push('claude');
  }

  if (fs.existsSync(path.join(projectPath, '.cursor')) || fs.existsSync(path.join(projectPath, '.cursor', 'rules'))) {
    tools.push('cursor');
  }

  if (fs.existsSync(path.join(projectPath, '.agents')) || fs.existsSync(path.join(projectPath, 'AGENTS.md'))) {
    tools.push('codex');
  }

  return tools.length > 0 ? tools : ['claude', 'codex', 'cursor'];
}

function getTargetPath({ tool, scope, projectPath, packName }) {
  const homeDir = os.homedir();

  if (tool === 'codex') {
    return scope === 'global'
      ? path.join(homeDir, '.codex', 'AGENTS.md')
      : path.join(projectPath, 'AGENTS.md');
  }

  if (tool === 'claude') {
    return scope === 'global'
      ? path.join(homeDir, '.claude', 'CLAUDE.md')
      : path.join(projectPath, 'CLAUDE.md');
  }

  if (tool === 'cursor') {
    if (scope === 'global') {
      throw new Error('Cursor global rules are officially managed in Cursor Settings > Rules as plain text user rules. This CLI currently supports Cursor project rules only.');
    }

    return path.join(projectPath, '.cursor', 'rules', `consis-${packName}.mdc`);
  }

  throw new Error(`Unsupported tool: ${tool}`);
}

function getDocsSkillPath({ tool, scope, projectPath }) {
  const homeDir = os.homedir();

  if (tool === 'codex') {
    return scope === 'global'
      ? path.join(homeDir, '.agents', 'skills', 'ai-instructions', 'SKILL.md')
      : path.join(projectPath, '.agents', 'skills', 'ai-instructions', 'SKILL.md');
  }

  if (tool === 'claude') {
    return scope === 'global'
      ? path.join(homeDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')
      : path.join(projectPath, '.claude', 'skills', 'ai-instructions', 'SKILL.md');
  }

  return null;
}

function upsertManagedBlock(filePath, packName, content) {
  ensureDir(path.dirname(filePath));
  const startMarker = `<!-- consis-rules:start ${packName} -->`;
  const endMarker = `<!-- consis-rules:end ${packName} -->`;
  const block = `${startMarker}\n${content.trim()}\n${endMarker}\n`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n?`, 'g');

  if (pattern.test(current)) {
    const next = current.replace(pattern, block);
    fs.writeFileSync(filePath, normalizeTrailingNewline(next), 'utf8');
    return;
  }

  const separator = current.trim() ? '\n\n' : '';
  fs.writeFileSync(filePath, normalizeTrailingNewline(`${current.trimEnd()}${separator}${block}`), 'utf8');
}

function writeCursorFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTrailingNewline(value) {
  return `${value.trimEnd()}\n`;
}

module.exports = {
  detectTools,
  getTargetPath,
  getDocsSkillPath,
  upsertManagedBlock,
  writeCursorFile,
};
