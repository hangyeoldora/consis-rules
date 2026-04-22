# consis-rules

Claude, Codex, Cursor에서 팀 협업용 AI 규칙을 빠르게 맞추는 CLI입니다.
바이브 코딩을 하더라도 프로젝트별 규칙, 문서 구조, 공통 작업 방식이 흔들리지 않게 세팅하는 용도에 맞춰져 있습니다.
새 프로젝트를 시작할 때뿐 아니라, 이미 문서와 코드가 있는 기존 프로젝트에서도 규칙을 다시 정리하고 협업 친화적으로 리팩토링 방향을 잡는 데 사용할 수 있습니다.

## 설치

```bash
npm install -g consis-rules
```

설치 없이 한 번만 실행하려면:

```bash
npx consis-rules react-ts --auto
```

설치 후에는 `consis-rules` 명령을 바로 사용할 수 있습니다.

## 먼저: react-ts

프론트 프로젝트라면 보통 아래 명령부터 시작하면 됩니다.

```bash
npx consis-rules react-ts --auto
```

기본값은 `claude`이며, 아래를 세팅합니다.

- 루트 `CLAUDE.md`에 React + TypeScript 상시 규칙 추가
- `docs`도 함께 적용
- `.claude/skills/ai-instructions/SKILL.md` 생성

세팅 후 문서 구조를 자동으로 정리하거나 점검하고 싶을 때는 `/ai-instructions`를 실행하면 됩니다.

Codex 기준으로 넣고 싶으면:

```bash
npx consis-rules react-ts --auto --tool codex
```

## docs만 적용

문서 구조 규칙만 따로 넣고 싶으면:

```bash
npx consis-rules docs
```

기본값은 `claude`입니다. 이 경우 아래 구성이 생깁니다.

- `CLAUDE.md`
- `.claude/skills/ai-instructions/SKILL.md`

루트 문서에는 짧은 운영 원칙만 들어가고, 문서 구조를 다시 정리해야 할 때만 `ai-instructions` skill을 호출합니다.

## 전역 적용

전역으로 넣을 때는 `--scope global`을 사용합니다.

예시:

```bash
npx consis-rules common --scope global
npx consis-rules safety --scope global
npx consis-rules react-ts --auto --tool codex --scope global
```

전역 대상 경로는 tool별로 다릅니다.

| Tool | 전역 파일 |
| --- | --- |
| `claude` | `~/.claude/CLAUDE.md` |
| `codex` | `~/.codex/AGENTS.md` |
| `cursor` | CLI 미지원, 공식 권장 방식은 `Cursor Settings > Rules` |

Cursor는 공식 문서 기준으로 전역 규칙을 파일이 아니라 Settings의 User Rules로 관리합니다. 그래서 이 CLI는 Cursor 전역 규칙 파일을 억지로 만들지 않고, 프로젝트 규칙만 `.cursor/rules/`에 생성합니다.

## 명령어

`apply`는 생략할 수 있습니다. 아래 두 명령은 동일합니다.

```bash
npx consis-rules apply react-ts --auto
npx consis-rules react-ts --auto
```

| 명령 | 설명 | 예시 |
| --- | --- | --- |
| `consis-rules <pack>` | pack 바로 적용 | `npx consis-rules react-ts --auto` |
| `consis-rules apply <pack>` | pack 명시 적용 | `npx consis-rules apply docs` |
| `consis-rules list` | 사용 가능한 pack 목록 출력 | `npx consis-rules list` |
| `consis-rules show <pack>` | pack 원문 출력 | `npx consis-rules show react-ts` |

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
| `react-ts` | `project` | React + TypeScript 프론트 상시 규칙 |
| `docs` | `project` | 루트 문서 라우팅 + AI 문서 구조 skill |
| `spring-boot` | `project` | Spring Boot 백엔드 상시 규칙 |
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
| `react-ts` | 상시 규칙 요약 추가 | 없음 |
| `spring-boot` | 상시 규칙 요약 추가 | 없음 |
| `docs` | 짧은 문서 구조 규칙 추가 | 생성 |
| `common` | 직접 본문 추가 | 없음 |
| `safety` | 직접 본문 추가 | 없음 |

`react-ts`와 `spring-boot`는 필요할 때만 부르는 skill이 아니라, 해당 스택 작업에 항상 적용되는 규칙으로 취급합니다. `docs`만 문서 구조 정리용 skill을 함께 생성합니다.

## npm Publish 체크리스트

- `npm whoami`로 현재 로그인 계정을 확인한다.
- npm 계정에 publish 권한이 있는지 확인한다.
- 2FA가 켜져 있다면 publish용 OTP를 준비하거나, bypass 2FA가 가능한 granular access token을 사용한다.
- `package.json`의 `name`, `version`, `bin`, `repository`, `homepage`를 최종 확인한다.
- `npm pkg fix`를 실행해 publish 경고를 정리한다.
- `npm test`가 통과하는지 확인한다.
- `npm publish --access public`를 실행한다.
- publish 후 `npx consis-rules list`처럼 실제 설치 흐름이 동작하는지 확인한다.

참고:

- [Anthropic Claude Code memory docs](https://code.claude.com/docs/en/memory)
- [OpenAI Introducing Codex](https://openai.com/index/introducing-codex/)
- [Cursor Rules docs](https://docs.cursor.com/en/context/rules)
