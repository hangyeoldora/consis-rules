# ai-team-rules

[![npm version](https://img.shields.io/npm/v/ai-team-rules?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/ai-team-rules)
[![npm downloads](https://img.shields.io/npm/dm/ai-team-rules?style=flat-square&color=blue&logo=npm)](https://www.npmjs.com/package/ai-team-rules)
[![license](https://img.shields.io/npm/l/ai-team-rules?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/hangyeoldora/consis-rules?style=flat-square&logo=github)](https://github.com/hangyeoldora/consis-rules)

> **One CLI to sync team coding rules across Claude, Codex, Cursor** — React+TS / Spring Boot / NestJS packs included.

[한국어](./README.md) | [English](./README.en.md) | [简体中文](./README.zh-CN.md)

A package designed to quickly align team collaboration rules across Claude, Codex, and Cursor. <br/>
It works well for both brand-new projects and existing production projects that need refactoring/cleanup. <br/>
Even with fully AI-native vibe coding, this helps you stabilize project rules, document structure, and shared workflows first. <br/>
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
- Python
  - Covers readability, typing, data modeling, error/resource handling, and test boundaries without prescribing folders.
- History
  - Generates a README summary and detailed `.history` records from staged changes.
  - When Claude CLI fails in an interactive terminal, you can continue, write a manual entry, or abort.
  - Set `HISTORY_AI_TOOL=codex` to generate history with the Codex CLI instead of Claude.
  - Analyzes the project structure (React, Spring Boot, Python, etc.) and automatically routes entries into feature-specific `.history/{feature}.history.md` files.
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
npx ai-team-rules python --auto
npx ai-team-rules history --tool all
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
| `python` | project | Python clean code, typing, error handling, and testing rules |
| `history` | project | Staged README summary and detailed change history |
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
| `py`, `python-clean-code` | `python` |
| `changelog`, `change-history` | `history` |
| `document`, `documents`, `ai-instructions` | `docs` |

## References

- [Anthropic Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Cursor Rules docs](https://cursor.com/docs/context/rules)
- [Python PEP 8](https://peps.python.org/pep-0008/)
- [Python typing best practices](https://typing.python.org/en/latest/reference/best_practices.html)
- [LINE: On code readability](https://engineering.linecorp.com/en/blog/code-readability-vol1)
- [NAVER D2: How tests make code better](https://d2.naver.com/helloworld/9921217)
