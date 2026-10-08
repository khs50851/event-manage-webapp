# MCP 서버 활용 가이드

이 프로젝트(`.mcp.json`)에는 5개의 MCP 서버가 연결되어 있다. 각 서버가 왜 있고, 언제 꺼내 써야 하는지를 정리한다. **MCP 도구로 확인 가능한 사실을 추측하지 않는다** — 아래 매핑에 따라 적절한 서버를 적극적으로 사용한다.

## 한눈에 보기

| 서버 | 언제 쓰는가 | 자세히 |
|---|---|---|
| `supabase` | DB 스키마 조회/변경, 타입 생성, 보안/성능 점검, 로그 조회, Supabase 공식 문서 검색 | [[supabase-mcp]] |
| `context7` | Next.js/React/Supabase 등 라이브러리의 최신 API/문서 확인 | 아래 참고 |
| `shadcn` | UI 컴포넌트 추가/검색 | 아래 참고 |
| `playwright` | 브라우저에서 실제 동작 검증(로그인 플로우, 폼 제출, 화면 확인) | 아래 참고 |
| `sequential-thinking` | 복잡한 설계/디버깅을 단계별로 구조화해야 할 때 | 아래 참고 |

## supabase

→ 상세 지침은 [[supabase-mcp]] 문서를 따른다. 요약하면: 스키마는 `list_tables`로 확인, DDL은 `apply_migration`으로 적용, 변경 후 `get_advisors`(security/performance) 필수 확인, 타입은 `generate_typescript_types`로 재생성, 디버깅은 `query_logs`, 불확실한 API는 `search_docs`.

## context7

Next.js 16, React 19, `@supabase/ssr` 등은 변화가 빠른 영역이라 학습 데이터가 오래되었을 수 있다. 다음 상황에서는 답을 추측하지 말고 context7로 최신 문서를 확인한다.

- Next.js의 새 API(`cacheComponents`, `"use cache"`, Server Actions, 라우팅 규칙)를 사용할 때 — [[nextjs-16]] 가이드에 없는 세부 사항
- `@supabase/ssr`, `@supabase/supabase-js`의 메서드 시그니처가 버전에 따라 바뀌었는지 확인할 때
- shadcn/ui, Radix UI, Tailwind CSS, `next-themes`, `react-hook-form`/`zod` 등 이 프로젝트가 쓰는(또는 쓸 예정인) 라이브러리의 공식 사용법을 찾을 때

사용 순서: `resolve-library-id`로 라이브러리를 식별한 뒤 `query-docs`로 질문한다. 리팩터링/자체 비즈니스 로직 설계에는 사용하지 않는다(라이브러리 문서 조회 전용).

## shadcn

새 UI 프리미티브가 필요할 때 직접 작성하지 말고 이 서버로 먼저 찾는다.

- `search_items_in_registries` / `list_items_in_registries`로 필요한 컴포넌트가 레지스트리에 있는지 확인
- `view_items_in_registries`로 코드/의존성 확인 후 `get_add_command_for_items`로 설치 명령(`npx shadcn add ...`) 획득
- `get_item_examples_from_registries`로 실제 사용 예시를 참고해 이 프로젝트의 `components/ui/` 컨벤션([[component-patterns]] 참고: `cva` variant, `forwardRef`, `asChild`)과 일치시킨다
- `get_audit_checklist`로 접근성/품질 체크리스트를 확인할 수 있다

## playwright

기능을 구현한 뒤 "빌드가 된다"에서 멈추지 말고, 실제 브라우저 동작까지 확인한다. 특히 이 프로젝트는 인증 리다이렉트(`proxy.ts` → `/auth/login`)와 폼 제출(로그인/회원가입)이 핵심 로직이므로 회귀 여부를 눈으로 확인하는 것이 중요하다.

- 로그인/회원가입/비밀번호 재설정 플로우, `app/protected/*` 접근 제어(미인증 시 리다이렉트)를 변경했다면 `browser_navigate` + `browser_fill_form` + `browser_snapshot`으로 실제 동작을 확인한다
- 콘솔 에러는 `browser_console_messages`, 네트워크 요청(Supabase API 호출 등)은 `browser_network_requests`로 점검한다
- 개발 서버 실행 자체는 `run` 스킬을 우선 사용하고, 그 위에서 상호작용 검증을 playwright로 수행한다

## sequential-thinking

일반적인 구현 작업에는 사용하지 않는다. 다음과 같이 **여러 단계의 트레이드오프를 구조적으로 따져야 하는 경우**에만 사용한다.

- 여러 테이블에 걸친 RLS 정책/마이그레이션 설계처럼 되돌리기 어려운 스키마 변경을 계획할 때
- 기존 `accounts`/`quotes` 스키마와 신규 이벤트 관리 스키마의 관계를 설계할 때(연관 여부가 불명확한 상태이므로 설계 전 구조화된 분석이 유용하다)
- 원인이 바로 보이지 않는 복잡한 버그를 단계적으로 좁혀갈 때

## 참고: claude.ai 커넥터(이 프로젝트의 `.mcp.json`과는 별개)

이 세션에는 Google Drive/Calendar/Gmail/Claude Docs 커넥터도 연결되어 있지만, 이는 `.mcp.json`이 아니라 사용자 Claude 계정에 연결된 범용 도구다. 이벤트 관리 웹앱 코드 작업과는 직접 관련이 없으므로(예: 이메일 발송 기능을 실제로 구현할 때가 아니라면) 기본적으로 사용하지 않는다.
