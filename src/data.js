const { PACK_ID_MAP } = require('./source-loader');

const PACK_SPECS = {
  common: {
    sourceIds: [PACK_ID_MAP.common, PACK_ID_MAP.security, PACK_ID_MAP['git-workflow']],
    defaultScope: 'global',
    aliases: ['base'],
  },
  security: {
    sourceIds: [PACK_ID_MAP.security],
    defaultScope: 'global',
    aliases: ['security-standards'],
  },
  'git-workflow': {
    sourceIds: [PACK_ID_MAP['git-workflow']],
    defaultScope: 'global',
    aliases: ['git', 'git-flow'],
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

const PACK_ORDER = ['common', 'security', 'git-workflow', 'safety', 'react-ts', 'spring-boot', 'docs'];

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

// Claude 전용 요약 — .claude/rules/*.md는 자동 로드되므로 루트에는 포인터만 남긴다.
function renderReactTsRootContent() {
  return '# Consis Rules: react-ts\n\n- 프론트엔드 상시 규칙: `@.claude/rules/react-ts.md` (Claude Code가 세션마다 자동 로드).\n';
}

function renderSpringBootRootContent() {
  return '# Consis Rules: spring-boot\n\n- 백엔드 상시 규칙: `@.claude/rules/spring-boot.md` (Claude Code가 세션마다 자동 로드).\n';
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
    common: '팀 공통 AI 작업 기본 규칙, 보안 표준, Git 워크플로우를 항상 적용한다.',
    security: '프론트엔드/공통 보안 및 AI 도구 보안 규칙을 항상 적용한다.',
    'git-workflow': '커밋 메시지와 PR/브랜치 워크플로우 규칙을 항상 적용한다.',
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
