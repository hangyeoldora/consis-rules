const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

// 테스트는 로컬 packs.source.json을 사용한다. 명시적 --source-url을 받는 테스트만
// 해당 URL로 덮어써서 remote fetch를 검증한다.
process.env.AI_TEAM_RULES_SOURCE_URL = 'http://127.0.0.1:1/unreachable';

const { run } = require('../src/cli');

test('apply codex project writes full stack rules inline into AGENTS.md', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-project-'));

  await run(['apply', 'common', 'react-ts', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start common/);
  assert.match(output, /ai-team-rules:start react-ts/);
  // Codex는 공식 rules 폴더가 없으므로 풀 내용이 AGENTS.md에 직접 들어간다.
  assert.match(output, /React \+ TypeScript/);
  assert.match(output, /스택 \/ 라이브러리 표준/);
  assert.doesNotMatch(output, /프론트엔드 상시 규칙/);
  assert.doesNotMatch(output, /\$react-ts/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'react-ts', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'rules', 'react-ts.md')), false);
});

test('apply codex project keeps AGENTS.md short when root and nested CLAUDE.md exist', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-codex-claude-ref-'));
  const nestedDir = path.join(projectDir, 'apps', 'api');
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# root claude\n');
  fs.writeFileSync(path.join(nestedDir, 'CLAUDE.md'), '# nested claude\n');

  await run(['apply', 'react-ts', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start react-ts/);
  assert.match(output, /루트 `CLAUDE.md`와 하위 폴더 `CLAUDE.md`를 우선 참조한다/);
  assert.doesNotMatch(output, /스택 \/ 라이브러리 표준/);
  assert.equal(fs.existsSync(path.join(projectDir, 'apps', 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, 'apps', 'api', 'AGENTS.md')), false);
});

test('apply codex project keeps AGENTS.md short when root CLAUDE.md exists', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-codex-root-claude-ref-'));
  fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# root claude\n');

  await run(['apply', 'common', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start common/);
  assert.match(output, /CLAUDE\.md/);
  assert.doesNotMatch(output, /Global Base Rules/);
});

test('apply claude project writes summary in CLAUDE.md and full rules to .claude/rules', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-claude-rules-'));

  await run(['apply', 'react-ts', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);

  const rootOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(rootOutput, /ai-team-rules:start react-ts/);
  assert.match(rootOutput, /프론트엔드 상시 규칙/);
  assert.match(rootOutput, /\.claude\/rules\/react-ts\.md/);
  assert.doesNotMatch(rootOutput, /스택 \/ 라이브러리 표준/);

  const rulesPath = path.join(projectDir, '.claude', 'rules', 'react-ts.md');
  assert.equal(fs.existsSync(rulesPath), true);
  const rulesOutput = fs.readFileSync(rulesPath, 'utf8');
  assert.match(rulesOutput, /React \+ TypeScript/);
  assert.match(rulesOutput, /스택 \/ 라이브러리 표준/);

  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'react-ts', 'SKILL.md')), false);
});

test('apply cursor project writes one file per pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-cursor-'));

  await run(['apply', 'docs', '--tool', 'cursor', '--scope', 'project', '--project-path', projectDir]);

  const outputPath = path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc');
  assert.equal(fs.existsSync(outputPath), true);
  const output = fs.readFileSync(outputPath, 'utf8');
  assert.match(output, /^---/);
  assert.match(output, /description: AI 지침 문서 구조와 문서 정리 원칙을 항상 적용한다\./);
  assert.match(output, /alwaysApply: true/);
  assert.match(output, /AI 지침 문서/);
});

test('apply cursor global throws official settings guidance error', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-cursor-global-'));

  await assert.rejects(
    () => run(['apply', 'docs', '--tool', 'cursor', '--scope', 'global', '--project-path', projectDir]),
    /Cursor Settings > Rules/
  );
});

test('apply without --tool defaults to claude only', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-default-'));

  await run(['apply', 'docs', '--scope', 'project', '--project-path', projectDir]);

  assert.equal(fs.existsSync(path.join(projectDir, 'CLAUDE.md')), true);
  const skillPath = path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md');
  assert.equal(fs.existsSync(skillPath), true);
  assert.match(fs.readFileSync(skillPath, 'utf8'), /\.gitignore/);
  assert.match(fs.readFileSync(skillPath, 'utf8'), /target\/.*build\/.*dist\//);
  assert.match(fs.readFileSync(skillPath, 'utf8'), /폴더 이름, 위치, 파일 성격을 직접 분석/);
  assert.equal(fs.existsSync(path.join(projectDir, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.cursor', 'rules', 'consis-docs.mdc')), false);
});

test('common pack bundles ai-base-rules, security-standards, git-workflow', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-common-bundle-'));

  await run(['apply', 'common', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start common/);
  // ai-base-rules
  assert.match(output, /코드 품질 4원칙|환각 방지|AI 기본 규칙/);
  assert.match(output, /작업 계약/);
  assert.match(output, /주석 최소화/);
  assert.match(output, /완료 전 자체 검문/);
  assert.match(output, /SOLID \/ OOP 적용 원칙/);
  assert.match(output, /과잉추상화/);
  assert.match(output, /완료 전 필수 검문/);
  // security-standards
  assert.match(output, /보안 표준|AI 도구별 보안|XSS|시크릿/);
  // git-workflow
  assert.match(output, /커밋 메시지|PR \/ 브랜치|브랜치 안전|Git 워크플로우/);
});

test('apply common for claude keeps root as rules pointer', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-common-claude-'));

  await run(['apply', 'common', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);

  const rootOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(rootOutput, /ai-team-rules:start common/);
  assert.match(rootOutput, /\.claude\/rules\/common\.md/);
  assert.doesNotMatch(rootOutput, /Global Base Rules/);

  const rulesOutput = fs.readFileSync(path.join(projectDir, '.claude', 'rules', 'common.md'), 'utf8');
  assert.match(rulesOutput, /Global Base Rules/);
  assert.match(rulesOutput, /SOLID \/ OOP/);
});

test('security pack applies security-standards only', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-security-'));

  await run(['apply', 'security', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start security/);
  assert.match(output, /AI 도구별 보안|XSS|시크릿/);
  assert.doesNotMatch(output, /ai-team-rules:start common/);
});

test('git-workflow pack applies commit-messages and pr-safety', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-git-'));

  await run(['apply', 'git-workflow', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start git-workflow/);
  assert.match(output, /커밋 메시지/);
  assert.match(output, /한 줄 커밋/);
  assert.match(output, /<type>: <쉬운 한국어 subject>/);
  assert.match(output, /scope를 쓰지 않는다/);
  assert.match(output, /subject는 50자 이내의 쉬운 한국어로 작성/);
  assert.match(output, /type 뒤 subject를 영어 문장으로 쓰지 않는다/);
  assert.match(output, /스테일.*카탈로그/);
  assert.match(output, /패키지 의존성, Dockerfile, Maven\/Gradle\/npm 빌드 설정은 `build`/);
  assert.match(output, /자동화 파이프라인은 `ci`/);
  assert.match(output, /관리 작업만 `chore`/);
  assert.match(output, /차단 사유와 안내 문구 추가/);
  assert.match(output, /모델명, AI 도구명/);
  assert.doesNotMatch(output, /<type>\(<scope>\): <subject>/);
  assert.doesNotMatch(output, /Commit Message Rules/);
});

test('git alias resolves to git-workflow pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-git-alias-'));

  await run(['apply', 'git', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start git-workflow/);
});

test('tool-security rule is in Korean', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-toolsec-'));

  await run(['apply', 'security', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /AI 도구별 보안 운영 원칙/);
  assert.doesNotMatch(output, /AI Tool Security Operating Principles/);
  assert.doesNotMatch(output, /Do not enforce one fixed access policy/);
});

test('apply spring alias resolves to spring-boot pack', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-spring-'));

  await run(['apply', 'spring', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /spring-boot|Spring Boot/);
  assert.match(output, /주석 \/ Javadoc/);
  assert.match(output, /이름·시그니처·필드 역할을 반복하는 설명은 금지/);
  assert.match(output, /SOLID \/ OOP/);
  assert.match(output, /생성자 주입을 사용했는지 확인/);
  assert.match(output, /불필요한 인터페이스/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'spring-boot', 'SKILL.md')), false);
});

test('safety pack blocks AI-managed hook bypass settings', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-safety-'));

  await run(['apply', 'safety', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /사용자 명시 지시 없이 `HISTORY_DISABLE`/);
  assert.match(output, /hook 관련 환경 변수나 Git 설정을 변경하지 않는다/);
});

test('apply rejects missing values and unknown options', async () => {
  await assert.rejects(
    () => run(['apply', 'python', '--tool', '--scope', 'project']),
    /Missing value for --tool/,
  );
  await assert.rejects(
    () => run(['apply', 'python', '--wat']),
    /Unknown option: --wat/,
  );
});

test('apply python alias writes clean-code rules without folder conventions', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-python-'));

  await run(['apply', 'py', '--tool', 'codex', '--scope', 'project', '--project-path', projectDir]);

  const output = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(output, /ai-team-rules:start python/);
  assert.match(output, /Python 스택 \/ 코드 스타일 표준/);
  assert.match(output, /가독성과 함수 설계/);
  assert.match(output, /예외 \/ 리소스 \/ 로깅/);
  assert.match(output, /Python 테스트 규칙/);
  assert.match(output, /주석과 docstring은 기본 작성하지 않는다/);
  assert.match(output, /SOLID \/ OOP 적용/);
  assert.match(output, /Protocol이나 추상 클래스/);
  assert.match(output, /완료 전 필수 검문/);
  assert.doesNotMatch(output, /폴더 구조|디렉터리 구조|src\//);
});

test('apply python for claude writes a root pointer and full rules file', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-python-claude-'));

  await run(['apply', 'python', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);

  const rootOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(rootOutput, /\.claude\/rules\/python\.md/);
  assert.doesNotMatch(rootOutput, /가독성과 함수 설계/);

  const rulesOutput = fs.readFileSync(path.join(projectDir, '.claude', 'rules', 'python.md'), 'utf8');
  assert.match(rulesOutput, /Python 테스트 규칙/);
  assert.match(rulesOutput, /SOLID \/ OOP 적용/);
});

test('history pack installs tool rules and git hook automation', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  fs.mkdirSync(path.join(projectDir, 'app', 'multi_agent'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'app', 'domains', 'voc'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'app', 'domains', 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'app', 'integrations', 'sql'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'target', 'classes'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, '.gitignore'), 'target/\ntmp/\n');

  await run(['apply', 'history', '--tool', 'all', '--scope', 'project', '--project-path', projectDir]);

  assert.match(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8'), /\.claude\/rules\/history\.md/);
  assert.match(fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8'), /CLAUDE\.md/);
  const cursorHistoryRule = fs.readFileSync(path.join(projectDir, '.cursor', 'rules', 'consis-history.mdc'), 'utf8');
  assert.match(cursorHistoryRule, /staged diff/);
  assert.match(cursorHistoryRule, /모델명, AI 도구명/);
  assert.match(cursorHistoryRule, /별도의 작성자\/작자\/모델\/도구 섹션을 만들지 않는다/);
  assert.match(cursorHistoryRule, /사용자 명시 지시 없이 `HISTORY_DISABLE=1`/);
  assert.match(cursorHistoryRule, /쉬운 한국어로 간결하게/);
  assert.match(cursorHistoryRule, /스테일.*카탈로그/);
  assert.equal(fs.existsSync(path.join(projectDir, '.githooks', 'pre-commit')), true);
  assert.match(fs.readFileSync(path.join(projectDir, '.githooks', 'pre-commit'), 'utf8'), /HISTORY_DISABLE=1/);
  assert.equal(fs.existsSync(path.join(projectDir, 'scripts', 'consis-history.js')), true);
  const config = JSON.parse(fs.readFileSync(path.join(projectDir, '.consis-history.json'), 'utf8'));
  assert.equal(config.historyRouting['app/multi_agent/**'], '.history/multi-agent.history.md');
  assert.equal(config.historyRouting['app/domains/voc/**'], '.history/voc.history.md');
  assert.equal(config.historyRouting['app/integrations/**'], '.history/integrations.history.md');
  assert.equal(config.historyRouting['.env.example'], '.history/history.history.md');
  assert.equal(config.historyRouting.default, '.history/project.history.md');
  assert.equal(Object.keys(config.historyRouting).some((pattern) => pattern.includes('target')), false);
  assert.equal(Object.keys(config.historyRouting).some((pattern) => pattern.includes('/tmp/')), false);
  assert.equal(
    spawnSync('git', ['config', 'core.hooksPath'], { cwd: projectDir, encoding: 'utf8' }).stdout.trim(),
    '.githooks',
  );
});

test('history pack rejects global scope before writing files', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-global-'));

  await assert.rejects(
    () => run(['apply', 'history', '--tool', 'claude', '--scope', 'global', '--project-path', projectDir]),
    /history pack supports project scope only/,
  );

  assert.equal(fs.existsSync(path.join(projectDir, '.consis-history.json')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.githooks', 'pre-commit')), false);
});

test('history pack updates its managed hook and generator on reapply', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-update-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  const configPath = path.join(projectDir, '.consis-history.json');
  const oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  oldConfig.historyFile = 'docs/history/common.history.md';
  fs.writeFileSync(configPath, `${JSON.stringify(oldConfig, null, 2)}\n`);
  fs.writeFileSync(
    path.join(projectDir, '.githooks', 'pre-commit'),
    '#!/bin/sh\n# consis-history:managed old\nexit 99\n',
  );

  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);

  const hook = fs.readFileSync(path.join(projectDir, '.githooks', 'pre-commit'), 'utf8');
  assert.match(hook, /consis-history:managed v1/);
  assert.doesNotMatch(hook, /exit 99/);
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).historyFile, '.history/project.history.md');
});

test('history pack writes ESM generator for type module projects', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-esm-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);

  const generator = fs.readFileSync(path.join(projectDir, 'scripts', 'consis-history.js'), 'utf8');
  assert.match(generator, /import fs from 'node:fs'/);
  assert.doesNotMatch(generator, /require\('fs'\)/);
  assert.equal(spawnSync(process.execPath, ['-c', path.join(projectDir, 'scripts', 'consis-history.js')]).status, 0);
});

test('history hook adds generated README and detail history to the same commit', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-commit-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });

  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("changed");\n');
  fs.writeFileSync(
    path.join(projectDir, 'fake-claude.js'),
    `if (!process.argv.includes('--tools') || process.argv[process.argv.indexOf('--tools') + 1] !== '') process.exit(3);
process.stdout.write(JSON.stringify({result: '\`\`\`json\\n' + JSON.stringify({
      title: 'UI 색상 개선',
      readmeBullets: ['버튼 색상과 대비를 개선했습니다.'],
      historyEntryMarkdown: '### UI 색상 개선 (Improve UI Colors)\\\\n\\\\n- **작업자**: Test Worker <worker@example.com>\\\\n- **변경 내용**: 버튼 색상을 개선함.\\\\n- **사유**: staged diff 기준.\\\\n- **영향 범위**: app.js',
      classification: 'style'
    }) + '\\n\`\`\`'}));\n`,
  );
  spawnSync('git', ['add', '.'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'style: improve colors'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'fake-claude.js') },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /README\.md/);
  assert.match(committed, /\.history\/project\.history\.md/);
  assert.match(fs.readFileSync(path.join(projectDir, 'README.md'), 'utf8'), /상세 변경 내용/);
  assert.match(fs.readFileSync(path.join(projectDir, 'README.md'), 'utf8'), /\[style\] UI 색상 개선 - \d{4}-\d{2}-\d{2}/);
  assert.match(fs.readFileSync(path.join(projectDir, 'README.md'), 'utf8'), /작업자: Test Worker/);
  const history = fs.readFileSync(path.join(projectDir, '.history', 'project.history.md'), 'utf8');
  assert.match(history, /## \d{4}-\d{2}-\d{2}/);
  assert.match(history, /UI 색상 개선/);
  assert.match(history, /Test Worker/);
});

test('history hook invokes a non-.js AI binary (Windows .cmd shim) and preserves the empty --tools arg', { skip: process.platform !== 'win32' }, async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-cmdbin-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });

  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("changed");\n');
  const impl = path.join(projectDir, 'fake-claude-impl.js');
  fs.writeFileSync(
    impl,
    "if (!process.argv.includes('--tools') || process.argv[process.argv.indexOf('--tools') + 1] !== '') process.exit(3);\n"
    + "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'cmd 바이너리 확인',readmeBullets:['cmd 바이너리 경로를 확인했습니다.'],historyEntryMarkdown:'### cmd 바이너리 확인\\n\\n- **작업자**: Test Worker',classification:'chore'})})))",
  );
  const cmdBin = path.join(projectDir, 'fake-claude.cmd');
  fs.writeFileSync(cmdBin, `@echo off\r\nnode "${impl}" %*\r\n`);
  spawnSync('git', ['add', '.'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: cmd binary test'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: cmdBin },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /\.history\/project\.history\.md/);
});

test('history hook routes nested Java agent files by inferred feature', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-route-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  fs.mkdirSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n\n## 변경 히스토리\n\n<!-- consis-history:start -->\n<!-- consis-history:end -->\n');
  fs.writeFileSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent', 'Node.java'), 'class Node {}\n');
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  const fakeClaude = path.join(projectDir, 'fake-claude.js');
  fs.writeFileSync(
    fakeClaude,
    "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'라우팅 확인',readmeBullets:['라우팅을 확인했습니다.'],historyEntryMarkdown:'### 라우팅 확인\\\\n\\\\n- **작업자**: Test Worker',classification:'chore'})})))",
  );

  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent', 'Node.java'), '// change\n');
  spawnSync('git', ['add', 'src/main/java/com/webcash/agent/agent/Node.java'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'chore: 라우팅 확인'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: fakeClaude },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /\.history\/agent\.history\.md/);
  assert.doesNotMatch(committed, /\.history\/common\.history\.md/);
});

test('history hook creates missing routing at commit time before choosing history file', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-runtime-route-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  fs.mkdirSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent', 'Node.java'), 'class Node {}\n');
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(
    path.join(projectDir, '.consis-history.json'),
    JSON.stringify({ model: 'sonnet', maxTurns: 3, historyFile: '.history/project.history.md', readmeFile: 'README.md' }, null, 2) + '\n',
  );
  const fakeClaude = path.join(projectDir, 'fake-claude.js');
  fs.writeFileSync(
    fakeClaude,
    "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'런타임 라우팅 확인',readmeBullets:['런타임 라우팅을 확인했습니다.'],historyEntryMarkdown:'### 런타임 라우팅 확인\\\\n\\\\n- **작업자**: Test Worker',classification:'chore'})})))",
  );

  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, 'src', 'main', 'java', 'com', 'webcash', 'agent', 'agent', 'Node.java'), '// runtime route\n');
  spawnSync('git', ['add', 'src/main/java/com/webcash/agent/agent/Node.java'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'chore: 런타임 라우팅 확인'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: fakeClaude },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /\.consis-history\.json/);
  assert.match(committed, /\.history\/agent\.history\.md/);
  assert.doesNotMatch(committed, /\.history\/common\.history\.md/);
  const config = JSON.parse(fs.readFileSync(path.join(projectDir, '.consis-history.json'), 'utf8'));
  assert.equal(config.historyRouting['src/main/java/**/agent/**'], '.history/agent.history.md');
});

test('history hook routes direct Java agent package by inferred feature', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-direct-route-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  fs.mkdirSync(path.join(projectDir, 'src', 'main', 'java', 'agent'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, 'src', 'main', 'java', 'agent', 'Node.java'), 'class Node {}\n');
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  const fakeClaude = path.join(projectDir, 'fake-claude.js');
  fs.writeFileSync(
    fakeClaude,
    "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'direct route',readmeBullets:['direct route checked.'],historyEntryMarkdown:'### direct route\\\\n\\\\n- **author**: Test Worker',classification:'chore'})})))",
  );

  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, 'src', 'main', 'java', 'agent', 'Node.java'), '// direct route\n');
  spawnSync('git', ['add', 'src/main/java/agent/Node.java'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'chore: direct route'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: fakeClaude },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /\.history\/agent\.history\.md/);
  assert.doesNotMatch(committed, /\.history\/common\.history\.md/);
});

test('history hook does not stage unstaged history config edits during routing migration', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-config-dirty-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  fs.mkdirSync(path.join(projectDir, 'src', 'main', 'java', 'agent'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, 'src', 'main', 'java', 'agent', 'Node.java'), 'class Node {}\n');
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(
    path.join(projectDir, '.consis-history.json'),
    JSON.stringify({ model: 'sonnet', maxTurns: 3, historyFile: '.history/project.history.md', readmeFile: 'README.md' }, null, 2) + '\n',
  );
  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, '.consis-history.json'), '\n');
  fs.appendFileSync(path.join(projectDir, 'src', 'main', 'java', 'agent', 'Node.java'), '// change\n');
  spawnSync('git', ['add', 'src/main/java/agent/Node.java'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'chore: dirty config guard'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'missing-claude.js') },
  });

  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /\.consis-history\.json/);
  const staged = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(staged, /src\/main\/java\/agent\/Node\.java/);
  assert.doesNotMatch(staged, /\.consis-history\.json/);
});

test('history hook records history system changes in history history file', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-managed-only-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, 'scripts', 'consis-history.js'), '\n// managed update\n');
  fs.appendFileSync(path.join(projectDir, '.githooks', 'pre-commit'), '\n# managed update\n');
  fs.appendFileSync(path.join(projectDir, '.consis-history.json'), '\n');
  fs.writeFileSync(path.join(projectDir, '.env.example'), 'HISTORY_DISABLE=0\nHISTORY_AI_TOOL=codex\n');
  const fakeClaude = path.join(projectDir, 'fake-claude.js');
  fs.writeFileSync(
    fakeClaude,
    "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'history 설정 정리',readmeBullets:['history hook 설정을 정리했습니다.'],historyEntryMarkdown:'### history 설정 정리\\\\n\\\\n- **작업자**: Test Worker\\\\n- history hook 설정과 생성 스크립트를 정리했습니다.',classification:'chore'})})))",
  );
  spawnSync('git', ['add', 'scripts/consis-history.js', '.githooks/pre-commit', '.consis-history.json', '.env.example'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'chore: history 관리 파일 정리'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: fakeClaude },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /scripts\/consis-history\.js/);
  assert.match(committed, /\.githooks\/pre-commit/);
  assert.match(committed, /\.consis-history\.json/);
  assert.match(committed, /\.env\.example/);
  assert.match(committed, /README\.md/);
  assert.match(committed, /\.history\/history\.history\.md/);
  assert.doesNotMatch(committed, /\.history\/common\.history\.md/);
});

test('history hook lets process environment override .env values', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-env-override-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, '.env'), 'HISTORY_DISABLE=0\nHISTORY_AI_TOOL=claude\n');
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("skip");\n');
  spawnSync('git', ['add', '.'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: env override'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  assert.match(commit.stdout + commit.stderr, /hook disabled by HISTORY_DISABLE=1/);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /app\.js/);
  assert.doesNotMatch(committed, /README\.md/);
  assert.equal(fs.existsSync(path.join(projectDir, '.history')), false);
});

test('history hook parses .env without executing shell syntax', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-dotenv-safe-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  const marker = path.join(projectDir, 'shell-executed.txt');
  fs.writeFileSync(
    path.join(projectDir, '.env'),
    [
      'HISTORY_DISABLE=1',
      'HISTORY_AI_TOOL=codex',
      'HISTORY_AI_BIN=should-not-load',
      'SHELL_PAYLOAD=$(echo bad)',
      'BROKEN LINE',
      'TOUCH_MARKER=' + marker.replace(/\\/g, '/'),
    ].join('\n') + '\n',
  );
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("dotenv");\n');
  spawnSync('git', ['add', 'app.js'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: dotenv safe'], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  assert.match(commit.stdout + commit.stderr, /hook disabled by HISTORY_DISABLE=1/);
  assert.equal(fs.existsSync(marker), false);
});

test('history hook records README-only changes as docs history', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-readme-only-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  const fakeClaude = path.join(projectDir, 'fake-claude.js');
  fs.writeFileSync(
    fakeClaude,
    "process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({result:JSON.stringify({title:'README 정리',readmeBullets:['README 내용을 정리했습니다.'],historyEntryMarkdown:'### README 정리\\\\n\\\\n- **작업자**: Test Worker',classification:'docs'})})))",
  );
  spawnSync('git', ['add', '.'], { cwd: projectDir });
  const baseline = spawnSync('git', ['commit', '-m', 'chore: baseline'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DISABLE: '1' },
  });
  assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

  fs.appendFileSync(path.join(projectDir, 'README.md'), '\nUsage note.\n');
  spawnSync('git', ['add', 'README.md'], { cwd: projectDir });
  const commit = spawnSync('git', ['commit', '-m', 'docs: README 정리'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: fakeClaude },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /README\.md/);
  assert.match(committed, /\.history\/docs\.history\.md/);
});

test('history hook excludes large diff content from Claude input', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-large-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, 'large.txt'), 'LARGE_CONTENT_MARKER\n'.repeat(10000));
  fs.writeFileSync(
    path.join(projectDir, 'fake-claude.js'),
    `let input = ''; process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  if (input.includes('LARGE_' + 'CONTENT_MARKER') || !input.includes('large.txt (large diff)')) process.exit(4);
  process.stdout.write(JSON.stringify({result: JSON.stringify({
    title: 'Large file metadata',
    readmeBullets: ['대형 파일 변경을 기록했습니다.'],
    historyEntryMarkdown: '### Large file metadata\\\\n\\\\n- **작업자**: Test Worker',
    classification: 'chore'
  })}));
});\n`,
  );
  spawnSync('git', ['add', '.'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: add large file'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'fake-claude.js') },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
});

test('history hook scans excluded large files for sensitive content', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-large-secret-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(
    path.join(projectDir, 'large-config.txt'),
    'padding\n'.repeat(20000) + 'AKIA1234567890ABCDEF\n',
  );
  spawnSync('git', ['add', 'large-config.txt'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: add large config'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'missing-claude.js') },
  });

  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /민감정보 가능성이 있는 staged 변경/);
  assert.match(commit.stderr, /large-config\.txt/);
});

test('history hook includes non-ASCII file diffs', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-unicode-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'README.md'), '# Sample\n');
  fs.writeFileSync(path.join(projectDir, '한글.txt'), 'UNICODE_FILE_MARKER\n');
  fs.writeFileSync(
    path.join(projectDir, 'fake-claude.js'),
    `let input = ''; process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  if (!input.includes('한글.txt') || !input.includes('UNICODE_' + 'FILE_MARKER')) process.exit(5);
  process.stdout.write(JSON.stringify({result: JSON.stringify({
    title: 'Unicode file',
    readmeBullets: ['한글 파일 변경을 기록했습니다.'],
    historyEntryMarkdown: '### Unicode file\\\\n\\\\n- **작업자**: Test Worker',
    classification: 'docs'
  })}));
});\n`,
  );
  spawnSync('git', ['add', '.'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'docs: add Korean file'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'fake-claude.js') },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
});

test('history hook blocks direct commits on main before calling Claude', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-main-'));
  spawnSync('git', ['init', '-b', 'main'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("blocked");\n');
  spawnSync('git', ['add', 'app.js'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'feat: blocked'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'missing-claude.js') },
  });

  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /main 브랜치 직접 커밋/);
  assert.match(spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout, /app\.js/);
});

test('history hook aborts commit and keeps staged source when Claude fails', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-failure-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("kept");\n');
  fs.writeFileSync(path.join(projectDir, 'failing-claude.js'), 'process.exit(2);\n');
  spawnSync('git', ['add', 'app.js'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'feat: should fail'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'failing-claude.js') },
  });

  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /claude CLI 실행 실패/i);
  assert.match(spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout, /app\.js/);
  assert.equal(fs.existsSync(path.join(projectDir, '.history', 'project.history.md')), false);
});

test('history hook can continue without history when Claude fails and HISTORY_ON_ERROR=continue', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-failure-continue-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, 'app.js'), 'console.log("continue");\n');
  fs.writeFileSync(path.join(projectDir, 'failing-claude.js'), 'process.exit(2);\n');
  spawnSync('git', ['add', 'app.js'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'feat: continue without history'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      CONSIS_CLAUDE_BIN: path.join(projectDir, 'failing-claude.js'),
      HISTORY_ON_ERROR: 'continue',
    },
  });

  assert.equal(commit.status, 0, commit.stderr || commit.stdout);
  assert.match(commit.stderr, /history 생성 없이 커밋을 계속/);
  const committed = spawnSync('git', ['show', '--name-only', '--format='], {
    cwd: projectDir,
    encoding: 'utf8',
  }).stdout;
  assert.match(committed, /app\.js/);
  assert.doesNotMatch(committed, /README\.md/);
  assert.equal(fs.existsSync(path.join(projectDir, '.history', 'project.history.md')), false);
});

test('history hook blocks sensitive staged files before calling Claude', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-history-secret-'));
  spawnSync('git', ['init', '-b', 'develop'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.name', 'Test Worker'], { cwd: projectDir });
  spawnSync('git', ['config', 'user.email', 'worker@example.com'], { cwd: projectDir });
  await run(['apply', 'history', '--tool', 'claude', '--scope', 'project', '--project-path', projectDir]);
  fs.writeFileSync(path.join(projectDir, '.env'), 'EXAMPLE_SECRET=not-a-real-secret\n');
  spawnSync('git', ['add', '.env'], { cwd: projectDir });

  const commit = spawnSync('git', ['commit', '-m', 'chore: add environment'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, CONSIS_CLAUDE_BIN: path.join(projectDir, 'missing-claude.js') },
  });

  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /민감정보 가능성이 있는 staged 변경/);
  assert.match(commit.stderr, /\.env/);
});

test('auto mode adds docs but not common for default claude target', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-auto-'));

  await run(['react-ts', '--auto', '--project-path', projectDir]);

  const claudeOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeOutput, /ai-team-rules:start react-ts/);
  assert.match(claudeOutput, /ai-team-rules:start docs/);
  assert.doesNotMatch(claudeOutput, /ai-team-rules:start common/);
  assert.match(claudeOutput, /\/ai-instructions/);
  assert.match(claudeOutput, /작업 전\/후 규칙 확인/);
  assert.match(claudeOutput, /적용할 규칙 이름/);
  assert.match(claudeOutput, /프론트엔드 상시 규칙/);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'react-ts', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'rules', 'react-ts.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);

  const reactRulesOutput = fs.readFileSync(path.join(projectDir, '.claude', 'rules', 'react-ts.md'), 'utf8');
  assert.match(reactRulesOutput, /SOLID를 React에 적용/);
  assert.match(reactRulesOutput, /완료 전 필수 검문/);
});

test('auto mode with codex writes codex docs hint and skill file', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-auto-codex-'));

  await run(['apply', 'spring', '--auto', '--tool', 'codex', '--project-path', projectDir]);

  const agentsOutput = fs.readFileSync(path.join(projectDir, 'AGENTS.md'), 'utf8');
  assert.match(agentsOutput, /ai-team-rules:start spring-boot/);
  assert.match(agentsOutput, /ai-team-rules:start docs/);
  assert.match(agentsOutput, /\$ai-instructions/);
  assert.match(agentsOutput, /Spring Boot/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'spring-boot', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'ai-instructions', 'SKILL.md')), true);
});

test('list can load packs from remote directory json', async () => {
  const payload = JSON.stringify([
    {
      id: 'ai-base-rules',
      title: 'AI 기본 규칙',
      rules: [{ id: 'base-rules', title: '전역 기본 규칙', content: '# Base\n\n- a' }],
    },
    {
      id: 'security-standards',
      title: '보안 표준',
      rules: [{ id: 'common-security', title: '공통 보안', content: '# Sec\n\n- s' }],
    },
    {
      id: 'git-workflow',
      title: 'Git 워크플로우',
      rules: [{ id: 'commit-messages', title: '커밋 메시지 규칙', content: '# Commit\n\n- c' }],
    },
    {
      id: 'harness-safety',
      title: '하네스 안전 규칙',
      rules: [{ id: 'git-safety', title: 'Git 안전 규칙', content: '# Git\n\n- b' }],
    },
    {
      id: 'react-typescript',
      title: 'React + TypeScript',
      rules: [{ id: 'stack-libraries', title: '스택 / 라이브러리 표준', content: '# React / TypeScript 스택 표준\n\n## 기반\n- React 18.3.x + TypeScript (strict 모드, `noUnusedLocals`, `noUnusedParameters`)\n- Vite 5.x (신규 프로젝트 고정). 기존 6.x 프로젝트는 유지하되 신규 도입은 5로.\n- Node 18+, 패키지 매니저는 pnpm. 모노레포는 pnpm + Turbo.\n\n## 상태 관리\n- **전역 상태**: `zustand` + `persist` 미들웨어 (localStorage).\n- **서버 상태**: `@tanstack/react-query` + `axios`.\n- **로컬 상태**: `useState`/`useReducer` — 컴포넌트 경계 안에서.\n\n## 라우팅\n- `react-router-dom` 7.1.x.\n- 라우트 정의는 `src/router/` 또는 `App.tsx` 상단에 집중. 인라인 라우트 정의 금지.\n\n## 스타일\n- Tailwind CSS 기본. 상세 스타일링/UI 규약은 `ui-styling` 룰 참고.\n- 추가 UI 라이브러리는 기존 프로젝트 선택을 따른다 (weai-front-admin: shadcn-ui + Flowbite, system-admin-front: Ant Design). 임의 추가 금지.\n- CSS-in-JS(styled-components, emotion)는 신규 도입 금지.\n\n## 폼\n- 소규모는 컴포넌트 내부 상태로 처리.\n- 검증·에러가 복잡해지면 합의 후 `react-hook-form` 도입 검토.\n\n## 신규 도입 금지 (기존 스택으로 통일)\n- Redux, Recoil, Jotai, SWR, MobX.\n- Moment.js (대신 `date-fns` 또는 네이티브 Intl).\n- styled-components, emotion.' }],
    },
    {
      id: 'spring-boot',
      title: 'Spring Boot',
      rules: [{ id: 'architecture', title: '아키텍처 규칙', content: '# Spring\n\n- c' }],
    },
    {
      id: 'nestjs',
      title: 'NestJS',
      rules: [{ id: 'stack-architecture', title: '스택 / 아키텍처 표준', content: '# NestJS\n\n- n' }],
    },
    {
      id: 'ai-instructions',
      title: 'AI 지침 문서',
      rules: [{ id: 'root-router', title: '루트 문서는 짧은 라우터로 유지', content: '# Root\n\n- d' }],
    },
  ]);

  const outputChunks = [];
  const originalLog = console.log;
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(payload);
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  console.log = (value) => {
    outputChunks.push(String(value));
  };

  try {
    await run(['list', '--source-url', `http://127.0.0.1:${port}/packs.json`]);
  } finally {
    console.log = originalLog;
    await new Promise((resolve) => server.close(resolve));
  }

  assert.match(outputChunks.join('\n'), /react-ts\tproject\t1 rules\tReact \+ TypeScript/);
});

test('remote source is supplemented with bundled packs that are not deployed yet', async () => {
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify([
      {
        id: 'react-typescript',
        title: 'Remote React',
        rules: [],
      },
    ]));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(String(message));

  try {
    await run(['list', '--source-url', `http://127.0.0.1:${port}/packs.json`]);
  } finally {
    console.log = originalLog;
    await new Promise((resolve) => server.close(resolve));
  }

  assert.match(logs.join('\n'), /history/);
  assert.match(logs.join('\n'), /python/);
});

test('remote source fetch times out and falls back to bundled packs', async () => {
  const server = http.createServer(() => {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const previousTimeout = process.env.AI_TEAM_RULES_FETCH_TIMEOUT_MS;
  process.env.AI_TEAM_RULES_FETCH_TIMEOUT_MS = '50';

  try {
    const startedAt = Date.now();
    await run(['list', '--source-url', `http://127.0.0.1:${port}/packs.json`]);
    assert.ok(Date.now() - startedAt < 1000);
  } finally {
    if (previousTimeout === undefined) delete process.env.AI_TEAM_RULES_FETCH_TIMEOUT_MS;
    else process.env.AI_TEAM_RULES_FETCH_TIMEOUT_MS = previousTimeout;
    await new Promise((resolve) => server.close(resolve));
  }
});
