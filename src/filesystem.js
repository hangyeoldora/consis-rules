const fs = require('fs');
const os = require('os');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function detectTool(projectPath) {
  if (fs.existsSync(path.join(projectPath, '.cursor')) || fs.existsSync(path.join(projectPath, '.cursor', 'rules'))) {
    return 'cursor';
  }

  if (fs.existsSync(path.join(projectPath, 'CLAUDE.md')) || fs.existsSync(path.join(projectPath, '.claude'))) {
    return 'claude';
  }

  return 'codex';
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
    return scope === 'global'
      ? path.join(homeDir, '.cursor', 'rules', `consis-${packName}.mdc`)
      : path.join(projectPath, '.cursor', 'rules', `consis-${packName}.mdc`);
  }

  throw new Error(`Unsupported tool: ${tool}`);
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
  detectTool,
  getTargetPath,
  upsertManagedBlock,
  writeCursorFile,
};

