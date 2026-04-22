# consis-rules

Consis AI 규칙 팩을 Claude, Codex, Cursor 프로젝트에 적용하는 CLI입니다.

## 설치

아직 npm publish 전이라 repo에서 직접 설치해서 사용합니다.

```bash
git clone https://github.com/hangyeoldora/consis-rules.git
cd consis-rules
npm install
npm link
```

설치 후에는 `consis-rules` 명령을 바로 사용할 수 있습니다.

## 먼저: react-ts

프론트 프로젝트라면 보통 아래 명령부터 쓰면 됩니다.

```bash
consis-rules react-ts --auto
```

이 명령은 기본적으로 `claude` 기준으로 아래를 세팅합니다.

- 루트 `CLAUDE.md`에 React + TypeScript 라우팅 요약 추가
- `.claude/skills/react-ts/SKILL.md` 생성
- `docs`도 함께 적용
- `.claude/skills/ai-instructions/SKILL.md` 생성

세팅 후에는 문서 구조를 자동으로 정리하거나 점검할 일이 생기면 `/ai-instructions`를 사용하면 됩니다.

Codex 기준으로 넣고 싶으면:

```bash
consis-rules react-ts --auto --tool codex
```

## docs만 적용

문서 구조 규칙만 따로 넣고 싶으면:

```bash
consis-rules docs
```

기본값은 `claude`입니다. 이 경우 대략 아래가 만들어집니다.

- `CLAUDE.md`
- `.claude/skills/ai-instructions/SKILL.md`

루트 문서에는 짧은 라우팅만 들어가고, 자세한 규칙은 skill 파일로 분리됩니다.

## 전역 적용

전역으로 넣을 때는 `--scope global`을 사용합니다.

예시:

```bash
consis-rules common --scope global
consis-rules safety --scope global
consis-rules react-ts --auto --tool codex --scope global
```

전역 대상 경로는 tool별로 다릅니다.

| Tool | 전역 파일 |
| --- | --- |
| `claude` | `~/.claude/CLAUDE.md` |
| `codex` | `~/.codex/AGENTS.md` |
| `cursor` | `~/.cursor/rules/consis-<pack>.mdc` |

## 명령어

`apply`는 생략할 수 있습니다. 아래 두 명령은 동일합니다.

```bash
consis-rules apply react-ts --auto
consis-rules react-ts --auto
```

| 명령 | 설명 | 예시 |
| --- | --- | --- |
| `consis-rules <pack>` | pack 바로 적용 | `consis-rules react-ts --auto` |
| `consis-rules apply <pack>` | pack 명시 적용 | `consis-rules apply docs` |
| `consis-rules list` | 사용 가능한 pack 목록 출력 | `consis-rules list` |
| `consis-rules show <pack>` | pack 원문 출력 | `consis-rules show react-ts` |

## 옵션

| 옵션 | 필수 | 설명 | 기본값 |
| --- | --- | --- | --- |
| `<pack>` | 필수 | 적용할 pack 이름 | 없음 |
| `--auto` | 선택 | 선택한 pack에 `docs`를 자동으로 추가 | 꺼짐 |
| `--tool <tool>` | 선택 | `claude`, `codex`, `cursor`, `all` 중 선택 | `claude` |
| `--scope <scope>` | 선택 | `project`, `global` 중 선택 | pack 기본값 |
| `--project-path <path>` | 선택 | 적용할 프로젝트 경로 지정 | 현재 디렉터리 |

## pack

| Pack | 기본 scope | 설명 |
| --- | --- | --- |
| `react-ts` | `project` | React + TypeScript 프론트 규칙 |
| `docs` | `project` | 루트 문서 라우팅 + AI 문서 구조 skill |
| `spring-boot` | `project` | Spring Boot 백엔드 규칙 |
| `common` | `global` | 공통 기본 규칙 |
| `safety` | `global` | 파괴적 명령, Git, 로그 안전 규칙 |

별칭도 지원합니다.

| 별칭 | 실제 pack |
| --- | --- |
| `react` | `react-ts` |
| `spring` | `spring-boot` |
| `document` | `docs` |
| `documents` | `docs` |
| `base` | `common` |
| `harness` | `safety` |

## 생성 방식 요약

| Pack | 루트 문서 | Skill 파일 |
| --- | --- | --- |
| `react-ts` | 요약 라우팅만 추가 | 생성 |
| `spring-boot` | 요약 라우팅만 추가 | 생성 |
| `docs` | 짧은 문서 구조 규칙 추가 | 생성 |
| `common` | 직접 본문 추가 | 없음 |
| `safety` | 직접 본문 추가 | 없음 |

`react-ts`, `spring-boot`, `docs`는 긴 내용을 루트에 다 넣지 않고, 가능한 한 skill reference로 분리합니다.
