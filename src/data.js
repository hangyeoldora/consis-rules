const { PACK_ID_MAP } = require('./source-loader');

const PACK_SPECS = {
  common: {
    sourceIds: [PACK_ID_MAP.common],
    defaultScope: 'global',
    aliases: ['base'],
  },
  safety: {
    sourceIds: [PACK_ID_MAP.safety],
    defaultScope: 'global',
    aliases: ['harness', 'harness-safety'],
  },
  'react-ts': {
    sourceIds: [PACK_ID_MAP['react-ts']],
    defaultScope: 'project',
    aliases: ['react', 'react-typescript'],
  },
  'spring-boot': {
    sourceIds: [PACK_ID_MAP['spring-boot']],
    defaultScope: 'project',
    aliases: ['spring'],
  },
  docs: {
    sourceIds: [PACK_ID_MAP.docs],
    defaultScope: 'project',
    aliases: ['document', 'documents', 'ai-instructions'],
  },
};

const PACK_ORDER = ['common', 'safety', 'react-ts', 'spring-boot', 'docs'];

function getPackSource(sourcePacks, id) {
  const pack = sourcePacks.find((entry) => entry.id === id);
  if (!pack) {
    throw new Error(`Unknown source pack: ${id}`);
  }
  return pack;
}

function getPackDefinitions(sourcePacks) {
  return PACK_ORDER.map((name) => {
    const spec = PACK_SPECS[name];
    const sourceIds = spec.sourceIds;
    const source = getSourcePacksForName(sourcePacks, name);
    const titles = source.map((entry) => entry.title);
    const ruleCount = source.reduce((count, entry) => count + entry.rules.length, 0);
    const defaultScope = spec.defaultScope;

    return {
      name,
      sourceIds,
      aliases: spec.aliases,
      titles,
      defaultScope,
      ruleCount,
      description: titles.join(' + '),
      content: renderPackContent(name, source),
      cursorDescription: getCursorRuleDescription(name),
    };
  });
}

function getSourcePacksForName(sourcePacks, name) {
  const spec = PACK_SPECS[name];
  if (!spec) {
    throw new Error(`Unknown pack spec: ${name}`);
  }

  return spec.sourceIds.map((id) => getPackSource(sourcePacks, id));
}

function renderPackContent(name, packs) {
  const lines = [`# Consis Rules: ${name}`, ''];

  for (const pack of packs) {
    lines.push(`## ${pack.title}`);
    lines.push('');

    for (const rule of pack.rules) {
      lines.push(`### ${rule.title}`);
      lines.push('');
      lines.push(rule.content.trim());
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderReactTsRootContent(tool) {
  const lines = [
    '# Consis Rules: react-ts',
    '',
    '## 프론트엔드 상시 규칙',
    '- 이 저장소의 프론트엔드 관련 작업은 React + TypeScript 기준으로 진행한다.',
    '- 기본 스택은 React 18, TypeScript strict, Tailwind, React Query, Zustand를 따른다.',
    '- 라우팅은 `react-router-dom` 기준으로 정리하고, 인라인 라우트 정의를 피한다.',
    '- 상태 관리는 전역 상태와 서버 상태의 책임을 분리한다.',
    '- 컴포넌트는 단일 책임을 유지하고, 렌더링 중 상태 변경을 금지한다.',
    '- 스타일은 Tailwind 중심으로 일관되게 유지하고 스타일링 시스템 혼용을 피한다.',
    '- 폴더 구조, 훅 규칙, 렌더링 안전, UI 세부 기준은 이 규칙 블록을 상시 기준으로 해석한다.',
    '',
    '## 적용 방식',
    '- 이 규칙은 필요할 때 호출하는 skill이 아니라, 프론트 작업 전반에 항상 적용되는 기본 규칙이다.',
  ];

  return `${lines.join('\n').trim()}\n`;
}

function renderSpringBootRootContent(tool) {
  const lines = [
    '# Consis Rules: spring-boot',
    '',
    '## 백엔드 상시 규칙',
    '- 이 저장소의 Spring Boot 관련 작업은 레이어드 아키텍처와 REST API 규칙을 기본으로 따른다.',
    '- Controller → Service → Repository 단방향 구조와 DTO 경계를 유지한다.',
    '- 입력 검증, 인증/인가, SQL 인젝션 방지 같은 보안 기준을 기본값으로 적용한다.',
    '- 트랜잭션 경계, 테스트 전략, 에러 응답 형식을 일관되게 유지한다.',
    '',
    '## 적용 방식',
    '- 이 규칙은 필요할 때 호출하는 skill이 아니라, Spring Boot 작업 전반에 항상 적용되는 기본 규칙이다.',
  ];

  return `${lines.join('\n').trim()}\n`;
}

function renderDocsRootContent(tool, { autoMode = false } = {}) {
  const command = tool === 'codex' ? '$ai-instructions' : '/ai-instructions';
  const skillPath = tool === 'codex'
    ? '.agents/skills/ai-instructions/SKILL.md'
    : '.claude/skills/ai-instructions/SKILL.md';
  const lines = [
    '# Consis Rules: docs',
    '',
    '## AI 지침 문서 운영 원칙',
    '- 루트 `AGENTS.md`와 `CLAUDE.md`는 짧은 라우터 문서로 유지한다.',
    '- 상시 적용돼야 하는 기술 규칙은 루트 또는 하위 rules/지침 문서 계층에 둔다.',
    '- 긴 절차와 문서 정리 플레이북만 skill 폴더로 분리한다.',
    '- 하위 문서는 실제 코드 책임이 있는 디렉터리 가까이에 둔다.',
    '- 기본 응답 언어는 한국어로 유지한다.',
    '',
    '## Skill 위치 및 호출',
    `- Skill 파일: \`${skillPath}\``,
    `- 호출 명령: \`${command}\``,
  ];

  if (autoMode) {
    lines.push('');
    lines.push('## Auto 모드 안내');
    lines.push(`- 이 프로젝트는 필요할 때 \`${command}\`로 문서 구조를 정리하는 흐름을 사용한다.`);
    lines.push('- 루트 문서에는 짧은 규칙만 두고, 긴 절차와 문서 리팩터링 가이드는 skill reference로 분리한다.');
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderDocsSkillContent(packs) {
  return renderPackSkillContent('ai-instructions', packs);
}

function renderCursorRuleContent(packName, content) {
  const lines = [
    '---',
    `description: ${getCursorRuleDescription(packName)}`,
    'globs: []',
    'alwaysApply: true',
    '---',
    '',
    content.trim(),
  ];

  return `${lines.join('\n').trim()}\n`;
}

function renderPackSkillContent(skillName, packs) {
  const lines = [
    '---',
    `name: ${skillName}`,
    `description: ${getSkillDescription(skillName)}`,
    '---',
    '',
    `# ${skillName}`,
  ];

  for (const pack of packs) {
    lines.push('');
    lines.push(`## ${pack.title}`);

    for (const rule of pack.rules) {
      lines.push(`### ${rule.title}`);
      lines.push(normalizeSkillRuleContent(rule.content));
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function normalizeSkillRuleContent(content) {
  const lines = content.trim().split('\n');
  const withoutTopHeading = lines[0]?.startsWith('# ') ? lines.slice(1) : lines;
  const normalized = withoutTopHeading.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  return normalized.trim();
}

function getSkillDescription(skillName) {
  const descriptions = {
    'ai-instructions': 'AGENTS.md, CLAUDE.md, Cursor rules를 짧은 라우터 문서와 하위 규칙 문서, 필요 시 호출하는 문서 정리 가이드 구조로 재정리한다.',
  };

  return descriptions[skillName] || `Use the ${skillName} workflow when its named domain applies.`;
}

function getCursorRuleDescription(packName) {
  const descriptions = {
    common: '팀 공통 AI 작업 기본 규칙을 항상 적용한다.',
    safety: '파괴적 명령과 Git, 로그 노출 관련 안전 규칙을 항상 적용한다.',
    'react-ts': 'React와 TypeScript 프론트엔드 작업 규칙을 항상 적용한다.',
    'spring-boot': 'Spring Boot 백엔드 작업 규칙을 항상 적용한다.',
    docs: 'AI 지침 문서 구조와 문서 정리 원칙을 항상 적용한다.',
  };

  return descriptions[packName] || `${packName} 규칙을 항상 적용한다.`;
}

function resolvePackName(input) {
  if (!input) return null;

  const normalized = input.trim();
  if (PACK_SPECS[normalized]) {
    return normalized;
  }

  for (const name of PACK_ORDER) {
    const aliases = PACK_SPECS[name].aliases || [];
    if (aliases.includes(normalized)) {
      return name;
    }
  }

  return normalized;
}

module.exports = {
  PACK_ORDER,
  getPackDefinitions,
  getSourcePacksForName,
  resolvePackName,
  renderReactTsRootContent,
  renderSpringBootRootContent,
  renderDocsRootContent,
  renderDocsSkillContent,
  renderCursorRuleContent,
  renderPackSkillContent,
};
