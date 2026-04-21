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
    const source = sourceIds.map(getPackSource);
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
      content: name === 'docs'
        ? renderDocsRootContent(name, source)
        : renderPackContent(name, source),
      skillContent: name === 'docs'
        ? renderDocsSkillContent(source)
        : null,
    };
  });
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

function renderDocsRootContent(name, packs) {
  const pack = packs[0];
  const lines = [
    `# Consis Rules: ${name}`,
    '',
    '## AI 지침 문서 운영 원칙',
    '- 루트 `AGENTS.md`와 `CLAUDE.md`는 짧은 라우터 문서로 유지한다.',
    '- 긴 절차와 상세 레퍼런스는 skill 폴더로 분리한다.',
    '- 하위 문서는 실제 코드 책임이 있는 디렉터리 가까이에 둔다.',
    '- 기본 응답 언어는 한국어로 유지한다.',
    '',
    '## Skill 위치',
    '- Claude: `.claude/skills/ai-instructions/SKILL.md`',
    '- Codex: `.agents/skills/ai-instructions/SKILL.md`',
    '',
    '## 참고',
    `- 원본 pack: ${pack.title}`,
  ];

  return `${lines.join('\n').trim()}\n`;
}

function renderDocsSkillContent(packs) {
  const lines = ['# ai-instructions', ''];

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
  resolvePackName,
};
