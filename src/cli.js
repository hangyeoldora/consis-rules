const path = require('path');
const {
  getPackDefinitions,
  PACK_ORDER,
  getSourcePacksForName,
  resolvePackName,
  renderReactTsRootContent,
  renderSpringBootRootContent,
  renderDocsRootContent,
  renderDocsSkillContent,
  renderPackSkillContent,
} = require('./data');
const {
  getTargetPath,
  getDocsSkillPath,
  getPackSkillPath,
  upsertManagedBlock,
  writeCursorFile,
} = require('./filesystem');

async function run(argv) {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (resolvePackName(command) && getPackMap()[resolvePackName(command)]) {
    handleApply([command, ...rest]);
    return;
  }

  if (command === 'list') {
    handleList();
    return;
  }

  if (command === 'show') {
    handleShow(rest);
    return;
  }

  if (command === 'apply') {
    handleApply(rest);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function handleList() {
  const packs = getPackDefinitions();

  for (const pack of packs) {
    console.log(`${pack.name}\t${pack.defaultScope}\t${pack.ruleCount} rules\t${pack.description}`);
  }
}

function handleShow(args) {
  const packName = resolvePackName(args[0]);
  if (!packName) {
    throw new Error('Usage: consis-rules show <pack>');
  }

  const pack = getPackMap()[packName];
  if (!pack) {
    throw new Error(`Unknown pack: ${packName}`);
  }

  console.log(pack.content);
}

function handleApply(args) {
  const parsed = parseApplyArgs(args);
  const packMap = getPackMap();
  const normalizedPackNames = expandPackNames(parsed.packNames.map(resolvePackName), parsed.autoMode);
  const unknownPacks = normalizedPackNames.filter((name) => !packMap[name]);

  if (normalizedPackNames.length === 0) {
    throw new Error('Usage: consis-rules apply <pack...> [--auto] [--tool codex|claude|cursor|all] [--scope global|project] [--project-path path]');
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
      const packContent = renderPackContentForTool(pack, tool, parsed.autoMode);
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

      if (shouldCreatePackSkill(packName, tool)) {
        const skillPath = getPackSkillPath({ tool, scope, projectPath, packName });
        if (skillPath) {
          writeCursorFile(skillPath, renderPackSkillContent(packName, getSourcePacksForName(packName)));
          console.log(`applied ${packName} skill -> ${skillPath}`);
        }
      }

      if (packName === 'docs' && tool !== 'cursor') {
        const skillPath = getDocsSkillPath({ tool, scope, projectPath });
        if (skillPath) {
          writeCursorFile(skillPath, renderDocsSkillContent(getSourcePacksForName('docs')));
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

    packNames.push(token);
  }

  return {
    packNames,
    tools,
    scope,
    projectPath,
    autoMode,
  };
}

function inferDefaultScope(packNames, packMap) {
  const defaults = packNames.map((name) => packMap[name].defaultScope);
  return defaults.every((scope) => scope === 'global') ? 'global' : 'project';
}

function getPackMap() {
  const entries = [];

  for (const pack of getPackDefinitions()) {
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

function renderPackContentForTool(pack, tool, autoMode) {
  if (pack.name === 'react-ts' && tool !== 'cursor') {
    return renderReactTsRootContent(tool);
  }

  if (pack.name === 'spring-boot' && tool !== 'cursor') {
    return renderSpringBootRootContent(tool);
  }

  if (pack.name === 'docs' && tool !== 'cursor') {
    return renderDocsRootContent(tool, { autoMode });
  }

  return pack.content;
}

function shouldCreatePackSkill(packName, tool) {
  return tool !== 'cursor' && ['react-ts', 'spring-boot'].includes(packName);
}

function validateScope(scope) {
  if (!['global', 'project'].includes(scope)) {
    throw new Error(`Unsupported scope: ${scope}`);
  }
}

function printHelp() {
  console.log(`consis-rules

Commands:
  consis-rules list
  consis-rules show <pack>
  consis-rules apply <pack...> [--auto] [--tool codex|claude|cursor|all] [--scope global|project] [--project-path path]

Packs:
  ${PACK_ORDER.join(', ')}
`);
}

module.exports = {
  run,
};
