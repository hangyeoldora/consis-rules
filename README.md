# ai-team-rules

[![npm version](https://img.shields.io/npm/v/ai-team-rules?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/ai-team-rules)
[![npm downloads](https://img.shields.io/npm/dm/ai-team-rules?style=flat-square&color=blue&logo=npm)](https://www.npmjs.com/package/ai-team-rules)
[![license](https://img.shields.io/npm/l/ai-team-rules?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/hangyeoldora/consis-rules?style=flat-square&logo=github)](https://github.com/hangyeoldora/consis-rules)

> **One CLI to sync team coding rules across Claude, Codex, Cursor** — React+TS / Spring Boot / NestJS packs included.

[한국어](./README.md) | [English](./README.en.md) | [简体中文](./README.zh-CN.md)

Claude, Codex, Cursor 어디서 작업하든 팀 규칙을 빠르게 맞출 수 있게 만든 패키지입니다. <br/>
새 프로젝트 시작할 때도 바로 붙여서 쓸 수 있으며, 이미 운영 중인 프로젝트를 리팩토링/정리할 때도 편리하게 쓸 수 있습니다. <br/>
완전한 AI 네이티브로 바이브 코딩을 진행하더라도 프로젝트 규칙, 문서 구조, 공통 작업 방식이 흔들리지 않게 먼저 세팅하는 용도입니다. <br/>
모든 규칙과 스킬에 대한 세팅을 별도 작업없이 명령어 실행만으로 전역 또는 프로젝트에 알맞게 claude/codex에 맞는 폴더와 문서를 자동으로 생성합니다.

**\*제공 pack**:

- AI 기본 규칙
- 보안/하네스 규칙
- Git 워크플로우
- 클린 코드 공통(`clean-code`)
  - 스택과 무관하게 책임·부수효과 경계, 명시적 타입과 입력 검증, 상태 소유, 비동기 취소·늦은 이벤트·리소스 정리, 행동을 유지하는 작은 리팩터링, 의미 있는 테스트 기준을 다룹니다.
  - 줄 수나 함수 길이만으로 분리를 강제하지 않고, 변경 이유를 기준으로 판단합니다.
  - 상시 로드되는 본문은 지켜야 할 의무만 짧게 담고, 배경과 예시는 [상세 가이드](./docs/packs/clean-code.md)에 둡니다.
- React + TypeScript
  - react/ts 규칙은 vercel, 토스, 카카오 등 리액트에 대한 좋은 코드(클린코드) 규칙과 함께 자주 사용하는 폴더 구조 등을 내포하고 있습니다.
- Spring Boot
- NestJS
  - spring boot와 NestJS 또한 클린 코드 규칙과 폴더 구조 등 보일러플레이트 구조를 내포하고 있습니다.
  - NestJS는 DI scope, 외부 예외 변환, 종료 훅 기반 리소스 정리, 트랜잭션 범위 기준도 포함합니다.
- Electron
  - main/preload/renderer 권한 경계, IPC 송신자·입력 검증과 DTO 동기화, main 비차단, 자식 프로세스 소유·종료·중단 경쟁, 리스너·타이머 해제, 실행별 정책 소유, 설정·기록·비밀 분리, 임시 userData 테스트를 다룹니다.
  - 기존 프로젝트의 Electron 버전을 유지하고 [공식 보안 체크리스트](https://www.electronjs.org/docs/latest/tutorial/security)를 기준으로 합니다.
  - 본문은 짧은 의무 목록이고, 배경과 예시는 [상세 가이드](./docs/packs/electron.md)에 둡니다.
- Python
  - 폴더 구조를 강제하지 않고 가독성, 타입, 데이터 모델, 예외·리소스 처리, 테스트 경계를 다룹니다.
- History
  - staged 변경을 기준으로 README 요약과 `.history` 상세 이력을 생성합니다.
  - Claude CLI 실패 시 대화형 터미널에서는 계속 커밋/수동 작성/중단을 선택할 수 있습니다.
  - `HISTORY_AI_TOOL=codex`로 설정하면 Claude 대신 Codex CLI로 변경 이력을 생성합니다.
  - React/Spring Boot/Python 등 프로젝트 구조를 분석해 기능별로 `.history/{feature}.history.md`에 자동으로 나눠 기록합니다.
  - `commit-msg` hook이 커밋 메시지를 `<type>: <subject>` 한 줄로 검사합니다. scope, body, 30자를 넘는 subject, `~한다` 같은 문장형 subject는 거부합니다. Merge/Revert 커밋은 예외입니다.
- 문서 구조 규칙(`docs`, `/ai-instructions`)
  - 해당 규칙은 claude와 codex 공식문서에서 말하는 올바른 문서(`CLAUDE.md/AGENTS.md`) 작성에 대한 방법을 정리한 것으로 해당 skill을 통해서 context와 토큰 비용을 절약할 수 있습니다. 가이드 문서가 없거나 기존에 있는 경우에도 해당 스킬을 통해 올바르게 문서를 정리할 수 있습니다.

<br/>

**규칙 내용**은 여기서 바로 볼 수 있습니다 => <a href="https://consis-rules-directory.pages.dev/" target="_blank" rel="noopener noreferrer">Consis Rules Directory</a>

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

### \* react-ts

`react-ts`는 스타일 룰만 있는 게 아니라, 폴더 구조/상태 관리/렌더링 안전/리팩토링 기준까지 포함합니다.  
신규 프로젝트 시작할 때 기준선을 맞추거나, 기존 프로젝트를 점진적으로 정리할 때도 같은 규칙으로 일관되게 가져갈 수 있습니다.
Vercel, toss, kakao 등 좋은 코드에 대한 규칙과 패턴도 포함되어 있습니다.

### \* docs(/ai-instructions) 실행 시 프로세스

- 루트 `CLAUDE.md`에 포인터만 추가
- 풀 규칙은 `.claude/rules/react-ts.md`에 저장
- `docs` pack 자동 적용 (`/ai-instructions` 포함)
- 필요한 폴더/파일은 자동 생성

Codex로 적용:

Codex는 공식 rules 폴더 개념이 없어서 `AGENTS.md`에 managed block으로 규칙이 들어갑니다.

프로젝트에 루트 `CLAUDE.md`와 하위 폴더 `CLAUDE.md`가 이미 있으면, Codex 적용 시 루트 `AGENTS.md`는 요약 포인터 중심으로 유지되고 상세 규칙은 CLAUDE 문서 계층을 참조합니다.

## Backend Packs

```bash
npx ai-team-rules spring-boot --auto
npx ai-team-rules nestjs --auto
npx ai-team-rules python --auto
npx ai-team-rules history --tool all
```

별칭:

```bash
npx ai-team-rules spring --auto
npx ai-team-rules nest --auto
```

## 클린 코드 / Electron Packs

```bash
# 언어 공통 클린 코드 규칙 (기본 scope: project)
npx ai-team-rules clean-code

# Electron 앱 규칙 + 클린 코드를 Claude와 Codex에 함께 적용
npx ai-team-rules apply clean-code electron --tool claude,codex

# 내용 확인
npx ai-team-rules show electron
```

- Claude는 루트 `CLAUDE.md`에 포인터만 두고 본문은 `.claude/rules/clean-code.md`, `.claude/rules/electron.md`에 저장합니다.
- Codex는 `AGENTS.md`에 본문을 넣고, 루트 `CLAUDE.md`가 이미 있으면 CLAUDE 문서 계층을 참조하는 포인터만 둡니다.
- `clean-code`는 전역에도 쓸 수 있지만 기본값은 project입니다. 전역 적용은 `--scope global`을 명시할 때만 합니다.
- 두 팩 본문은 합계 4000바이트 이하로 유지합니다(테스트로 검사). 기본 팩, 스택 팩과 함께 써도 에이전트 규칙 예산을 넘지 않게 하려는 것입니다. 긴 설명은 `docs/packs/`의 상세 가이드에 추가합니다.
- 상세 가이드는 웹 링크가 배포되기 전에도 로컬에서 읽을 수 있습니다. 이 저장소를 clone했다면 `consis-rules/docs/packs/clean-code.md`, `consis-rules/docs/packs/electron.md`를, npm으로 설치했다면 패키지에 함께 들어가는 `node_modules/ai-team-rules/docs/packs/`를 읽습니다. 팩 본문의 GitHub 링크는 저장소에 push된 뒤에 열립니다.

## 로컬(오프라인) 사용

기본 동작은 원격 Directory의 `packs.json`을 먼저 받고, 원격에 아직 배포되지 않은 팩은 패키지에 포함된 `packs.source.json`으로 보충합니다. 원격을 쓰지 않고 로컬 원본만 쓰려면 `AI_TEAM_RULES_OFFLINE=1`을 지정합니다.

```bash
# 설치된 패키지의 번들 원본만 사용
AI_TEAM_RULES_OFFLINE=1 npx ai-team-rules list

# 이 저장소를 clone한 경우: 로컬 packs.source.json으로 다른 프로젝트에 적용
AI_TEAM_RULES_OFFLINE=1 node bin/consis-rules.js apply clean-code electron --tool claude --scope project --project-path ../my-electron-app
```

PowerShell에서는 `$env:AI_TEAM_RULES_OFFLINE='1'`로 지정한 뒤 같은 명령을 실행합니다.

| 환경 변수                        | 설명                                   |
| -------------------------------- | -------------------------------------- |
| `AI_TEAM_RULES_OFFLINE=1`        | 원격 요청 없이 번들 `packs.source.json`만 사용 |
| `AI_TEAM_RULES_SOURCE_URL`       | 원격 `packs.json` URL 변경             |
| `AI_TEAM_RULES_FETCH_TIMEOUT_MS` | 원격 요청 제한 시간(기본 5000ms)        |

## Commands

```bash
npx ai-team-rules <pack>
npx ai-team-rules apply <pack>
npx ai-team-rules list
npx ai-team-rules show <pack>
```

## Options

| 옵션                    | 설명                               | 기본값             |
| ----------------------- | ---------------------------------- | ------------------ |
| `--auto`                | 선택한 pack에 `docs` 자동 추가     | off                |
| `--tool <tool>`         | `claude`, `codex`, `cursor`, `all` | `claude`           |
| `--scope <scope>`       | `project`, `global`                | pack 기본값        |
| `--project-path <path>` | 적용할 프로젝트 경로               | 현재 경로          |
| `--source-url <url>`    | 원격 `packs.json` URL              | 기본 Directory URL |

## Packs

| Pack           | Scope   | 설명                                      |
| -------------- | ------- | ----------------------------------------- |
| `common`       | global  | AI 기본 규칙 + 보안 표준 + Git 워크플로우 |
| `security`     | global  | 프론트/공통/AI 도구 보안                  |
| `git-workflow` | global  | 커밋 메시지 + PR/브랜치 규칙              |
| `safety`       | global  | 파괴적 명령, Git, 로그 노출 안전          |
| `clean-code`   | project | 책임·부수효과 경계, 입력 검증, 상태 소유, 비동기 정리, 의미 있는 검사 |
| `react-ts`     | project | React + TypeScript 상시 규칙              |
| `spring-boot`  | project | Spring Boot 상시 규칙                     |
| `nestjs`       | project | NestJS 상시 규칙                          |
| `electron`     | project | Electron 권한 경계, IPC 검증, 자식 프로세스 수명, 데이터 분리 |
| `python`       | project | Python 클린 코드·타입·오류 처리·테스트 규칙 |
| `history`      | project | staged diff 기반 README·상세 변경 이력 자동화 |
| `docs`         | project | 루트 문서 라우팅 + AI 문서 구조 skill     |

## Aliases

| 별칭                                       | pack           |
| ------------------------------------------ | -------------- |
| `base`                                     | `common`       |
| `security-standards`                       | `security`     |
| `git`, `git-flow`                          | `git-workflow` |
| `harness`, `harness-safety`                | `safety`       |
| `clean`, `cleancode`                       | `clean-code`   |
| `react`, `react-typescript`                | `react-ts`     |
| `spring`                                   | `spring-boot`  |
| `nest`                                     | `nestjs`       |
| `electron-app`                             | `electron`     |
| `py`, `python-clean-code`                  | `python`       |
| `changelog`, `change-history`              | `history`      |
| `document`, `documents`, `ai-instructions` | `docs`         |

## References

- [Anthropic Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Cursor Rules docs](https://cursor.com/docs/context/rules)
- [Electron Security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Python PEP 8](https://peps.python.org/pep-0008/)
- [Python typing best practices](https://typing.python.org/en/latest/reference/best_practices.html)
- [LINE 코드 가독성: 도입과 원칙](https://engineering.linecorp.com/ko/blog/code-readability-vol1)
- [NAVER D2: 테스트는 어떻게 좋은 코드를 만드는가](https://d2.naver.com/helloworld/9921217)
