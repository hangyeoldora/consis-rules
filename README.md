# consis-rules

Consis AI 규칙 팩을 Codex, Claude, Cursor 환경에 적용하는 작은 CLI입니다.

## 빠르게 쓰기

```bash
npx consis-rules list
npx consis-rules show common
npx consis-rules apply common react-ts --tool codex --scope project
npx consis-rules apply common react-ts
```

## 1차 pack

- `common`
- `safety`
- `react-ts`
- `spring-boot`
- `docs`

## 명령어

### list

```bash
npx consis-rules list
```

### show

```bash
npx consis-rules show common
npx consis-rules show react-ts
```

### apply

```bash
npx consis-rules apply common
npx consis-rules apply safety
npx consis-rules apply common react-ts --tool codex
npx consis-rules apply common spring-boot --tool claude --scope project
npx consis-rules apply docs --tool cursor --scope project
```

## 기본 규칙

- `common`, `safety`의 기본 scope는 `global`
- `react-ts`, `spring-boot`, `docs`의 기본 scope는 `project`
- `--tool`을 생략하면 `claude`, `codex`, `cursor` 모두 적용합니다.
- `spring`, `document` 같은 별칭도 허용합니다.

## 파일 대상

- Codex global: `~/.codex/AGENTS.md`
- Codex project: `<project>/AGENTS.md`
- Claude global: `~/.claude/CLAUDE.md`
- Claude project: `<project>/CLAUDE.md`
- Cursor global: `~/.cursor/rules/consis-<pack>.mdc`
- Cursor project: `<project>/.cursor/rules/consis-<pack>.mdc`

`docs`는 문서 라우터 파일뿐 아니라 아래 skill 파일도 함께 생성합니다.

- Codex: `.agents/skills/ai-instructions/SKILL.md`
- Claude: `.claude/skills/ai-instructions/SKILL.md`

Codex/Claude는 한 파일 안에 pack별 마커 블록을 넣어 갱신합니다. Cursor는 pack별 파일을 생성합니다.
