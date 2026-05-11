# ai-team-rules

[한국어](./README.md) | [English](./README.en.md) | [简体中文](./README.zh-CN.md)

A package designed to quickly align team collaboration rules across Claude, Codex, and Cursor.
It works well for both brand-new projects and existing production projects that need refactoring/cleanup.
Even with fully AI-native vibe coding, this helps you stabilize project rules, document structure, and shared workflows first.
Without extra setup work, running commands automatically creates Claude/Codex-compatible folders and documents for global or project scope.

**Included packs**:

- AI baseline rules
- Security/Harness rules
- Git workflow
- React + TypeScript
  - The react/ts rules include clean-code practices and commonly used folder structures inspired by high-quality React codebases such as Vercel, Toss, and Kakao.
- Spring Boot
- NestJS
  - Spring Boot and NestJS packs also include clean-code practices and boilerplate-style folder structures.
- Documentation structure rules (`docs`, `/ai-instructions`)
  - These rules summarize best practices for writing `CLAUDE.md/AGENTS.md` from official Claude and Codex documentation. This skill helps reduce context and token cost. Whether guide docs are missing or already exist, you can reorganize them properly with this skill.

<br/>

**You can view the rules here** => <a href="https://consis-rules-directory.pages.dev/" target="_blank" rel="noopener noreferrer">Consis Rules Directory</a>

## Install

```bash
npm install -g ai-team-rules
```

## Quick Start

```bash
# ex) react-ts & /ai-instructions setting (default: claude)
npx ai-team-rules react-ts --auto

# codex
npx ai-team-rules react-ts --auto --tool codex

# /ai-instructions setting
npx ai-team-rules docs
```

<br/>

### * react-ts

`react-ts` is not only style rules. It also includes folder structure, state management, rendering safety, and refactoring standards.  
You can use it consistently both for setting a baseline in new projects and for gradual cleanup in existing projects.
It also includes patterns and rules based on high-quality codebases such as Vercel, Toss, and Kakao.

### * Process when running docs(/ai-instructions)

- Add only a pointer in root `CLAUDE.md`
- Store full rules in `.claude/rules/react-ts.md`
- Auto-apply `docs` pack (including `/ai-instructions`)
- Auto-create required folders/files

Apply to Codex:

Codex has no official rules folder concept, so rules are inserted into `AGENTS.md` as a managed block.

If root `CLAUDE.md` and nested `CLAUDE.md` files already exist, applying Codex keeps root `AGENTS.md` as a summary pointer and references the CLAUDE doc hierarchy for detailed rules.

## Backend Packs

```bash
npx ai-team-rules spring-boot --auto
npx ai-team-rules nestjs --auto
```

Aliases:

```bash
npx ai-team-rules spring --auto
npx ai-team-rules nest --auto
```

## Commands

```bash
npx ai-team-rules <pack>
npx ai-team-rules apply <pack>
npx ai-team-rules list
npx ai-team-rules show <pack>
```

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--auto` | Automatically add `docs` to the selected pack | off |
| `--tool <tool>` | `claude`, `codex`, `cursor`, `all` | `claude` |
| `--scope <scope>` | `project`, `global` | pack default |
| `--project-path <path>` | Project path to apply | current path |
| `--source-url <url>` | Remote `packs.json` URL | default Directory URL |

## Packs

| Pack | Scope | Description |
| --- | --- | --- |
| `common` | global | AI baseline rules + security standard + Git workflow |
| `security` | global | Frontend/common/AI tool security |
| `git-workflow` | global | Commit message + PR/branch rules |
| `safety` | global | Destructive commands, Git, log exposure safety |
| `react-ts` | project | React + TypeScript always-on rules |
| `spring-boot` | project | Spring Boot always-on rules |
| `nestjs` | project | NestJS always-on rules |
| `docs` | project | Root doc routing + AI doc structure skill |

## Aliases

| Alias | pack |
| --- | --- |
| `base` | `common` |
| `security-standards` | `security` |
| `git`, `git-flow` | `git-workflow` |
| `harness`, `harness-safety` | `safety` |
| `react`, `react-typescript` | `react-ts` |
| `spring` | `spring-boot` |
| `nest` | `nestjs` |
| `document`, `documents`, `ai-instructions` | `docs` |

## References

- [Anthropic Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Cursor Rules docs](https://cursor.com/docs/context/rules)