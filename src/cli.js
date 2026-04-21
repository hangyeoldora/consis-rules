const path = require('path');
const { getPackDefinitions, PACK_ORDER } = require('./data');
const {
  detectTool,
  getTargetPath,
  upsertManagedBlock,
  writeCursorFile,
} = require('./filesystem');

async function run(argv) {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
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
  const packName = args[0];
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
  const unknownPacks = parsed.packNames.filter((name) => !packMap[name]);

  if (parsed.packNames.length === 0) {
    throw new Error('Usage: consis-rules apply <pack...> [--tool codex|claude|cursor] [--scope global|project] [--project-path path]');
  }

  if (unknownPacks.length > 0) {
    throw new Error(`Unknown packs: ${unknownPacks.join(', ')}`);
  }

  const projectPath = path.resolve(parsed.projectPath || process.cwd());
  const tool = parsed.tool || detectTool(projectPath);
  validateTool(tool);

  const scope = parsed.scope || inferDefaultScope(parsed.packNames, packMap);
  validateScope(scope);

  for (const packName of parsed.packNames) {
    const pack = packMap[packName];
    const targetPath = getTargetPath({
      tool,
      scope,
      projectPath,
      packName,
    });

    if (tool === 'cursor') {
      writeCursorFile(targetPath, pack.content);
    } else {
      upsertManagedBlock(targetPath, packName, pack.content);
    }

    console.log(`applied ${packName} -> ${targetPath}`);
  }
}

function parseApplyArgs(args) {
  const packNames = [];
  let tool = null;
  let scope = null;
  let projectPath = null;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--tool') {
      tool = args[index + 1];
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
    tool,
    scope,
    projectPath,
  };
}

function inferDefaultScope(packNames, packMap) {
  const defaults = packNames.map((name) => packMap[name].defaultScope);
  return defaults.every((scope) => scope === 'global') ? 'global' : 'project';
}

function getPackMap() {
  return Object.fromEntries(
    getPackDefinitions().map((pack) => [pack.name, pack])
  );
}

function validateTool(tool) {
  if (!['codex', 'claude', 'cursor'].includes(tool)) {
    throw new Error(`Unsupported tool: ${tool}`);
  }
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
  consis-rules apply <pack...> [--tool codex|claude|cursor] [--scope global|project] [--project-path path]

Packs:
  ${PACK_ORDER.join(', ')}
`);
}

module.exports = {
  run,
};

