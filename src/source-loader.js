const fs = require('fs');
const path = require('path');

const DEFAULT_SOURCE_URL = 'https://consis-rules-directory.pages.dev/packs.json';

const PACK_ID_MAP = {
  common: 'ai-base-rules',
  security: 'security-standards',
  'git-workflow': 'git-workflow',
  safety: 'harness-safety',
  'react-ts': 'react-typescript',
  'spring-boot': 'spring-boot',
  docs: 'ai-instructions',
};

function getLocalSourcePacks() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'packs.source.json'), 'utf8'));
}

function normalizeRemoteSourcePacks(remotePacks) {
  return remotePacks.map((pack) => {
    const clonedPack = {
      ...pack,
      rules: Array.isArray(pack.rules) ? pack.rules.map((rule) => ({ ...rule })) : [],
    };

    if (clonedPack.id === 'react-typescript') {
      const stackRule = clonedPack.rules.find((rule) => rule.id === 'stack-libraries');
      if (stackRule) {
        stackRule.content = normalizeReactStackPolicy(stackRule.content);
      }
    }

    return clonedPack;
  });
}

function normalizeReactStackPolicy(content) {
  return content
    .replace(
      /## 기반[\s\S]*?## 상태 관리/m,
      '## 기반 원칙\n'
      + '- 기존 프로젝트는 `package.json`, lockfile, 설정 파일에 명시된 현재 버전과 스택을 우선 따른다.\n'
      + '- 신규 프로젝트는 팀이 권장하는 최신 안정 버전을 사용하되, 메이저 버전 선택은 사용자가 달리 정하지 않으면 현재 생태계의 안정 구성을 기준으로 제안한다.\n'
      + '- 메이저 업그레이드, 신규 라이브러리 도입, 기존 스택 교체는 사용자가 명시적으로 요청했을 때만 진행한다.\n'
      + '- 버전이 불명확하면 추측하지 말고 현재 프로젝트 설정을 먼저 확인한다.\n'
      + '- TypeScript는 strict 모드와 `noUnusedLocals`, `noUnusedParameters`를 기본 원칙으로 유지한다.\n'
      + '- Node와 패키지 매니저도 기존 프로젝트 설정을 우선 존중하고, 신규 프로젝트일 때만 팀 권장 구성을 따른다.\n\n'
      + '## 상태 관리\n'
    )
    .replace(
      '- **전역 상태**: `zustand` + `persist` 미들웨어 (localStorage).',
      '- **전역 상태**: 기본 선택지는 `zustand` + `persist` 미들웨어다. 기존 프로젝트가 다른 상태 관리 도구를 이미 사용 중이면 임의로 교체하지 않는다.'
    )
    .replace(
      '- **서버 상태**: `@tanstack/react-query` + `axios`.',
      '- **서버 상태**: 기본 선택지는 `@tanstack/react-query` + `axios`다. 기존 프로젝트가 이미 다른 데이터 페칭 계층을 쓰고 있으면 그 구조를 우선 존중한다.'
    )
    .replace(
      /## 라우팅[\s\S]*?## 스타일/m,
      '## 라우팅\n'
      + '- 라우터와 버전은 기존 프로젝트가 이미 사용하는 선택을 우선 유지한다.\n'
      + '- 신규 프로젝트는 팀 권장 라우터를 사용하되, 라우트 정의는 `src/router/` 또는 `App.tsx` 상단처럼 한곳에 집중한다.\n'
      + '- 인라인 라우트 정의는 피한다.\n\n'
      + '## 스타일\n'
    )
    .replace(
      '- 추가 UI 라이브러리는 기존 프로젝트 선택을 따른다 (weai-front-admin: shadcn-ui + Flowbite, system-admin-front: Ant Design). 임의 추가 금지.',
      '- 추가 UI 라이브러리는 기존 프로젝트 선택을 따른다. 이미 채택된 라이브러리가 있으면 임의로 바꾸지 않는다.'
    )
    .replace(
      '- CSS-in-JS(styled-components, emotion)는 신규 도입 금지.',
      '- CSS-in-JS(styled-components, emotion)는 신규 도입을 지양한다. 기존 프로젝트가 이미 사용 중이면 점진적으로 유지/정리 방향을 판단한다.'
    )
    .replace(
      /## 폼[\s\S]*?## 신규 도입 금지 \(기존 스택으로 통일\)/m,
      '## 폼\n'
      + '- 소규모는 컴포넌트 내부 상태로 처리한다.\n'
      + '- 검증·에러가 복잡해지면 합의 후 `react-hook-form` 같은 전용 폼 도구 도입을 검토한다.\n'
      + '- 기존 프로젝트가 이미 폼 라이브러리를 사용 중이면 특별한 이유 없이 교체하지 않는다.\n\n'
      + '## 신규 도입 및 교체 기준\n'
    )
    .replace(
      '- Redux, Recoil, Jotai, SWR, MobX.',
      '- Redux, Recoil, Jotai, SWR, MobX는 신규 도입 전에 기존 스택과의 정합성을 먼저 검토한다.'
    )
    .replace(
      '- Moment.js (대신 `date-fns` 또는 네이티브 Intl).',
      '- Moment.js는 신규 도입하지 않고 `date-fns` 또는 네이티브 Intl을 우선 고려한다.'
    )
    .replace(
      '- styled-components, emotion.',
      '- styled-components, emotion은 신규 도입보다 기존 스타일 시스템 유지 또는 단일화 방향을 우선한다.'
    );
}

async function loadSourcePacks({ sourceUrl } = {}) {
  const remoteSourceUrl = sourceUrl || process.env.AI_TEAM_RULES_SOURCE_URL || DEFAULT_SOURCE_URL;

  if (process.env.AI_TEAM_RULES_OFFLINE === '1') {
    return {
      sourcePacks: getLocalSourcePacks(),
      sourceType: 'local',
      sourceUrl: null,
    };
  }

  try {
    const response = await fetch(remoteSourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const remotePacks = await response.json();
    return {
      sourcePacks: normalizeRemoteSourcePacks(remotePacks),
      sourceType: 'remote',
      sourceUrl: remoteSourceUrl,
    };
  } catch (error) {
    return {
      sourcePacks: getLocalSourcePacks(),
      sourceType: 'local',
      sourceUrl: null,
      fallbackReason: error.message,
    };
  }
}

module.exports = {
  DEFAULT_SOURCE_URL,
  PACK_ID_MAP,
  loadSourcePacks,
};
