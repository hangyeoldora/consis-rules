const sourcePacks = require('../packs.source.json');

const PACK_ALIASES = {
  common: ['ai-base-rules', 'harness-safety'],
  'react-ts': ['react-typescript'],
  'spring-boot': ['spring-boot'],
  docs: ['ai-instructions'],
};

const PACK_ORDER = ['common', 'react-ts', 'spring-boot', 'docs'];

function getPackSource(id) {
  const pack = sourcePacks.find((entry) => entry.id === id);
  if (!pack) {
    throw new Error(`Unknown source pack: ${id}`);
  }
  return pack;
}

function getPackDefinitions() {
  return PACK_ORDER.map((name) => {
    const sourceIds = PACK_ALIASES[name];
    const source = sourceIds.map(getPackSource);
    const titles = source.map((entry) => entry.title);
    const ruleCount = source.reduce((count, entry) => count + entry.rules.length, 0);
    const defaultScope = name === 'common' ? 'global' : 'project';

    return {
      name,
      sourceIds,
      titles,
      defaultScope,
      ruleCount,
      description: titles.join(' + '),
      content: renderPackContent(name, source),
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

module.exports = {
  PACK_ORDER,
  getPackDefinitions,
};

