const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
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
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);
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
  // security-standards
  assert.match(output, /보안 표준|AI 도구별 보안|XSS|시크릿/);
  // git-workflow
  assert.match(output, /커밋 메시지|PR \/ 브랜치|브랜치 안전|Git 워크플로우/);
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
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'spring-boot', 'SKILL.md')), false);
});

test('auto mode adds docs but not common for default claude target', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-team-rules-auto-'));

  await run(['react-ts', '--auto', '--project-path', projectDir]);

  const claudeOutput = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeOutput, /ai-team-rules:start react-ts/);
  assert.match(claudeOutput, /ai-team-rules:start docs/);
  assert.doesNotMatch(claudeOutput, /ai-team-rules:start common/);
  assert.match(claudeOutput, /\/ai-instructions/);
  assert.match(claudeOutput, /프론트엔드 상시 규칙/);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'react-ts', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'rules', 'react-ts.md')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'ai-instructions', 'SKILL.md')), true);
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
