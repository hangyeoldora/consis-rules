const path = require('path');
const {
  getPackDefinitions,
  PACK_ORDER,
  getSourcePacksForName,
  resolvePackName,
  renderReactTsRootContent,
  renderSpringBootRootContent,
  renderNestjsRootContent,
  renderCodexClaudeReferenceContent,
  renderDocsRootContent,
  renderDocsSkillContent,
  renderCursorRuleContent,
} = require('./data');
const {
  getTargetPath,
  getDocsSkillPath,
  getPackRulesPath,
  hasRootAndNestedClaude,
  upsertManagedBlock,
  writeCursorFile,
} = require('./filesystem');
const { DEFAULT_SOURCE_URL, loadSourcePacks } = require('./source-loader');

async function run(argv) {
  const sourceState = await loadSourcePacks({
    sourceUrl: extractSourceUrl(argv),
  });
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    printSourceNotice(sourceState);
    return;
  }

  if (resolvePackName(command) && getPackMap(sourceState.sourcePacks)[resolvePackName(command)]) {
    await handleApply(sourceState, [command, ...rest]);
    return;
  }

  if (command === 'list') {
    handleList(sourceState);
    return;
  }

  if (command === 'show') {
    handleShow(sourceState, rest);
    return;
  }

  if (command === 'apply') {
    await handleApply(sourceState, rest);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function handleList(sourceState) {
  const packs = getPackDefinitions(sourceState.sourcePacks);

  for (const pack of packs) {
    console.log(`${pack.name}\t${pack.defaultScope}\t${pack.ruleCount} rules\t${pack.description}`);
  }
}

function handleShow(sourceState, args) {
  const packName = resolvePackName(args[0]);
  if (!packName) {
    throw new Error('Usage: ai-team-rules show <pack>');
  }

  const pack = getPackMap(sourceState.sourcePacks)[packName];
  if (!pack) {
    throw new Error(`Unknown pack: ${packName}`);
  }

  console.log(pack.content);
}

async function handleApply(sourceState, args) {
  const parsed = parseApplyArgs(args);
  const packMap = getPackMap(sourceState.sourcePacks);
  const normalizedPackNames = expandPackNames(parsed.packNames.map(resolvePackName), parsed.autoMode);
  const unknownPacks = normalizedPackNames.filter((name) => !packMap[name]);

  if (normalizedPackNames.length === 0) {
    throw new Error('Usage: ai-team-rules apply <pack...> [--auto] [--tool codex|claude|cursor|all] [--scope global|project] [--project-path path]');
  }

  if (unknownPacks.length > 0) {
    throw new Error(`Unknown packs: ${unknownPacks.join(', ')}`);
  }

  const projectPath = path.resolve(parsed.projectPath || process.cwd());
  const tools = resolveTools(parsed.tools);
  tools.forEach(validateTool);

  const scope = parsed.scope || inferDefaultScope(normalizedPackNames, packMap);
  validateScope(scope);

  for (const tool of tools) {
    for (const packName of normalizedPackNames) {
      const pack = packMap[packName];
      const packContent = renderPackContentForTool(pack, tool, {
        autoMode: parsed.autoMode,
        scope,
        projectPath,
      });
      const targetPath = getTargetPath({
        tool,
        scope,
        projectPath,
        packName,
      });

      if (tool === 'cursor') {
        writeCursorFile(targetPath, packContent);
      } else {
        upsertManagedBlock(targetPath, packName, packContent);
      }

      if (shouldCreateRulesFile(packName, tool)) {
        const rulesPath = getPackRulesPath({ tool, scope, projectPath, packName });
        if (rulesPath) {
          writeCursorFile(rulesPath, pack.content);
          console.log(`applied ${packName} rules -> ${rulesPath}`);
        }
      }

      if (packName === 'docs' && tool !== 'cursor') {
        const skillPath = getDocsSkillPath({ tool, scope, projectPath });
        if (skillPath) {
          writeCursorFile(skillPath, renderDocsSkillContent(getSourcePacksForName(sourceState.sourcePacks, 'docs')));
          console.log(`applied ${packName} skill -> ${skillPath}`);
        }
      }

      console.log(`applied ${packName} -> ${targetPath}`);
    }
  }
}

function parseApplyArgs(args) {
  const packNames = [];
  const tools = [];
  let scope = null;
  let projectPath = null;
  let sourceUrl = null;
  let autoMode = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--auto') {
      autoMode = true;
      continue;
    }

    if (token === '--tool') {
      tools.push(args[index + 1]);
      index += 1;
      continue;
    }

    if (token === '--scope') {
      scope = args[index + 1];
      index += 1;
      continue;
    }

    if (token === '--project-path') {
      projectPath = args[index + 1];
      index += 1;
      continue;
    }

    if (token === '--source-url') {
      sourceUrl = args[index + 1];
      index += 1;
      continue;
    }

    packNames.push(token);
  }

  return {
    packNames,
    tools,
    scope,
    projectPath,
    sourceUrl,
    autoMode,
  };
}

function inferDefaultScope(packNames, packMap) {
  const defaults = packNames.map((name) => packMap[name].defaultScope);
  return defaults.every((scope) => scope === 'global') ? 'global' : 'project';
}

function getPackMap(sourcePacks) {
  const entries = [];

  for (const pack of getPackDefinitions(sourcePacks)) {
    entries.push([pack.name, pack]);
    for (const alias of pack.aliases || []) {
      entries.push([alias, pack]);
    }
  }

  return Object.fromEntries(entries);
}

function validateTool(tool) {
  if (!['codex', 'claude', 'cursor'].includes(tool)) {
    throw new Error(`Unsupported tool: ${tool}`);
  }
}

function resolveTools(toolArgs) {
  if (!toolArgs || toolArgs.length === 0) {
    return ['claude'];
  }

  const expanded = toolArgs
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => (value === 'all' ? ['claude', 'codex', 'cursor'] : [value]));

  return Array.from(new Set(expanded));
}

function expandPackNames(packNames, autoMode) {
  const expanded = [...packNames];

  if (autoMode && !expanded.includes('docs')) {
    expanded.push('docs');
  }

  return Array.from(new Set(expanded));
}

function renderPackContentForTool(pack, tool, options = {}) {
  const { autoMode = false, scope = 'project', projectPath = process.cwd() } = options;

  if (tool === 'cursor') {
    return renderCursorRuleContent(pack.name, pack.content);
  }

  // Claude는 .claude/rules/<pack>.md에 풀 내용이 별도 저장되므로
  // 루트 CLAUDE.md에는 1줄 포인터만 둔다.
  if (pack.name === 'react-ts' && tool === 'claude') {
    return renderReactTsRootContent();
  }

  if (pack.name === 'spring-boot' && tool === 'claude') {
    return renderSpringBootRootContent();
  }

  if (pack.name === 'nestjs' && tool === 'claude') {
    return renderNestjsRootContent();
  }

  // Codex는 rules 폴더 개념이 공식에 없어 AGENTS.md에 풀 내용을 둔다.
  if (pack.name === 'docs' && tool !== 'cursor') {
    return renderDocsRootContent(tool, { autoMode });
  }

  if (tool === 'codex' && scope === 'project' && hasRootAndNestedClaude(projectPath)) {
    return renderCodexClaudeReferenceContent(pack.name);
  }

  return pack.content;
}

function shouldCreateRulesFile(packName, tool) {
  return tool === 'claude' && ['react-ts', 'spring-boot', 'nestjs'].includes(packName);
}

function validateScope(scope) {
  if (!['global', 'project'].includes(scope)) {
    throw new Error(`Unsupported scope: ${scope}`);
  }
}

function printHelp() {
  console.log(`ai-team-rules

Commands:
  ai-team-rules list
  ai-team-rules show <pack>
  ai-team-rules apply <pack...> [--auto] [--tool codex|claude|cursor|all] [--scope global|project] [--project-path path] [--source-url url]

Packs:
  ${PACK_ORDER.join(', ')}
`);
}

function printSourceNotice(sourceState) {
  if (sourceState.sourceType === 'remote') {
    console.log(`\nSource: remote (${sourceState.sourceUrl})`);
    return;
  }

  if (sourceState.fallbackReason) {
    console.log(`\nSource: local fallback (${sourceState.fallbackReason})`);
  } else {
    console.log('\nSource: local');
  }
}

function extractSourceUrl(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source-url') {
      return argv[index + 1] || DEFAULT_SOURCE_URL;
    }
  }

  return null;
}

module.exports = {
  run,
};
