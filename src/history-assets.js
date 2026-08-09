const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CONFIG = {
  model: 'sonnet',
  maxTurns: 3,
  historyFile: '.history/project.history.md',
  readmeFile: 'README.md',
  blockedBranches: ['main', 'master'],
  maxDiffBytes: 500000,
  maxFileDiffBytes: 100000,
};

const HISTORY_ROUTING_EXCLUDED_DIRS = new Set([
  '.git',
  '.history',
  '.claude',
  '.agents',
  '.cursor',
  'target',
  'build',
  'dist',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.venv',
  'venv',
  'node_modules',
  '.pytest_cache',
  '.ruff_cache',
  '__pycache__',
  'generated',
  'tmp',
  'temp',
]);

const PRE_COMMIT = `#!/bin/sh
# consis-history:managed v1
set -eu

repo_root="$(git rev-parse --show-toplevel)"

if [ "\${HISTORY_DISABLE:-}" = "1" ]; then
  echo "[history] hook disabled by HISTORY_DISABLE=1"
  exit 0
fi

branch="$(git branch --show-current)"
case "$branch" in
  main|master)
    echo "[consis-history] $branch 브랜치 직접 커밋은 허용하지 않습니다." >&2
    exit 1
    ;;
esac

node "$repo_root/scripts/consis-history.js"
`;

const GENERATOR = String.raw`#!/usr/bin/env node
// consis-history:managed v1
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

let root = process.cwd();

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'git 명령 실패').trim());
  }
  return result.stdout.trim();
}

function gitOptional(args, fallback = '') {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) return fallback;
  return result.stdout.trim() || fallback;
}

function hasUnstagedChanges(file) {
  const result = spawnSync('git', ['diff', '--quiet', '--', file], {
    cwd: root,
    encoding: 'utf8',
  });
  return result.status === 1;
}

function formatAuthor(name, email) {
  if (name) return name;
  if (email) return email;
  return 'Unknown';
}

const HISTORY_ROUTING_EXCLUDED_DIRS = new Set([
  '.git',
  '.history',
  '.claude',
  '.agents',
  '.cursor',
  'target',
  'build',
  'dist',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.venv',
  'venv',
  'node_modules',
  '.pytest_cache',
  '.ruff_cache',
  '__pycache__',
  'generated',
  'tmp',
  'temp',
]);

function normalizeClassification(value) {
  const allowed = new Set(['feat', 'fix', 'style', 'docs', 'chore', 'refactor', 'perf', 'security', 'ci', 'build', 'other']);
  return allowed.has(value) ? value : 'other';
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const allowedKeys = new Set([
    'HISTORY_DISABLE',
    'HISTORY_AI_TOOL',
    'HISTORY_AI_MODEL',
    'HISTORY_CLAUDE_MODEL',
    'HISTORY_ON_ERROR',
  ]);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (!allowedKeys.has(key)) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readFile(file, fallback = '') {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.consis-tmp';
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, file);
}

function insertHistory(existing, date, entry) {
  const normalizedEntry = entry.trim();
  const dateHeading = '## ' + date;
  const dateIndex = existing.indexOf(dateHeading);

  if (dateIndex !== -1) {
    const insertion = dateIndex + dateHeading.length;
    return existing.slice(0, insertion) + '\n\n' + normalizedEntry + existing.slice(insertion);
  }

  const separatorMatch = /^---\s*$/m.exec(existing);
  const separator = separatorMatch ? separatorMatch.index : -1;
  const block = dateHeading + '\n\n' + normalizedEntry + '\n\n---';
  if (separator === -1) {
    const prefix = existing.trimEnd();
    return (prefix ? prefix + '\n\n---\n\n' : '') + block + '\n';
  }
  const insertion = separator + 3;
  return existing.slice(0, insertion) + '\n\n' + block + existing.slice(insertion);
}

function insertReadme(existing, entry) {
  const start = '<!-- consis-history:start -->';
  const end = '<!-- consis-history:end -->';
  const block = start + '\n' + entry + '\n' + end;
  const startIndex = existing.indexOf(start);
  const endIndex = existing.indexOf(end);

  if (startIndex !== -1 && endIndex > startIndex) {
    const current = existing.slice(startIndex + start.length, endIndex).trim();
    return existing.slice(0, startIndex) + start + '\n' + entry + (current ? '\n\n' + current : '') + '\n' + existing.slice(endIndex);
  }

  return existing.trimEnd() + '\n\n## \uBCC0\uACBD \uD788\uC2A4\uD1A0\uB9AC\n\n' + block + '\n';
}

function renderReadmeEntry({ scope, title, date, author, bullets, link }) {
  return [
    '### [' + scope + '] ' + title + ' - ' + date,
    '',
    '- \uC791\uC5C5\uC790: ' + author,
    ...bullets.map((item) => '- ' + item),
    '- [\uC0C1\uC138 \uBCC0\uACBD \uB0B4\uC6A9](' + link.replace(/\\/g, '/') + ')',
  ].join('\n');
}

function openTty() {
  for (const device of ['/dev/tty', 'CON']) {
    try {
      return fs.openSync(device, 'r+');
    } catch {
      // Try the next platform-specific terminal device.
    }
  }
  return null;
}

function ttyWrite(fd, text) {
  fs.writeSync(fd, text);
}

function ttyReadLine(fd) {
  const chunks = [];
  const buffer = Buffer.alloc(1);
  while (true) {
    const read = fs.readSync(fd, buffer, 0, 1, null);
    if (read === 0) break;
    const byte = buffer[0];
    if (byte === 10) break;
    if (byte !== 13) chunks.push(byte);
  }
  return Buffer.from(chunks).toString('utf8').trim();
}

function askHistoryFailureAction(message) {
  if (process.env.HISTORY_ON_ERROR) return process.env.HISTORY_ON_ERROR;
  const tty = openTty();
  if (tty === null) return 'abort';
  try {
    ttyWrite(tty, '\n[consis-history] ' + message + '\n');
    ttyWrite(tty, '[c] history 없이 커밋 계속 / [m] 직접 history 작성 / [a] 커밋 중단 (default: a): ');
    const answer = ttyReadLine(tty).toLowerCase();
    if (answer === 'c' || answer === 'continue' || answer === 'y' || answer === 'yes') return 'continue';
    if (answer === 'm' || answer === 'manual' || answer === 'write' || answer === 'w') return 'manual';
    return 'abort';
  } finally {
    fs.closeSync(tty);
  }
}

function globToRegExp(glob) {
  let regex = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (glob.slice(i, i + 3) === '**/') {
      regex += '(?:.*/)?';
      i += 2;
    } else if (glob.slice(i, i + 2) === '**') {
      regex += '.*';
      i += 1;
    } else if (char === '*') {
      regex += '[^/]*';
    } else if (/[.+^\${}()|[\]\\]/.test(char)) {
      regex += '\\' + char;
    } else {
      regex += char;
    }
  }
  return new RegExp('^' + regex + '$');
}

function resolveHistoryFile(files, cfg) {
  const routing = cfg.historyRouting || {};
  const entries = Object.entries(routing).filter(([pattern]) => pattern !== 'default');
  if (entries.length === 0) return cfg.historyFile;

  const scores = new Map();
  const unmatchedFiles = [];
  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    let matched = false;
    for (const [pattern, target] of entries) {
      if (globToRegExp(pattern).test(normalized)) {
        scores.set(target, (scores.get(target) || 0) + 1);
        matched = true;
        break;
      }
    }
    if (!matched) unmatchedFiles.push(normalized);
  }

  if (scores.size === 0) return routing.default || cfg.historyFile;
  const onlyMetaTargets = [...scores.keys()].every((target) =>
    target === '.history/docs.history.md' || target === '.history/history.history.md');
  if (onlyMetaTargets && unmatchedFiles.length > 0) {
    return routing.default || cfg.historyFile;
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
    return routing.default || cfg.historyFile;
  }
  return ranked[0][0];
}

function isGeneratedHistoryOutput(file, cfg, includeReadme = true) {
  const normalized = file.replace(/\\/g, '/');
  const readme = (cfg.readmeFile || 'README.md').replace(/\\/g, '/');
  const generatedTargets = new Set([
    (cfg.historyFile || '.history/project.history.md').replace(/\\/g, '/'),
    ...Object.values(cfg.historyRouting || {}).map((target) => String(target).replace(/\\/g, '/')),
  ]);
  if (normalized.startsWith('.history/')) return true;
  if (generatedTargets.has(normalized)) return true;
  return includeReadme && normalized === readme;
}

function isHistorySystemInput(file) {
  const normalized = file.replace(/\\/g, '/');
  return normalized === '.consis-history.json'
    || normalized === '.env.example'
    || normalized === 'scripts/consis-history.js'
    || normalized.startsWith('.githooks/');
}

function toHistoryName(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'common';
}

function listSubdirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !HISTORY_ROUTING_EXCLUDED_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function readGitignoreExcludedDirs(rootPath) {
  const gitignorePath = path.join(rootPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return new Set();
  const lines = fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/);
  const dirs = new Set();
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    if (line.includes('*')) continue;
    const normalized = line.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized || normalized.includes('/')) continue;
    dirs.add(normalized);
  }
  return dirs;
}

function addRouting(routing, pattern, historyName) {
  if (!routing[pattern]) routing[pattern] = '.history/' + toHistoryName(historyName) + '.history.md';
}

function readReadmeText(rootPath) {
  for (const name of ['README.md', 'readme.md', 'README.MD']) {
    const readmePath = path.join(rootPath, name);
    if (fs.existsSync(readmePath)) return fs.readFileSync(readmePath, 'utf8');
  }
  return '';
}

function addRoutingIfExists(routing, rootPath, relativePattern, historyName) {
  if (['src/main/**', 'app/**', 'src/**'].includes(relativePattern)) return;
  const base = relativePattern.replace(/\/\*\*$/, '').replace(/\*.*$/, '');
  if (fs.existsSync(path.join(rootPath, ...base.split('/')))) {
    addRouting(routing, relativePattern, historyName);
  }
}

function historyNameForFeature(feature) {
  if (feature === 'multiagent' || feature === 'multi_agent') return 'multi-agent';
  if (feature === 'recommendquest') return 'recommend';
  return feature;
}

function addReadmeMentionedRouting(routing, rootPath, readmeText, candidates) {
  if (!readmeText) return;
  const lowerReadme = readmeText.toLowerCase();
  for (const candidate of candidates) {
    const name = candidate.name;
    if (!lowerReadme.includes(name.toLowerCase())) continue;
    for (const pattern of candidate.patterns) {
      addRoutingIfExists(routing, rootPath, pattern, historyNameForFeature(name));
    }
  }
}

function addFrontendFeatureRouting(routing, rootPath, isIgnoredDir) {
  if (isIgnoredDir('src') || !fs.existsSync(path.join(rootPath, 'src'))) return;

  const addFeatureDirs = (relativeDir) => {
    const absoluteDir = path.join(rootPath, ...relativeDir.split('/'));
    for (const name of listSubdirectories(absoluteDir)) {
      if (!isIgnoredDir(name) && name !== 'common') {
        addRouting(routing, relativeDir + '/' + name + '/**', historyNameForFeature(name));
      }
    }
  };

  addFeatureDirs('src/pages');
  addFeatureDirs('src/hooks');
  addFeatureDirs('src/types');
  addFeatureDirs('src/utils');
  addFeatureDirs('src/components/sections');

  for (const file of fs.existsSync(path.join(rootPath, 'src', 'apis')) ? fs.readdirSync(path.join(rootPath, 'src', 'apis')) : []) {
    const match = file.match(/^([A-Za-z0-9_-]+)Api\.(?:ts|tsx|js|jsx)$/);
    if (match) addRouting(routing, 'src/apis/' + file, historyNameForFeature(match[1]));
  }

  if (fs.existsSync(path.join(rootPath, 'src', 'components', 'ChatPanel.tsx'))) {
    addRouting(routing, 'src/components/ChatPanel.tsx', 'chat');
  }
  if (fs.existsSync(path.join(rootPath, 'src', 'components', 'ui', 'MessageBubble.tsx'))) {
    addRouting(routing, 'src/components/ui/MessageBubble.tsx', 'chat');
  }
}

function addSpringBootFeatureRouting(routing, rootPath, isIgnoredDir, readmeText) {
  const javaRoot = path.join(rootPath, 'src', 'main', 'java');
  if (isIgnoredDir('src') || !fs.existsSync(javaRoot)) return;

  addRouting(routing, 'src/main/java/**/agent/**', 'agent');
  for (const feature of ['multi_agent', 'multiagent']) {
    addRouting(routing, 'src/main/java/**/' + feature + '/**', 'multi-agent');
  }
  addRouting(routing, 'src/main/java/**/integration/**', 'integrations');
  addRouting(routing, 'src/main/java/**/integrations/**', 'integrations');
  for (const feature of ['voc', 'utterance', 'recommendquest', 'recommend', 'approval', 'share', 'settings', 'notification', 'answerfeedback']) {
    addRouting(routing, 'src/main/java/**/' + feature + '/**', historyNameForFeature(feature));
  }

  const candidates = [];
  const stack = [javaRoot];
  const javaRootDepth = path.relative(rootPath, javaRoot).replace(/\\/g, '/').split('/').length;
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || isIgnoredDir(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      const relative = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      const depth = relative.split('/').length;
      if (depth >= javaRootDepth + 4 && entry.name !== 'common') {
        candidates.push({ name: entry.name, patterns: [relative + '/**'] });
      }
      if (depth < javaRootDepth + 4) stack.push(fullPath);
    }
  }
  addReadmeMentionedRouting(routing, rootPath, readmeText, candidates);
}

function addPythonFeatureRouting(routing, rootPath, isIgnoredDir, readmeText) {
  if (fs.existsSync(path.join(rootPath, 'src', 'main', 'java'))) return;
  const candidates = [];
  const topLevelDirs = listSubdirectories(rootPath)
    .filter((name) => !isIgnoredDir(name) && !['app', 'src', 'docs', 'tests', 'test', 'scripts'].includes(name));
  for (const name of topLevelDirs) {
    if (fs.existsSync(path.join(rootPath, name, '__init__.py')) || fs.existsSync(path.join(rootPath, name, 'pyproject.toml'))) {
      addRouting(routing, name + '/**', historyNameForFeature(name));
      candidates.push({ name, patterns: [name + '/**'] });
    }
  }
  for (const parent of ['app', 'src']) {
    const parentPath = path.join(rootPath, parent);
    if (!isIgnoredDir(parent) && fs.existsSync(parentPath)) {
      for (const name of listSubdirectories(parentPath).filter((entry) => !isIgnoredDir(entry) && entry !== 'common')) {
        if (parent === 'app' && name === 'domains') continue;
        addRouting(routing, parent + '/' + name + '/**', historyNameForFeature(name));
        candidates.push({ name, patterns: [parent + '/' + name + '/**'] });
      }
    }
  }
  addReadmeMentionedRouting(routing, rootPath, readmeText, candidates);
  if (fs.existsSync(path.join(rootPath, 'tests'))) addRouting(routing, 'tests/**', 'test');
}

function inferHistoryRouting(rootPath) {
  const routing = {};
  const gitignoreExcludedDirs = readGitignoreExcludedDirs(rootPath);
  const isIgnoredDir = (name) => HISTORY_ROUTING_EXCLUDED_DIRS.has(name) || gitignoreExcludedDirs.has(name);
  const readmeText = readReadmeText(rootPath);

  if (!isIgnoredDir('app') && fs.existsSync(path.join(rootPath, 'app', 'multi_agent'))) {
    addRouting(routing, 'app/multi_agent/**', 'multi-agent');
  }
  if (!isIgnoredDir('app') && fs.existsSync(path.join(rootPath, 'app', 'integrations'))) {
    addRouting(routing, 'app/integrations/**', 'integrations');
  }
  for (const domain of listSubdirectories(path.join(rootPath, 'app', 'domains')).filter((name) => !isIgnoredDir(name))) {
    addRouting(routing, 'app/domains/' + domain + '/**', domain);
  }

  addSpringBootFeatureRouting(routing, rootPath, isIgnoredDir, readmeText);
  addPythonFeatureRouting(routing, rootPath, isIgnoredDir, readmeText);

  if (!isIgnoredDir('test') && fs.existsSync(path.join(rootPath, 'test'))) addRouting(routing, 'test/**', 'test');
  if (!isIgnoredDir('src') && fs.existsSync(path.join(rootPath, 'src', 'test'))) addRouting(routing, 'src/test/**', 'test');
  addFrontendFeatureRouting(routing, rootPath, isIgnoredDir);
  if (!isIgnoredDir('src') && fs.existsSync(path.join(rootPath, 'src'))) addRouting(routing, 'src/**', 'source');

  addRouting(routing, 'README.md', 'docs');
  addRouting(routing, 'CLAUDE.md', 'docs');
  addRouting(routing, 'AGENTS.md', 'docs');
  addRouting(routing, '.claude/**', 'docs');
  addRouting(routing, '.agents/**', 'docs');
  addRouting(routing, '.cursor/**', 'docs');
  addRouting(routing, '.env.example', 'history');
  addRouting(routing, '.githooks/**', 'history');
  addRouting(routing, 'scripts/consis-history.js', 'history');
  addRouting(routing, '.consis-history.json', 'history');
  routing.default = '.history/project.history.md';

  return routing;
}

function ensureHistoryRouting(cfg) {
  const configPath = path.join(root, '.consis-history.json');
  const hasRouting = cfg.historyRouting && Object.keys(cfg.historyRouting).length > 0;
  let changed = false;
  if (cfg.historyFile === '.history/common.history.md') {
    cfg.historyFile = '.history/project.history.md';
    changed = true;
  }
  if (!hasRouting) {
    cfg.historyRouting = inferHistoryRouting(root);
    changed = true;
  } else {
    const inferredRouting = inferHistoryRouting(root);
    for (const [pattern, target] of Object.entries(inferredRouting)) {
      if (!cfg.historyRouting[pattern]) {
        cfg.historyRouting[pattern] = target;
        changed = true;
      }
    }
    if (!cfg.historyRouting.default) {
      cfg.historyRouting.default = cfg.historyFile || '.history/project.history.md';
      changed = true;
    }
  }
  if (cfg.historyRouting && cfg.historyRouting.default === '.history/common.history.md') {
    cfg.historyRouting.default = '.history/project.history.md';
    changed = true;
  }
  if (cfg.historyRouting && !cfg.historyRouting['.env.example']) {
    cfg.historyRouting['.env.example'] = '.history/history.history.md';
    changed = true;
  }
  if (
    cfg.historyRouting
    && cfg.historyRouting['src/main/java/**/agent/**'] === '.history/multi-agent.history.md'
  ) {
    cfg.historyRouting['src/main/java/**/agent/**'] = '.history/agent.history.md';
    changed = true;
  }
  if (changed) {
    if (hasUnstagedChanges('.consis-history.json')) {
      console.error('[consis-history] .consis-history.json에 커밋 대상이 아닌 수정이 있어 자동 라우팅 보정을 중단합니다.');
      console.error('[consis-history] 해당 파일을 먼저 stage 하거나 정리한 뒤 다시 커밋하세요.');
      process.exit(1);
    }
    writeAtomic(configPath, JSON.stringify(cfg, null, 2) + '\n');
    git(['add', '--', '.consis-history.json']);
  }
}

root = git(['rev-parse', '--show-toplevel']);
loadDotEnv(path.join(root, '.env'));
if (process.env.HISTORY_DISABLE === '1') {
  console.log('[history] hook disabled by HISTORY_DISABLE=1');
  process.exit(0);
}
const config = {
  model: 'sonnet',
  maxTurns: 3,
  historyFile: '.history/project.history.md',
  readmeFile: 'README.md',
  maxDiffBytes: 500000,
  maxFileDiffBytes: 100000,
  ...readJson(path.join(root, '.consis-history.json'), {}),
};
const originalStagedFiles = git(['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
ensureHistoryRouting(config);
const readmePath = (config.readmeFile || 'README.md').replace(/\\/g, '/');
const hasNonReadmeSourceFiles = originalStagedFiles.some((file) => {
  const normalized = file.replace(/\\/g, '/');
  return normalized !== readmePath
    && !isHistorySystemInput(normalized)
    && !isGeneratedHistoryOutput(file, config, false);
});
const allStagedFilesForRouting = originalStagedFiles.filter((file) =>
  !isGeneratedHistoryOutput(file, config, hasNonReadmeSourceFiles)
  && !(hasNonReadmeSourceFiles && isHistorySystemInput(file)));
if (originalStagedFiles.length > 0 && allStagedFilesForRouting.length === 0) {
  console.log('[consis-history] 자동 생성된 README/history 결과물만 변경되어 생성을 건너뜁니다.');
  process.exit(0);
}
config.historyFile = resolveHistoryFile(allStagedFilesForRouting, config);
const excluded = Array.from(new Set([
  config.historyFile,
  '.history/**',
  ...Object.values(config.historyRouting || {}),
  ...(hasNonReadmeSourceFiles ? [config.readmeFile] : []),
]));
const stagedFileOutput = git(['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '-z', '--', '.', ...excluded.map((file) => ':(exclude)' + file)]);
const stagedFileList = stagedFileOutput.split('\0').filter(Boolean);
if (stagedFileList.length === 0) process.exit(0);
const stagedFiles = stagedFileList.join('\n');
const omittedDiffFiles = [];
const includedDiffChunks = [];
let includedDiffBytes = 0;
for (const file of stagedFileList) {
  const fileStats = git(['diff', '--cached', '--numstat', '--', file]);
  if (fileStats.startsWith('-\t-\t')) {
    omittedDiffFiles.push(file + ' (binary)');
    continue;
  }
  const fileDiff = git(['diff', '--cached', '--no-ext-diff', '--unified=3', '--', file]);
  const fileDiffBytes = Buffer.byteLength(fileDiff, 'utf8');
  if (
    fileDiffBytes > config.maxFileDiffBytes
    || includedDiffBytes + fileDiffBytes > config.maxDiffBytes
  ) {
    omittedDiffFiles.push(file + ' (large diff)');
    continue;
  }
  includedDiffChunks.push(fileDiff);
  includedDiffBytes += fileDiffBytes;
}
const stagedDiff = includedDiffChunks.filter(Boolean).join('\n');
const sensitivePathPatterns = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(?:id_rsa|id_ed25519|credentials|secrets?)(?:\.|$)/i,
  /\.(?:pem|key|p12|pfx)$/i,
];
const allowedSensitiveExamples = [/(^|\/)\.env\.(?:example|sample|template)$/i];
const sensitiveFiles = stagedFileList.filter((file) =>
  sensitivePathPatterns.some((pattern) => pattern.test(file))
  && !allowedSensitiveExamples.some((pattern) => pattern.test(file)));
const sensitiveContentPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[opusr]_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\bnpm_[A-Za-z0-9]{20,}\b/,
];
const sensitiveGrepPatterns = [
  '-----BEGIN [A-Z ]*PRIVATE KEY-----',
  'AKIA[0-9A-Z]{16}',
  'gh[opusr]_[A-Za-z0-9_]{20,}',
  'xox[baprs]-[A-Za-z0-9-]{10,}',
  'npm_[A-Za-z0-9]{20,}',
];
const grepResult = spawnSync('git', [
  'grep', '--cached', '-I', '-l', '-E',
  ...sensitiveGrepPatterns.flatMap((pattern) => ['-e', pattern]),
  '--', '.', ...excluded.map((file) => ':(exclude)' + file),
], {
  cwd: root,
  encoding: 'utf8',
});
if (grepResult.status !== 0 && grepResult.status !== 1) {
  throw new Error((grepResult.stderr || grepResult.stdout || 'staged 민감정보 검사 실패').trim());
}
const sensitiveContentFiles = grepResult.status === 0
  ? grepResult.stdout.trim().split(/\r?\n/).filter(Boolean)
  : [];
if (
  sensitiveFiles.length > 0
  || sensitiveContentFiles.length > 0
  || sensitiveContentPatterns.some((pattern) => pattern.test(stagedDiff))
) {
  console.error('[consis-history] 민감정보 가능성이 있는 staged 변경을 감지해 Claude 전송과 커밋을 중단했습니다.');
  const filesToReview = Array.from(new Set([...sensitiveFiles, ...sensitiveContentFiles]));
  if (filesToReview.length > 0) {
    console.error('[consis-history] 확인할 파일: ' + filesToReview.join(', '));
  }
  process.exit(1);
}
const stagedIdentity = git(['diff', '--cached', '--raw', '--', '.', ...excluded.map((file) => ':(exclude)' + file)]);
const sourceHash = crypto.createHash('sha256').update(stagedIdentity).digest('hex');
const stateFile = path.join(root, '.git', 'consis-history-state.json');
const previousState = readJson(stateFile, {});
const allStagedFiles = git(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
if (
  previousState.sourceHash === sourceHash
  && fs.existsSync(path.join(root, config.readmeFile))
  && fs.existsSync(path.join(root, config.historyFile))
  && allStagedFiles.includes(config.readmeFile)
  && allStagedFiles.includes(config.historyFile)
) {
  process.exit(0);
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const versionFile = readJson(path.join(root, 'package.json'), {});
const version = versionFile.version ? 'v' + versionFile.version : 'none';
const authorName = gitOptional(['config', 'user.name']);
const authorEmail = gitOptional(['config', 'user.email']);
const author = formatAuthor(authorName, authorEmail);
const branch = git(['branch', '--show-current']);
const aiTool = (process.env.HISTORY_AI_TOOL || 'claude').toLowerCase();
const model = process.env.HISTORY_AI_MODEL || process.env.HISTORY_CLAUDE_MODEL || (aiTool === 'codex' ? '' : config.model);
const historyPath = path.join(root, config.historyFile);
const existingHistory = readFile(historyPath);

function persistGeneratedHistory(generated) {
  const history = insertHistory(existingHistory, date, generated.historyEntryMarkdown);
  const classification = normalizeClassification(generated.classification);
  const readmePath = path.join(root, config.readmeFile);
  const readme = insertReadme(
    readFile(readmePath),
    renderReadmeEntry({
      scope: classification,
      title: generated.title,
      date,
      author,
      bullets: generated.readmeBullets.slice(0, 2),
      link: config.historyFile,
    }),
  );
  writeAtomic(historyPath, history);
  writeAtomic(readmePath, readme);
  git(['add', '--', config.readmeFile, config.historyFile]);
  fs.writeFileSync(stateFile, JSON.stringify({ sourceHash, generatedAt: now.toISOString() }, null, 2) + '\n', 'utf8');
  console.log('[consis-history] README와 상세 변경 이력을 현재 커밋에 추가했습니다.');
}

function manualHistoryEntry() {
  const tty = openTty();
  if (tty === null) return null;
  try {
    ttyWrite(tty, '\n[consis-history] 직접 변경 이력을 작성합니다.\n');
    ttyWrite(tty, '제목: ');
    const title = ttyReadLine(tty);
    ttyWrite(tty, '요약 1줄: ');
    const summary = ttyReadLine(tty);
    if (!title || !summary) return null;
    return {
      title,
      readmeBullets: [summary],
      historyEntryMarkdown: [
        '### ' + title,
        '',
        '- **작업자**: ' + author,
        '- **변경 내용**: ' + summary,
        '- **검증**: Claude CLI 실패로 자동 분석 미수행. 수동 입력 기준.',
      ].join('\n'),
      classification: 'docs',
    };
  } finally {
    fs.closeSync(tty);
  }
}

function handleGenerationFailure(message, detail = '') {
  console.error('[consis-history] ' + message);
  if (detail.trim()) console.error(detail.trim());
  const action = askHistoryFailureAction(message);
  if (action === 'continue') {
    console.error('[consis-history] 사용자 선택으로 history 생성 없이 커밋을 계속합니다.');
    process.exit(0);
  }
  if (action === 'manual') {
    const manual = manualHistoryEntry();
    if (manual) {
      persistGeneratedHistory(manual);
      process.exit(0);
    }
    console.error('[consis-history] 수동 history 입력이 완료되지 않아 커밋을 중단합니다.');
  }
  process.exit(1);
}

const prompt = [
  '당신은 staged Git 변경을 기록하는 append-only 변경 이력 작성기다.',
  '커밋 타입은 보조 정보일 뿐이며 diff를 직접 분석한다. 타입이 없어도 판단한다.',
  'classification은 feat, fix, style, docs, chore, refactor, perf, security, ci, build, other 중 하나다.',
  '패키지 의존성, Dockerfile, Maven/Gradle/npm 빌드 설정은 build로 분류한다. GitHub Actions, GitLab CI, Jenkins 등 자동화 파이프라인은 ci로 분류한다.',
  'chore는 코드 동작, 빌드, CI, 문서, 테스트에 직접 속하지 않는 관리 작업에만 사용한다.',
  'style 변경도 UI, CSS, 레이아웃, 디자인에 영향이 있으면 상세히 기록한다.',
  '단순 문서, 포맷, 기계적 변경은 간략히 기록하되 누락하지 않는다.',
  '확인되지 않은 원인, 수치, 테스트 결과를 추측하지 않는다.',
  '입력에는 테스트나 빌드 명령 실행 결과가 제공되지 않았다. 따라서 문법, 빌드, 테스트 동작 검증을 완료·정상·PASS라고 쓰지 않는다.',
  'diff에서 코드를 눈으로 확인한 것은 검증 실행이 아니다. verification에는 반드시 미실행 또는 확인되지 않음이라고 쓴다.',
  '후속 조치는 staged diff에 TODO, 미해결 문제 또는 명시 근거가 있을 때만 작성한다. 이미 반영된 설정이나 추측한 환경 구성을 제안하지 않는다.',
  '모든 설명은 한국어로 작성한다. 코드 식별자와 고유명사만 원문을 유지한다.',
  'README 제목과 요약은 쉬운 한국어로 간결하게 쓴다. 사용자가 한 번에 이해할 수 있는 말로 작성한다.',
  '스테일, 카탈로그처럼 어렵거나 어색한 번역투·내부 은어는 쓰지 않는다. 오래됨, 목록, 모음처럼 쉬운 표현을 쓴다.',
  '집중화, 단일화, 속성 부여, 메타데이터 태깅 같은 딱딱한 표현보다 모음, 정리, 값 추가, 사유 기록처럼 쉬운 표현을 우선한다.',
  '도구를 호출하거나 저장소 파일을 수정하지 말고 제공된 입력만 분석한다.',
  'historyEntryMarkdown에는 날짜 제목과 ---를 넣지 말고 ### 제목부터 작성한다.',
  'README와 history에는 모델명, AI 도구명, 프롬프트 실행 정보, Generated-by, Co-authored-by 같은 메타 정보를 절대 쓰지 않는다.',
  '작업자는 지정된 작업자 값만 사용한다. README의 작업자 줄과 history의 작업자 항목 외에는 작성자, 작업자, 모델 메타 섹션을 추가하지 않는다.',
  '상세 문서 경로는 hook이 staged 파일과 historyRouting으로 이미 결정한 값이다. AI는 feature, 파일명, routing을 새로 판단하거나 다른 문서 경로를 제안하지 않는다.',
  '일반 코드 변경은 요약, 무엇을(what), 왜(why), 어떻게(how), 검증(verification), 영향 범위(impact), 후속 조치(follow-up)를 확인한다.',
  '간단한 변경은 불필요하게 섹션을 늘리지 않는다.',
  '유효한 JSON만 출력한다.',
  '',
  '출력 형식:',
  '{"title":"변경 제목","readmeBullets":["릴리즈 노트용 요약"],"historyEntryMarkdown":"### 변경 제목\\n\\n- **작업자**: ...","classification":"feat|fix|style|docs|chore|refactor|perf|security|ci|build|other"}',
  '',
  '메타 정보:',
  '버전: ' + version,
  '날짜: ' + date,
  '작업자: ' + author,
  '브랜치: ' + branch,
  '상세 문서: ' + config.historyFile,
  '',
  '기존 history 문서:',
  existingHistory,
  '',
  'staged 파일:',
  stagedFiles,
  ...(omittedDiffFiles.length > 0 ? [
    '',
    '내용이 제외된 staged 파일:',
    omittedDiffFiles.join('\n'),
  ] : []),
  '',
  'staged diff:',
  stagedDiff || '(모든 staged 파일의 diff 내용이 크기 또는 바이너리 제한으로 제외됨)',
].join('\n');

const configuredCommand = process.env.HISTORY_AI_BIN || process.env.CONSIS_CLAUDE_BIN;
const codexOutputFile = path.join(os.tmpdir(), 'consis-history-codex-' + process.pid + '.json');
function cleanupCodexOutput() {
  if (aiTool === 'codex') {
    try {
      fs.unlinkSync(codexOutputFile);
    } catch {
      // Best-effort cleanup only.
    }
  }
}
const effectivePrompt = aiTool === 'codex'
  ? [
    'You generate commit history documents from staged git changes.',
    'Return valid JSON only. Do not include markdown fences or commentary.',
    'Required JSON shape: {"title":"Korean title","readmeBullets":["Korean summary"],"historyEntryMarkdown":"### Korean title\\n\\n- **작업자**: ...","classification":"feat|fix|style|docs|chore|refactor|perf|security|ci|build|other"}',
    'Do not mention AI tools, model names, prompts, Generated-by, or Co-authored-by.',
    'Use concise, natural Korean. If verification evidence is not provided, say it was not confirmed.',
    '',
    prompt,
  ].join('\n')
  : prompt;
const cliArgs = aiTool === 'codex'
  ? ['exec', ...(model ? ['-m', model] : []), '--sandbox', 'read-only', '--skip-git-repo-check', '--output-last-message', codexOutputFile]
  : ['-p', '--model', model, '--tools', '', '--output-format', 'json', '--max-turns', String(config.maxTurns)];
function windowsShellQuote(value) {
  return '"' + String(value).replace(/(["^&|<>])/g, '^$1') + '"';
}
function buildCommandInvocation(baseCommand, args) {
  if (baseCommand && baseCommand.endsWith('.js')) {
    return { command: process.execPath, args: [baseCommand, ...args] };
  }
  const commandName = baseCommand || aiTool;
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(commandName)) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', [commandName, ...args].map(windowsShellQuote).join(' ')],
    };
  }
  return { command: commandName, args };
}
const invocation = buildCommandInvocation(configuredCommand, cliArgs);
const result = spawnSync(invocation.command, invocation.args, {
  cwd: os.tmpdir(),
  input: effectivePrompt,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
if (result.status !== 0) {
  cleanupCodexOutput();
  handleGenerationFailure(aiTool + ' CLI 실행 실패', result.stderr || result.stdout || '');
}

let envelope;
let generated;
try {
  envelope = aiTool === 'codex' ? readFile(codexOutputFile) : JSON.parse(result.stdout);
  const text = envelope.result ?? envelope;
  const normalized = typeof text === 'string'
    ? text.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '')
    : text;
  generated = typeof normalized === 'string' ? JSON.parse(normalized) : normalized;
} catch (error) {
  cleanupCodexOutput();
  handleGenerationFailure(aiTool + ' 출력 JSON 파싱 실패: ' + error.message);
}
if (!generated.title || !Array.isArray(generated.readmeBullets) || !generated.historyEntryMarkdown) {
  cleanupCodexOutput();
  handleGenerationFailure('Claude 출력에 필수 필드가 없습니다.');
}

persistGeneratedHistory(generated);
cleanupCodexOutput();
`;

function writeIfMissing(filePath, content, mode) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  if (mode) fs.chmodSync(filePath, mode);
}

function toHistoryName(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'common';
}

function listSubdirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !HISTORY_ROUTING_EXCLUDED_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function readGitignoreExcludedDirs(root) {
  const gitignorePath = path.join(root, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return new Set();
  const lines = fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/);
  const dirs = new Set();
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    if (line.includes('*')) continue;
    const normalized = line.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized || normalized.includes('/')) continue;
    dirs.add(normalized);
  }
  return dirs;
}

function addRouting(routing, pattern, historyName) {
  if (!routing[pattern]) routing[pattern] = `.history/${toHistoryName(historyName)}.history.md`;
}

function readReadmeText(root) {
  for (const name of ['README.md', 'readme.md', 'README.MD']) {
    const readmePath = path.join(root, name);
    if (fs.existsSync(readmePath)) return fs.readFileSync(readmePath, 'utf8');
  }
  return '';
}

function addRoutingIfExists(routing, root, relativePattern, historyName) {
  if (['src/main/**', 'app/**', 'src/**'].includes(relativePattern)) return;
  const base = relativePattern.replace(/\/\*\*$/, '').replace(/\*.*$/, '');
  if (fs.existsSync(path.join(root, ...base.split('/')))) {
    addRouting(routing, relativePattern, historyName);
  }
}

function historyNameForFeature(feature) {
  if (feature === 'multiagent' || feature === 'multi_agent') return 'multi-agent';
  if (feature === 'recommendquest') return 'recommend';
  return feature;
}

function addReadmeMentionedRouting(routing, root, readmeText, candidates) {
  if (!readmeText) return;
  const lowerReadme = readmeText.toLowerCase();
  for (const candidate of candidates) {
    const name = candidate.name;
    if (!lowerReadme.includes(name.toLowerCase())) continue;
    for (const pattern of candidate.patterns) {
      addRoutingIfExists(routing, root, pattern, historyNameForFeature(name));
    }
  }
}

function addFrontendFeatureRouting(routing, root, isIgnoredDir) {
  if (isIgnoredDir('src') || !fs.existsSync(path.join(root, 'src'))) return;

  const addFeatureDirs = (relativeDir) => {
    const absoluteDir = path.join(root, ...relativeDir.split('/'));
    for (const name of listSubdirectories(absoluteDir)) {
      if (!isIgnoredDir(name) && name !== 'common') {
        addRouting(routing, `${relativeDir}/${name}/**`, historyNameForFeature(name));
      }
    }
  };

  addFeatureDirs('src/pages');
  addFeatureDirs('src/hooks');
  addFeatureDirs('src/types');
  addFeatureDirs('src/utils');
  addFeatureDirs('src/components/sections');

  const apisDir = path.join(root, 'src', 'apis');
  for (const file of fs.existsSync(apisDir) ? fs.readdirSync(apisDir) : []) {
    const match = file.match(/^([A-Za-z0-9_-]+)Api\.(?:ts|tsx|js|jsx)$/);
    if (match) addRouting(routing, `src/apis/${file}`, historyNameForFeature(match[1]));
  }

  if (fs.existsSync(path.join(root, 'src', 'components', 'ChatPanel.tsx'))) {
    addRouting(routing, 'src/components/ChatPanel.tsx', 'chat');
  }
  if (fs.existsSync(path.join(root, 'src', 'components', 'ui', 'MessageBubble.tsx'))) {
    addRouting(routing, 'src/components/ui/MessageBubble.tsx', 'chat');
  }
}

function addSpringBootFeatureRouting(routing, root, isIgnoredDir, readmeText) {
  const javaRoot = path.join(root, 'src', 'main', 'java');
  if (isIgnoredDir('src') || !fs.existsSync(javaRoot)) return;

  addRouting(routing, 'src/main/java/**/agent/**', 'agent');
  for (const feature of ['multi_agent', 'multiagent']) {
    addRouting(routing, `src/main/java/**/${feature}/**`, 'multi-agent');
  }
  addRouting(routing, 'src/main/java/**/integration/**', 'integrations');
  addRouting(routing, 'src/main/java/**/integrations/**', 'integrations');
  for (const feature of ['voc', 'utterance', 'recommendquest', 'recommend', 'approval', 'share', 'settings', 'notification', 'answerfeedback']) {
    addRouting(routing, `src/main/java/**/${feature}/**`, historyNameForFeature(feature));
  }

  const candidates = [];
  const stack = [javaRoot];
  const javaRootDepth = path.relative(root, javaRoot).replace(/\\/g, '/').split('/').length;
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || isIgnoredDir(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      const relative = path.relative(root, fullPath).replace(/\\/g, '/');
      const depth = relative.split('/').length;
      if (depth >= javaRootDepth + 4 && entry.name !== 'common') {
        candidates.push({ name: entry.name, patterns: [relative + '/**'] });
      }
      if (depth < javaRootDepth + 4) stack.push(fullPath);
    }
  }
  addReadmeMentionedRouting(routing, root, readmeText, candidates);
}

function addPythonFeatureRouting(routing, root, isIgnoredDir, readmeText) {
  if (fs.existsSync(path.join(root, 'src', 'main', 'java'))) return;
  const candidates = [];
  const topLevelDirs = listSubdirectories(root)
    .filter((name) => !isIgnoredDir(name) && !['app', 'src', 'docs', 'tests', 'test', 'scripts'].includes(name));
  for (const name of topLevelDirs) {
    if (fs.existsSync(path.join(root, name, '__init__.py')) || fs.existsSync(path.join(root, name, 'pyproject.toml'))) {
      addRouting(routing, `${name}/**`, historyNameForFeature(name));
      candidates.push({ name, patterns: [`${name}/**`] });
    }
  }
  for (const parent of ['app', 'src']) {
    const parentPath = path.join(root, parent);
    if (!isIgnoredDir(parent) && fs.existsSync(parentPath)) {
      for (const name of listSubdirectories(parentPath).filter((entry) => !isIgnoredDir(entry) && entry !== 'common')) {
        if (parent === 'app' && name === 'domains') continue;
        addRouting(routing, `${parent}/${name}/**`, historyNameForFeature(name));
        candidates.push({ name, patterns: [`${parent}/${name}/**`] });
      }
    }
  }
  addReadmeMentionedRouting(routing, root, readmeText, candidates);
  if (fs.existsSync(path.join(root, 'tests'))) addRouting(routing, 'tests/**', 'test');
}

function inferHistoryRouting(root) {
  const routing = {};
  const gitignoreExcludedDirs = readGitignoreExcludedDirs(root);
  const isIgnoredDir = (name) => HISTORY_ROUTING_EXCLUDED_DIRS.has(name) || gitignoreExcludedDirs.has(name);
  const readmeText = readReadmeText(root);

  if (!isIgnoredDir('app') && fs.existsSync(path.join(root, 'app', 'multi_agent'))) {
    addRouting(routing, 'app/multi_agent/**', 'multi-agent');
  }
  if (!isIgnoredDir('app') && fs.existsSync(path.join(root, 'app', 'integrations'))) {
    addRouting(routing, 'app/integrations/**', 'integrations');
  }
  for (const domain of listSubdirectories(path.join(root, 'app', 'domains')).filter((name) => !isIgnoredDir(name))) {
    addRouting(routing, `app/domains/${domain}/**`, domain);
  }

  addSpringBootFeatureRouting(routing, root, isIgnoredDir, readmeText);
  addPythonFeatureRouting(routing, root, isIgnoredDir, readmeText);

  if (!isIgnoredDir('test') && fs.existsSync(path.join(root, 'test'))) addRouting(routing, 'test/**', 'test');
  if (!isIgnoredDir('src') && fs.existsSync(path.join(root, 'src', 'test'))) addRouting(routing, 'src/test/**', 'test');
  addFrontendFeatureRouting(routing, root, isIgnoredDir);
  if (!isIgnoredDir('src') && fs.existsSync(path.join(root, 'src'))) addRouting(routing, 'src/**', 'source');

  addRouting(routing, 'README.md', 'docs');
  addRouting(routing, 'CLAUDE.md', 'docs');
  addRouting(routing, 'AGENTS.md', 'docs');
  addRouting(routing, '.claude/**', 'docs');
  addRouting(routing, '.agents/**', 'docs');
  addRouting(routing, '.cursor/**', 'docs');
  addRouting(routing, '.env.example', 'history');
  addRouting(routing, '.githooks/**', 'history');
  addRouting(routing, 'scripts/consis-history.js', 'history');
  addRouting(routing, '.consis-history.json', 'history');
  routing.default = CONFIG.historyFile;

  return routing;
}

function writeHistoryConfig(filePath, projectPath) {
  const inferredRouting = inferHistoryRouting(projectPath);
  if (!fs.existsSync(filePath)) {
    writeIfMissing(filePath, `${JSON.stringify({ ...CONFIG, historyRouting: inferredRouting }, null, 2)}\n`);
    return;
  }

  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  if (
    current.historyFile === 'docs/98-history/common.history.md'
    || current.historyFile === 'docs/history/common.history.md'
    || current.historyFile === '.history/common.history.md'
  ) {
    current.historyFile = CONFIG.historyFile;
    changed = true;
  }
  if (!current.historyRouting || Object.keys(current.historyRouting).length === 0) {
    current.historyRouting = inferredRouting;
    changed = true;
  } else {
    for (const [pattern, target] of Object.entries(inferredRouting)) {
      if (!current.historyRouting[pattern]) {
        current.historyRouting[pattern] = target;
        changed = true;
      }
    }
    if (!current.historyRouting.default) {
      current.historyRouting.default = current.historyFile || CONFIG.historyFile;
      changed = true;
    }
    if (current.historyRouting.default === '.history/common.history.md') {
      current.historyRouting.default = CONFIG.historyFile;
      changed = true;
    }
  }
  if (
    current.historyRouting
    && current.historyRouting['src/main/java/**/agent/**'] === '.history/multi-agent.history.md'
  ) {
    current.historyRouting['src/main/java/**/agent/**'] = '.history/agent.history.md';
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  }
}

function writeManagedFile(filePath, content, mode) {
  const marker = 'consis-history:managed';
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (!current.includes(marker)) {
      throw new Error('기존 파일이 Consis 관리 파일이 아니어서 덮어쓰지 않았습니다: ' + filePath);
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  if (mode) fs.chmodSync(filePath, mode);
}

function getHistoryGeneratorContent(root) {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = fs.existsSync(packageJsonPath)
    ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    : {};
  if (packageJson.type !== 'module') return GENERATOR;
  return GENERATOR
    .replace("const fs = require('fs');", "import fs from 'node:fs';")
    .replace("const path = require('path');", "import path from 'node:path';")
    .replace("const os = require('os');", "import os from 'node:os';")
    .replace("const crypto = require('crypto');", "import crypto from 'node:crypto';")
    .replace("const { spawnSync } = require('child_process');", "import { spawnSync } from 'node:child_process';");
}

function installHistoryAutomation(projectPath) {
  const root = path.resolve(projectPath);
  writeHistoryConfig(path.join(root, '.consis-history.json'), root);
  writeManagedFile(path.join(root, '.githooks', 'pre-commit'), PRE_COMMIT, 0o755);
  writeManagedFile(path.join(root, 'scripts', 'consis-history.js'), getHistoryGeneratorContent(root), 0o755);

  const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (gitCheck.status === 0) {
    const configured = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (configured.status !== 0) {
      throw new Error(`Git hooks 경로 설정 실패: ${(configured.stderr || configured.stdout).trim()}`);
    }
  }

  console.log(`installed history automation -> ${path.join(root, '.githooks', 'pre-commit')}`);
}

module.exports = {
  installHistoryAutomation,
  PRE_COMMIT,
  GENERATOR,
};
