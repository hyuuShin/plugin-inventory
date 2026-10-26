# Plugin Inventory interaction contract

Authority: approved `docs/superpowers/specs/2026-10-26-plugin-inventory-design.md`. Visual identity: `DESIGN.md`.

| Capability | Canonical owner | Behavior / verification |
|---|---|---|
| Select/Listbox | web/render.mjs native selects | OS popup accepted; Korean kind/category/sort labels; keyboard/browser check |
| Form | GitHub track-tool.yml | Owner-only; Issue is edit/close/reopen destination |
| Scrollbar | web/styles.css | Global baseline, never hidden; narrow viewport check |
| Navigation | web/app.mjs and web/state.mjs | Query parameters preserve filters/selection; mobile back restores list scroll |
| Feedback | web/render.mjs inline notices | Empty, no-results, API error, stale distinguished; no native dialogs |
| Dataset | web/state.mjs | 20 rows then explicit more; filter change resets count; counts derive from scope |
| CRUD | GitHub Issue lifecycle | Form create, body edit, close excludes, reopen restores; eventual sync stated |

ko-KR와 Asia/Seoul을 사용한다. 계정명은 목록 소유자이며 로그인 상태가 아니다. 비밀 입력, 파괴적인 앱 내 작업, 모달, 날짜 입력, 표 다중 선택은 없다.
