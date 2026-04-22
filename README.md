# ai-team-rules

Claude, Codex, Cursor에 상관없이 팀 협업용 AI 규칙을 빠르게 세팅·사용할 수 있게 해주는 패키지입니다.
새 프로젝트뿐 아니라 이미 문서와 코드가 있는 기존 프로젝트에서도 `CLAUDE.md`, `AGENTS.md` 등 AI 지침 문서를 다시 정리하고 협업 친화적으로 리팩토링 방향을 잡는 데 사용할 수 있습니다.
바이브 코딩을 하더라도 프로젝트별 규칙, 문서 구조, 공통 작업 방식이 흔들리지 않게 세팅하는 용도에 맞춰져 있습니다.

각 규칙의 내용은 Rules Directory에서 미리 확인할 수 있습니다 → [Consis Rules Directory](https://consis-rules-directory.pages.dev/)

## 설치

```bash
npm install -g ai-team-rules
```

설치 없이 한 번만 실행하려면 `npx`를 쓰면 됩니다.

```bash
npx ai-team-rules react-ts --auto
```

CLI는 기본적으로 배포된 Rules Directory의 `packs.json`을 먼저 읽고, 원격 fetch가 실패하면 내장 로컬 pack으로 fallback 합니다.

## 먼저: react-ts

프론트 프로젝트라면 보통 아래 명령부터 시작하면 됩니다.

```bash
npx ai-team-rules react-ts --auto
```

기본 `tool`은 `claude`이며, 다음이 세팅됩니다.

- 루트 `CLAUDE.md`에 `@.claude/rules/react-ts.md` 한 줄 포인터만 추가 (컨텍스트 낭비 최소화)
- 풀 규칙은 `.claude/rules/react-ts.md` 파일에 저장 — Claude Code가 세션마다 자동 로드
- `docs` pack도 함께 적용되어 `.claude/skills/ai-instructions/SKILL.md` 생성

세팅 후 문서 구조를 정리하거나 점검하고 싶을 때는 `/ai-instructions`를 실행하면 됩니다.

Codex 기준으로 넣고 싶으면:

```bash
npx ai-team-rules react-ts --auto --tool codex
```

Codex는 공식 rules 폴더 개념이 없어, `AGENTS.md` managed block에 풀 규칙이 직접 삽입됩니다.

## common: 공통 규칙 일괄 세팅

팀 공용 기본 규칙을 한 번에 깔려면 `common`을 씁니다. 세 가지 원본 팩(AI 기본 규칙 + 보안 표준 + Git 워크플로우)이 묶여 있습니다.

```bash
npx ai-team-rules common --scope global
```

## docs만 적용

문서 구조 규칙은 Claude / Codex의 md 파일 과잉 컨텍스트를 피하고 라우터 문서 패턴을 따르도록 규정돼 있습니다.

```bash
npx ai-team-rules docs
```

- 루트 `CLAUDE.md`에 짧은 문서 운영 원칙
- `.claude/skills/ai-instructions/SKILL.md` 생성 — 필요할 때 `/ai-instructions`로 호출

## 전역 적용

전역으로 넣을 때는 `--scope global`을 사용합니다.

```bash
npx ai-team-rules common --scope global
npx ai-team-rules safety --scope global
npx ai-team-rules react-ts --auto --tool codex --scope global
```

전역 대상 경로는 tool별로 다릅니다.

| Tool | 전역 루트 | 전역 rules 폴더 |
| --- | --- | --- |
| `claude` | `~/.claude/CLAUDE.md` | `~/.claude/rules/<pack>.md` (react-ts, spring-boot) |
| `codex` | `~/.codex/AGENTS.md` | (미지원 — 루트에 직접 삽입) |
| `cursor` | CLI 미지원 | `Cursor Settings > Rules`에서 직접 관리 |

Cursor는 공식 문서 기준으로 전역 규칙을 파일이 아니라 Settings의 User Rules로 관리합니다. 이 CLI는 Cursor 전역 규칙 파일을 억지로 만들지 않고, 프로젝트 규칙만 `.cursor/rules/`에 생성합니다.

## 명령어

`apply`는 생략할 수 있습니다. 아래 두 명령은 동일합니다.

```bash
npx ai-team-rules apply react-ts --auto
npx ai-team-rules react-ts --auto
```

| 명령 | 설명 | 예시 |
| --- | --- | --- |
| `ai-team-rules <pack>` | pack 바로 적용 | `npx ai-team-rules react-ts --auto` |
| `ai-team-rules apply <pack>` | pack 명시 적용 | `npx ai-team-rules apply docs` |
| `ai-team-rules list` | 사용 가능한 pack 목록 출력 | `npx ai-team-rules list` |
| `ai-team-rules show <pack>` | pack 원문 출력 | `npx ai-team-rules show react-ts` |

## 옵션

| 옵션 | 필수 | 설명 | 기본값 |
| --- | --- | --- | --- |
| `<pack>` | 필수 | 적용할 pack 이름 또는 별칭 | 없음 |
| `--auto` | 선택 | 선택한 pack에 `docs`를 자동으로 추가 | 꺼짐 |
| `--tool <tool>` | 선택 | `claude`, `codex`, `cursor`, `all` 중 선택 | `claude` |
| `--scope <scope>` | 선택 | `project`, `global` 중 선택 | pack 기본값 |
| `--project-path <path>` | 선택 | 적용할 프로젝트 경로 지정 | 현재 디렉터리 |
| `--source-url <url>` | 선택 | Rules Directory의 `packs.json` URL 지정 | 배포된 directory URL |

## pack

| Pack | 기본 scope | 설명 |
| --- | --- | --- |
| `common` | `global` | AI 기본 규칙 + 보안 표준 + Git 워크플로우 (번들) |
| `security` | `global` | 프론트 / 공통 / AI 도구 보안 규칙 |
| `git-workflow` | `global` | 커밋 메시지 + PR / 브랜치 워크플로우 |
| `safety` | `global` | 파괴적 명령, Git, 로그 노출 안전 규칙 |
| `react-ts` | `project` | React + TypeScript 프론트 상시 규칙 |
| `spring-boot` | `project` | Spring Boot 백엔드 상시 규칙 |
| `docs` | `project` | 루트 문서 라우팅 + AI 문서 구조 skill |

별칭도 지원합니다.

| 별칭 | 실제 pack |
| --- | --- |
| `base` | `common` |
| `security-standards` | `security` |
| `git`, `git-flow` | `git-workflow` |
| `harness`, `harness-safety` | `safety` |
| `react`, `react-typescript` | `react-ts` |
| `spring` | `spring-boot` |
| `document`, `documents`, `ai-instructions` | `docs` |

## 생성 방식 요약

| Pack | 루트 문서 | rules 파일 | Skill 파일 |
| --- | --- | --- | --- |
| `common` | 번들 본문(managed block) | — | — |
| `security` | 본문(managed block) | — | — |
| `git-workflow` | 본문(managed block) | — | — |
| `safety` | 본문(managed block) | — | — |
| `react-ts` | `@.claude/rules/react-ts.md` 포인터 한 줄 (Claude) / 풀 본문(Codex) | `.claude/rules/react-ts.md` (Claude 전용) | — |
| `spring-boot` | `@.claude/rules/spring-boot.md` 포인터 한 줄 (Claude) / 풀 본문(Codex) | `.claude/rules/spring-boot.md` (Claude 전용) | — |
| `docs` | 짧은 skill 호출 안내(managed block) | — | `.claude/skills/ai-instructions/SKILL.md` / `.agents/skills/ai-instructions/SKILL.md` |

### 설계 원칙

- **상시 규칙 vs 호출형 skill** — 언어 / 프레임워크 규칙은 항상 적용돼야 하므로 skill이 아니라 rules 폴더에 둔다. `docs`처럼 필요할 때만 호출하는 워크플로우만 skill로 분리한다.
- **중복 최소화** — Claude의 `.claude/rules/*.md`는 공식적으로 세션마다 자동 로드되므로, 루트 `CLAUDE.md`에는 포인터 한 줄만 넣어 컨텍스트 낭비를 피한다.
- **Codex는 rules 폴더 미지원** — Codex는 `AGENTS.md` 단일 경로만 공식이므로, 스택 규칙도 `AGENTS.md`에 managed block으로 직접 삽입한다.
- **Cursor는 프로젝트 전용** — `.cursor/rules/*.mdc` + `alwaysApply: true`로 일관되게 생성한다. 전역 규칙은 Cursor Settings에서 관리하도록 열어둔다.

## 참고

- [Anthropic Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Cursor Rules docs](https://cursor.com/docs/context/rules)
