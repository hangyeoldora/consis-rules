# ai-team-rules

[한국어](./README.md) | [English](./README.en.md) | [简体中文](./README.zh-CN.md)

这是一个帮助团队在 Claude、Codex、Cursor 中快速统一协作规则的包。 <br/>
既适用于新项目快速接入，也适用于已运营项目的重构与整理。 <br/>
即使采用完全 AI Native 的 vibe coding，也能先稳定项目规则、文档结构和通用工作方式。 <br/>
无需额外设置，只需执行命令，即可按全局或项目范围自动生成适配 Claude/Codex 的目录与文档。

**包含的 pack**:

- AI 基础规则
- 安全/Harness 规则
- Git 工作流
- React + TypeScript
  - react/ts 规则包含 clean code 规范与常用目录结构，参考了 Vercel、Toss、Kakao 等高质量 React 实践。
- Spring Boot
- NestJS
  - Spring Boot 与 NestJS 也包含 clean code 规范与 boilerplate 风格目录结构。
- Python
  - 不强制目录结构，涵盖可读性、类型、数据建模、异常与资源处理、测试边界。
- History
  - 根据 staged 变更生成 README 摘要与 `.history` 详细记录。
  - Claude CLI 在交互式终端失败时，可以选择继续提交、手动填写记录或中止。
  - 设置 `HISTORY_AI_TOOL=codex` 即可改用 Codex CLI 生成变更记录。
  - 分析项目结构（React、Spring Boot、Python 等），按功能自动分类记录到 `.history/{feature}.history.md`。
- 文档结构规则（`docs`, `/ai-instructions`）
  - 该规则整理了 Claude 与 Codex 官方文档中推荐的 `CLAUDE.md/AGENTS.md` 编写方式。通过该 skill 可以节省 context 与 token 成本。无论你是否已有文档，都可以借助该 skill 进行规范化整理。

<br/>

**规则内容可在此直接查看** => <a href="https://consis-rules-directory.pages.dev/" target="_blank" rel="noopener noreferrer">Consis Rules Directory</a>

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

`react-ts` 不仅是样式规则，还包含目录结构、状态管理、渲染安全与重构标准。  
无论是新项目建立基线，还是旧项目渐进式整理，都可以保持同一套规则一致落地。
其中也包含来自 Vercel、Toss、Kakao 等高质量代码实践的规则与模式。

### * 执行 docs(/ai-instructions) 时的流程

- 仅在根 `CLAUDE.md` 添加指针
- 完整规则保存到 `.claude/rules/react-ts.md`
- 自动应用 `docs` pack（包含 `/ai-instructions`）
- 自动创建所需目录/文件

应用到 Codex：

Codex 没有官方 rules 文件夹概念，因此规则会以 managed block 方式写入 `AGENTS.md`。

如果项目中已存在根 `CLAUDE.md` 与子目录 `CLAUDE.md`，应用 Codex 时根 `AGENTS.md` 会保持摘要指针，详细规则通过 CLAUDE 文档层级引用。

## Backend Packs

```bash
npx ai-team-rules spring-boot --auto
npx ai-team-rules nestjs --auto
npx ai-team-rules python --auto
npx ai-team-rules history --tool all
```

别名：

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

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| `--auto` | 为所选 pack 自动追加 `docs` | off |
| `--tool <tool>` | `claude`, `codex`, `cursor`, `all` | `claude` |
| `--scope <scope>` | `project`, `global` | pack 默认值 |
| `--project-path <path>` | 应用目标项目路径 | 当前路径 |
| `--source-url <url>` | 远程 `packs.json` URL | 默认 Directory URL |

## Packs

| Pack | Scope | 说明 |
| --- | --- | --- |
| `common` | global | AI 基础规则 + 安全标准 + Git 工作流 |
| `security` | global | 前端/通用/AI 工具安全 |
| `git-workflow` | global | 提交信息 + PR/分支规则 |
| `safety` | global | 破坏性命令、Git、日志暴露安全 |
| `react-ts` | project | React + TypeScript 常驻规则 |
| `spring-boot` | project | Spring Boot 常驻规则 |
| `nestjs` | project | NestJS 常驻规则 |
| `python` | project | Python clean code、类型、异常处理与测试规则 |
| `history` | project | 基于 staged 变更的 README 摘要与详细变更记录 |
| `docs` | project | 根文档路由 + AI 文档结构 skill |

## Aliases

| 别名 | pack |
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
- [LINE：代码可读性](https://engineering.linecorp.com/ko/blog/code-readability-vol1)
- [NAVER D2：测试如何改善代码](https://d2.naver.com/helloworld/9921217)
