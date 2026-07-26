const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CONFIG = {
  model: 'sonnet',
  maxTurns: 3,
  historyFile: '.history/common.history.md',
  readmeFile: 'README.md',
  blockedBranches: ['main', 'master'],
  maxDiffBytes: 500000,
  maxFileDiffBytes: 100000,
};

const PRE_COMMIT = `#!/bin/sh
# consis-history:managed v1
set -eu

if [ "\${HISTORY_DISABLE:-}" = "1" ]; then
  echo "[history] hook disabled by HISTORY_DISABLE=1"
  exit 0
fi

branch="$(git branch --show-current)"
case "$branch" in
  main|master)
    echo "[consis-history] $branch 브랜치 직접 커밋은 허용되지 않습니다." >&2
    exit 1
    ;;
esac

repo_root="$(git rev-parse --show-toplevel)"
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

function formatAuthor(name, email) {
  if (name && email) return name + ' <' + email + '>';
  if (name) return name;
  if (email) return email;
  return 'Unknown';
}

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

root = git(['rev-parse', '--show-toplevel']);
const config = {
  model: 'sonnet',
  maxTurns: 3,
  historyFile: '.history/common.history.md',
  readmeFile: 'README.md',
  maxDiffBytes: 500000,
  maxFileDiffBytes: 100000,
  ...readJson(path.join(root, '.consis-history.json'), {}),
};
const excluded = [config.historyFile];
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
const model = process.env.HISTORY_CLAUDE_MODEL || config.model;
const historyPath = path.join(root, config.historyFile);
const existingHistory = readFile(historyPath);
const prompt = [
  '당신은 staged Git 변경을 기록하는 append-only 변경 이력 작성기다.',
  '커밋 타입은 보조 정보일 뿐이며 diff를 직접 분석한다. 타입이 없어도 판단한다.',
  'style 변경도 UI, CSS, 레이아웃, 디자인에 영향이 있으면 상세히 기록한다.',
  '단순 문서, 포맷, 기계적 변경은 간략히 기록하되 누락하지 않는다.',
  '확인되지 않은 원인, 수치, 테스트 결과를 추측하지 않는다.',
  '입력에는 테스트나 빌드 명령 실행 결과가 제공되지 않았다. 따라서 문법, 빌드, 테스트, 동작 검증을 완료·정상·PASS라고 쓰지 않는다.',
  'diff에서 코드를 눈으로 확인한 것은 검증 실행이 아니다. verification에는 반드시 미실행 또는 확인되지 않음이라고 쓴다.',
  '후속 조치는 staged diff에 TODO, 미해결 문제 또는 명시적 근거가 있을 때만 작성한다. 이미 반영된 설정을 후속 조치로 쓰거나 새로운 환경 설정을 추측해 제안하지 않는다.',
  '모든 설명은 한국어로 작성한다. 코드 식별자와 고유명사만 원문을 유지한다.',
  '도구를 호출하거나 저장소 파일을 수정하지 말고 제공된 입력만 분석한다.',
  'historyEntryMarkdown에는 날짜 제목과 ---를 넣지 말고 ### 제목부터 작성한다.',
  '일반 코드 변경은 요약, 무엇을(what), 왜(why), 어떻게(how), 검증(verification), 영향 범위(impact), 후속 조치(follow-up)를 녹인다.',
  '간단한 변경은 불필요하게 섹션을 늘리지 않는다.',
  '유효한 JSON만 출력한다.',
  '',
  '출력 형식:',
  '{"title":"변경 제목","readmeBullets":["릴리즈 노트형 요약"],"historyEntryMarkdown":"### 변경 제목\\n\\n- **작업자**: ...","classification":"feat|fix|style|docs|chore|refactor|perf|security|ci|build|other"}',
  '',
  '메타데이터:',
  '버전: ' + version,
  '날짜: ' + date,
  '작업자: ' + author,
  '브랜치: ' + branch,
  '사용 모델: ' + model,
  '상세 문서: ' + config.historyFile,
  '',
  '기존 history 문서:',
  existingHistory,
  '',
  'staged 파일:',
  stagedFiles,
  ...(omittedDiffFiles.length > 0 ? [
    '',
    '내용을 제외한 대형 또는 바이너리 staged 파일:',
    omittedDiffFiles.join('\n'),
  ] : []),
  '',
  'staged diff:',
  stagedDiff || '(모든 staged 파일의 diff 내용이 크기 또는 바이너리 제한으로 제외됨)',
].join('\n');

const configuredCommand = process.env.CONSIS_CLAUDE_BIN;
const command = configuredCommand && configuredCommand.endsWith('.js')
  ? process.execPath
  : configuredCommand || 'claude';
const commandPrefix = configuredCommand && configuredCommand.endsWith('.js') ? [configuredCommand] : [];
const result = spawnSync(command, [...commandPrefix, '-p', '--model', model, '--tools', '', '--output-format', 'json', '--max-turns', String(config.maxTurns)], {
  cwd: os.tmpdir(),
  input: prompt,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
if (result.status !== 0) {
  console.error('[consis-history] Claude CLI 실행 실패');
  console.error((result.stderr || result.stdout || '').trim());
  process.exit(1);
}

let envelope;
let generated;
try {
  envelope = JSON.parse(result.stdout);
  const text = envelope.result ?? envelope;
  const normalized = typeof text === 'string'
    ? text.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '')
    : text;
  generated = typeof normalized === 'string' ? JSON.parse(normalized) : normalized;
} catch (error) {
  console.error('[consis-history] Claude 출력 JSON 파싱 실패: ' + error.message);
  process.exit(1);
}
if (!generated.title || !Array.isArray(generated.readmeBullets) || !generated.historyEntryMarkdown) {
  console.error('[consis-history] Claude 출력에 필수 필드가 없습니다.');
  process.exit(1);
}

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
`;

function writeIfMissing(filePath, content, mode) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  if (mode) fs.chmodSync(filePath, mode);
}

function writeHistoryConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    writeIfMissing(filePath, `${JSON.stringify(CONFIG, null, 2)}\n`);
    return;
  }

  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (
    current.historyFile === 'docs/98-history/common.history.md'
    || current.historyFile === 'docs/history/common.history.md'
  ) {
    current.historyFile = CONFIG.historyFile;
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

function installHistoryAutomation(projectPath) {
  const root = path.resolve(projectPath);
  writeHistoryConfig(path.join(root, '.consis-history.json'));
  writeManagedFile(path.join(root, '.githooks', 'pre-commit'), PRE_COMMIT, 0o755);
  writeManagedFile(path.join(root, 'scripts', 'consis-history.js'), GENERATOR, 0o755);

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
