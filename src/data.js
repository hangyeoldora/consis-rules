const sourcePacks = require('../packs.source.json');

const PACK_SPECS = {
  common: {
    sourceIds: ['ai-base-rules'],
    defaultScope: 'global',
    aliases: ['base'],
  },
  safety: {
    sourceIds: ['harness-safety'],
    defaultScope: 'global',
    aliases: ['harness', 'harness-safety'],
  },
  'react-ts': {
    sourceIds: ['react-typescript'],
    defaultScope: 'project',
    aliases: ['react', 'react-typescript'],
  },
  'spring-boot': {
    sourceIds: ['spring-boot'],
    defaultScope: 'project',
    aliases: ['spring'],
  },
  docs: {
    sourceIds: ['ai-instructions'],
    defaultScope: 'project',
    aliases: ['document', 'documents', 'ai-instructions'],
  },
};

const PACK_ORDER = ['common', 'safety', 'react-ts', 'spring-boot', 'docs'];

function getPackSource(id) {
  const pack = sourcePacks.find((entry) => entry.id === id);
  if (!pack) {
    throw new Error(`Unknown source pack: ${id}`);
  }
  return pack;
}

function getPackDefinitions() {
  return PACK_ORDER.map((name) => {
    const spec = PACK_SPECS[name];
    const sourceIds = spec.sourceIds;
    const source = getSourcePacksForName(name);
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
    };
  });
}

function getSourcePacksForName(name) {
  const spec = PACK_SPECS[name];
  if (!spec) {
    throw new Error(`Unknown pack spec: ${name}`);
  }

  return spec.sourceIds.map(getPackSource);
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
  const command = tool === 'codex' ? '$react-ts' : '/react-ts';
  const skillPath = tool === 'codex'
    ? '.agents/skills/react-ts/SKILL.md'
    : '.claude/skills/react-ts/SKILL.md';

  const lines = [
    '# Consis Rules: react-ts',
    '',
    '## 프론트엔드 기본 라우팅',
    '- 이 저장소의 프론트엔드 관련 작업은 React + TypeScript 기준으로 진행한다.',
    '- 기본 스택은 React 18, TypeScript strict, Tailwind, React Query, Zustand를 따른다.',
    '- 컴포넌트 구조, 렌더링 안전, 상태 관리 세부 규칙은 react-ts skill reference를 따른다.',
    '',
    '## Skill 위치 및 호출',
    `- Skill 파일: \`${skillPath}\``,
    `- 호출 명령: \`${command}\``,
  ];

  return `${lines.join('\n').trim()}\n`;
}

function renderSpringBootRootContent(tool) {
  const command = tool === 'codex' ? '$spring-boot' : '/spring-boot';
  const skillPath = tool === 'codex'
    ? '.agents/skills/spring-boot/SKILL.md'
    : '.claude/skills/spring-boot/SKILL.md';

  const lines = [
    '# Consis Rules: spring-boot',
    '',
    '## 백엔드 기본 라우팅',
    '- 이 저장소의 Spring Boot 관련 작업은 레이어드 아키텍처와 REST API 규칙을 기본으로 따른다.',
    '- 보안, 트랜잭션, 테스트 세부 규칙은 spring-boot skill reference를 따른다.',
    '',
    '## Skill 위치 및 호출',
    `- Skill 파일: \`${skillPath}\``,
    `- 호출 명령: \`${command}\``,
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
    '- 긴 절차와 상세 레퍼런스는 skill 폴더로 분리한다.',
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
    lines.push(`- 이 프로젝트는 \`${command}\` skill 호출을 전제로 문서 구조를 유지한다.`);
    lines.push('- 루트 문서에는 짧은 규칙만 두고, 긴 절차는 skill reference로 분리한다.');
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderDocsSkillContent(packs) {
  return renderPackSkillContent('ai-instructions', packs);
}

function renderPackSkillContent(skillName, packs) {
  const lines = [`# ${skillName}`];

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
  renderPackSkillContent,
};
