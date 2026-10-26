# Plugin Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 직접 등록한 GitHub AI 도구의 변경·사용법과 주간 발견을 공개 GitHub Pages 웹앱에서 관리한다.

**Architecture:** GitHub Issue가 관심 등록의 원본이고, Actions가 공개 GitHub API를 조회해 JSON 관측 자료를 Git에 저장한다. 브라우저는 배포된 정적 JSON을 읽으며, 데이터 변경을 만든 Actions 실행에서 정적 빌드와 Pages 배포를 직접 이어간다. 빈 관심 목록으로 시작하고 발견 후보만 자동 수집한다.

**Tech Stack:** Node.js 22 이상, JavaScript ES modules / JSDoc, 내장 fetch 및 node:test, HTML / CSS, GitHub REST API / Issue Forms / Actions / Pages. 필수 외부 서비스·유료 API·프레임워크 런타임 없음.

**Spec:** `docs/superpowers/specs/2026-10-26-plugin-inventory-design.md` (2026-10-26 사용자 승인).

## Global Constraints

- 소유자 `hyuuShin`, 제안 저장소 `hyuuShin/plugin-inventory`, Pages base path `/plugin-inventory/`. 로컬 gh 기본 계정을 전역 변경하지 않는다.
- 공개 목록, GitHub 공개 자료만 수집, Issue 작성자가 `hyuuShin`인 등록만 반영. 외부인 Issue·PR·라벨만 있는 임의 기록을 등록하지 않는다.
- 유형 Skill / MCP / Plugin. 기본 용도: 개발 / 브라우저 / 문서 / 디자인 / 데이터 / 업무 자동화 / 조사 / 기타.
- 유료 AI API, 자동 번역, SNS, 설치 탐지, 설치 실행, 브라우저 PAT 입력 없음. 원문 설명·사용자 한국어 메모·공식 링크 사용.
- 기본 브랜치 저장소 / tree 경로 / blob 파일 추적. 저장소 릴리스와 개별 경로 커밋을 구분한다.
- 매일 09:17 KST (`17 0 * * *`), 월요일 09:43 KST (`43 0 * * 1`), 수동 실행 제공. UI `ko-KR`, 시간대 `Asia/Seoul`.
- 최근 90일 관측, 최근 52주 발행물, 열린 등록 최대 100개, 발견 후보 최대 200개, 목록 20개씩 더 보기.
- GitHub API 오류·이력 부족·집계 한도를 0으로 숨기지 않는다. 자료가 48시간, 주간 발행물이 9일 이상 오래되면 안내한다.
- 공개 정적 파일에는 토큰, 전체 Issue 원문, 작성자 이메일, 목업·가짜 자료를 넣지 않는다.
- 단일 저장소 concurrency group으로 수집·자료 커밋·배포를 직렬화한다. bot 커밋의 push 후속 실행에 의존하지 않는다.
- 목업은 `.superpowers/`에만 남기고 배포/소스에 복사하지 않는다. 운영 UI와 데이터 모델을 새로 구현한다.

## Review Focus

1. 브랜치명·파일명에 슬래시, 한글, URL 인코딩이 있을 때 잘못된 범위를 추적하지 않는다 — Task 2 테스트.
2. README·메모·Issue 제목이 HTML/스크립트 또는 shell 구문을 포함해도 텍스트로만 다룬다 — Tasks 3, 8, 9 테스트.
3. 최초 실행·empty repository·릴리스 없음·경로 삭제가 네트워크 실패와 구분된다 — Tasks 2, 4, 7 테스트.
4. 검색 결과에서 후보가 사라지거나 별 수가 감소하고 7일 전 자료가 누락되어도 급상승 수치를 만들지 않는다 — Tasks 5, 6 테스트.
5. Issue 편집·닫기와 예약 작업이 겹치거나 커밋/배포가 실패해도 마지막 정상 자료와 다음 동기화를 보존한다 — Tasks 7, 10, 11 테스트.

---

## File structure and shared contracts

```text
config/app.json                         # 계정·base path·분류·수집 한도
shared/contracts.mjs                    # 브라우저/Node 공용 schema 검증과 빈 자료
collector/github.mjs                    # GitHub 요청·재시도·요청 예산·페이지 순회
collector/targets.mjs                   # 주소 정규화·기본 브랜치 범위 해석
collector/registrations.mjs             # Issue 파싱·권한·중복·등록 오류
collector/tools.mjs                     # 범위별 커밋·릴리스·필드 오류 유지
collector/history.mjs                   # 일별 관측·보존·비교 기준
collector/discovery.mjs                 # 검색·후보 pool·주간 선정
collector/run.mjs                       # 전체 수집과 원자적 자료 저장
web/index.html                         # 정적 앱 shell
web/styles.css                         # 공유 토큰·반응형·모든 상태
web/app.mjs                            # 로드·이벤트·화면 전환·포커스
web/state.mjs                          # URL 상태·필터·정렬·표시 범위
web/render.mjs                         # 안전한 DOM 구성·화면별 렌더링
web/format.mjs                         # 한국어 시간·수치·오래됨 판단
scripts/build.mjs                      # 검증한 정적 dist 출력
scripts/check-site.mjs                 # 링크·base path·배포 자료 검사
scripts/serve.mjs                      # 로컬 dist 미리보기
data/current.json                      # 현재 목록과 도구·실행 정보
data/history.json                      # 일별 관측
data/candidates.json                   # 발견 후보 pool
data/weeks.json                        # 주간 발견 보존
.github/ISSUE_TEMPLATE/track-tool.yml   # 관심 등록 양식
.github/ISSUE_TEMPLATE/config.yml       # 등록 진입 안내
.github/workflows/verify.yml           # PR 및 push의 오프라인 검증
.github/workflows/update-and-deploy.yml# 동기화·수집·자료 커밋·Pages
tests/helpers/fixtures.mjs             # 테스트 전용 입력 생성기
tests/*.test.mjs                       # 각 경계의 의미 있는 테스트
DESIGN.md                              # 승인한 시각·동작 기준
README.md                              # 등록·운영·수동 갱신·복구
```

공용 자료 형식은 JSDoc과 validator로 고정한다. 모든 날짜는 UTC ISO 8601로 저장하고 UI에서 KST로 표시한다. `id`는 문자열 Issue 번호다.

- `AppConfig = {owner, repository, basePath, timeZone, categories, limits, discoveryQueries}`.
- `Target = {repositoryId, owner, repo, defaultBranch, scopeType:'repository'|'directory'|'file', scopePath, url}`.
- `Registration = {id, issueNumber, issueUrl, name, kind, category, memo, target:Target|null, validation:{status:'valid'|'invalid'|'duplicate'|'over-limit', message}}`.
- `Field<T> = {value:T|null, status:'ok'|'missing'|'error'|'partial', attemptedAt, succeededAt, errorCode:null|string}`. 실패 시 직전 성공 value/succeededAt 유지.
- `ToolRecord = {id, target, metadata:Field, release:Field, activity:Field, changes:{releaseChanged,commitChanged,baselineAvailable}}`.
- `Observation = {repositoryId, scopePath, observedAt, stars:number|null, releaseId:null|number, commitSha:null|string, valid:{stars,release,activity}}`.
- `Candidate = {repositoryId, fullName, url, description, topics, stars, pushedAt, archived, fork, discoveredAt, lastSuccessfulAt}`.
- `WeeklyReport = {weekId, publishedAt, status:'ok'|'partial'|'error', growth:[], newcomers:[], coverage}`. Each growth entry includes `baselineAt`, `observedAt`, `baselineStars`, `stars`, `delta`, source URLs; newcomers have null delta.
- `SiteData = {schemaVersion:1, registrations:[], tools:[], weekly:WeeklyReport|null, run:{lastAttemptAt,lastSuccessfulAt,lastPublishedAt,status,workflowUrl}}`.
- `StoredData = {current:SiteData, history:Observation[], candidates:Candidate[], weeks:WeeklyReport[]}`.
- `fixtureConfig(overrides={})`, `fixtureIssue(overrides={})`, `fixtureTool(overrides={})`, `fixtureStored(overrides={})` provide deterministic test data. Fixtures remain under tests and are never deployed.

## Task 1: Validated empty application and static build

**Files:** Create `package.json`, `config/app.json`, `shared/contracts.mjs`, `data/{current,history,candidates,weeks}.json`, `scripts/{build,serve,check-site}.mjs`, `web/index.html`, `tests/helpers/fixtures.mjs`, `tests/contracts.test.mjs`, `tests/build.test.mjs`; modify `.gitignore` to exclude `dist/`, local inspection output, and secrets.

**Interfaces:** Produces `validateConfig(value):AppConfig`, `validateSiteData(value):SiteData`, `createEmptyStored(config, now):StoredData`, `buildSite({rootDir,outDir,config}):Promise<void>`. Static build writes `dist/index.html`, assets, `dist/config.json`, and `dist/data/` with only public data. npm commands: `test`, `build`, `check`, `preview`, `collect`.

- [x] Write `validates_empty_site`, `rejects_wrong_owner_and_unsupported_schema`, `builds_project_subpath`, `does_not_copy_test_or_mockup_files`: assert owner `hyuuShin`, schema 1, empty registrations, `/plugin-inventory/` URLs, and no `.superpowers`, token, workflow or fixture in dist. Node tests use temporary directories and clean them up.
- [x] Run `node --test tests/contracts.test.mjs tests/build.test.mjs`; confirm they fail because the public functions do not exist.
- [x] Implement the contracts, config, empty JSON and copy/validation build. Use UTC time inputs passed into functions, not wall-clock-dependent tests. Set initial budgets: 800 requests/run, 3 concurrent requests, 20s request timeout, at most 2 retries, at most 5 commit pages per scope. Store explicit partial states when a limit is reached. Set repo and base path from config.
- [x] Run the two tests, `npm run build`, `npm run check`; require all pass and dist has a valid empty dataset.
- [x] Commit as `feat: add validated static app foundation`.

## Task 2: GitHub client and target scope resolution

**Files:** Create `collector/github.mjs`, `collector/targets.mjs`, `tests/github.test.mjs`, `tests/targets.test.mjs`; extend fixtures with a deterministic mock transport.

**Interfaces:** Produces `createGitHubClient({token,fetchImpl,limits,clock,sleep}):{get,paginate,budget}` where `get(path,{query}={}):Promise<{data,status}>` accepts only GitHub REST paths, and `paginate(path,{query,maxPages}):Promise<{items,complete}>` follows bounded API pagination. Produces `parseGitHubUrl(input):{owner,repo,route,encodedTail}`, `resolveTarget(input,client):Promise<Target>`. Network and timers are injected for tests.

- [x] Write tests `resolves_root_tree_blob_and_slash_default_branch`, `preserves_korean_and_encoded_paths`, `rejects_non_default_refs_and_credential_urls`, `rejects_off_host_redirects`, `distinguishes_api_404_401_429_and_empty_409`, `stops_at_budget_and_marks_pagination_partial`. Assert file scope stays a file, tree scope stays its exact directory, a repository's default branch is obtained from metadata, and retries are bounded.
- [x] Run `node --test tests/github.test.mjs tests/targets.test.mjs`; verify missing implementation failures.
- [x] Implement URL validation and metadata resolution, API response/error mapping, budget reservation before concurrent dispatch, same-host redirect restrictions, Retry-After handling capped at 120 seconds, and cache/deduplication of repeated requests within a run. URL credentials, ports, dot traversal and malformed percent-encoding are invalid. A 404 is an inaccessible resource, not a fabricated empty list.
- [x] Rerun both suites; prove no test uses live network or real credentials.
- [x] Commit as `feat: resolve public GitHub tracking scopes`.

## Task 3: Owner-managed Issue registration lifecycle

**Files:** Create `collector/registrations.mjs`, `.github/ISSUE_TEMPLATE/{track-tool.yml,config.yml}`, `tests/registrations.test.mjs`.

**Interfaces:** Consumes config and Task 2 target resolver. Produces `parseRegistrationIssue(issue,config):{draft,error}`, `syncRegistrations({issues,config,resolve}):Promise<Registration[]>`. Form headings are exactly `GitHub 주소`, `표시 이름`, `유형`, `용도 분류`, `내 사용법 메모`, with respective field IDs `github-url`, `display-name`, `kind`, `category`, `usage-memo`; label `watchlist`; blank optional answers normalize to empty strings. Invalid registrations remain visible with null target and an actionable validation message.

- [x] Write tests `owner_only_open_issue`, `ignores_pr_and_external_author`, `updates_memo_and_handles_close_reopen`, `chooses_lowest_open_issue_for_duplicate_scope`, `retains_different_paths_in_one_repo`, `shows_bad_registration_without_stopping_good_ones`, `limits_100_without_silent_drop`, `keeps_shell_and_html_payload_inert`. Assert exact kind/category validation, size limits, and ignored external Issues never request target metadata.
- [x] Run `node --test tests/registrations.test.mjs`; verify expected missing-function failures.
- [x] Implement stable heading parsing and the input forms. Enforce name <=120, memo <=4000, URL <=2048 characters; larger or malformed answers become validation errors. Read fields as text. Do not write comments, create extra approval flows, delete duplicate Issues or run Issue content.
- [x] Rerun tests and inspect the YAML to confirm the field IDs support prefilled candidate URLs and every required category exists in config.
- [x] Commit as `feat: manage watchlist through owner Issue forms`.

## Task 4: Scope-aware releases and maintenance evidence

**Files:** Create `collector/tools.mjs`, `tests/tools.test.mjs`.

**Interfaces:** Produces `collectTool({registration,previous,client,now}):Promise<ToolRecord>` and `deriveToolSignals(tool,now):{recentRelease,attention,noRecentChange,stale}`. `metadata.value` includes canonical repository ID/name, description, stars, archived, defaultBranch, source URLs. `release.value` includes id/tag/publishedAt/url/scope='repository'. `activity.value` includes scopeType/path, lastCommitSha/date/url, pathExists, bins:[{start,count:number|null}], complete.

- [x] Write tests `filters_drafts_and_prereleases`, `no_release_requires_successful_list`, `path_commit_is_not_repo_commit`, `path_deletion_does_not_expand_scope`, `empty_repository_has_no_commit_without_error`, `archived_and_90_day_quiet_are_distinct`, `partial_history_keeps_unknown_bins_null`, `partial_field_failure_preserves_last_good_value`, `first_observation_is_not_an_update`. Assert 7-day release and 90-day inactivity boundaries with fixed timestamps.
- [x] Run `node --test tests/tools.test.mjs`; confirm failures before implementation.
- [x] Implement metadata, bounded stable-release lookup, path existence and bounded 84-day commit collection. Cache repo data for multiple scopes. If release ordering/pagination cannot establish latest, mark partial rather than guess. Distinguish empty repository 409 from nonexistent path. Derive counts from collected bins and label limited intervals honestly.
- [x] Rerun the suite and all prior tests. Check inactive does not imply archived and API failure is not zero activity.
- [x] Commit as `feat: collect release and scope maintenance evidence`.

## Task 5: Durable observations and retention

**Files:** Create `collector/history.mjs`, `tests/history.test.mjs`.

**Interfaces:** Produces `mergeObservations(previous,incoming,{now,days:90}):Observation[]`, `findWeeklyBaseline(observations,{repositoryId,now}):{baseline,current}|null`, `retainWeeks(weeks,{count:52}):WeeklyReport[]`. Daily observations are keyed by UTC date + repositoryId + scopePath; stars compare repository-level values only once.

- [x] Write tests `replaces_same_day_without_erasing_success`, `retains_90_days_and_52_weeks`, `missing_day_is_not_zero`, `baseline_uses_6_to_8_day_actual_interval`, `renamed_repo_uses_stable_id`, `changed_scope_starts_new_activity_baseline`, `failed_or_negative_star_observation_cannot_fabricate_growth`. Assert current 125/baseline 100 yields delta25 and records both actual dates; no valid baseline yields null.
- [x] Run `node --test tests/history.test.mjs`; verify missing implementation failures.
- [x] Implement deterministic observation merging, valid-field preservation, scope-aware activity baselines, repository-level stars history and retention with stable sort order. A legitimate reduction in stars remains a negative difference.
- [x] Rerun the suite; inspect tests on midnight UTC, KST presentation differences and exact cutoff boundaries.
- [x] Commit as `feat: persist bounded GitHub observation history`.

## Task 6: GitHub-only candidate pool and weekly discovery

**Files:** Create `collector/discovery.mjs`, `tests/discovery.test.mjs`; add exact search strings to `config/app.json`.

**Interfaces:** Produces `refreshCandidatePool({previous,searchResults,trackedRepositoryIds,config,now,reportDue}):Candidate[]`, `buildWeeklyReport({candidates,observations,previousWeeks,now,coverage}):WeeklyReport`. It consumes Task 5 baselines; growth entries contain exact underlying observations. Search strings use topics `mcp-server`, `model-context-protocol`, `agent-skills`, and `claude-code plugin in:name,description`, with `archived:false fork:false` and bounded pages. No scraping.

- [x] Write tests `deduplicates_topic_search_by_repo_id`, `excludes_tracked_scopes_by_repository`, `initial_pool_has_only_newcomers`, `growth_requires_positive_valid_baseline`, `ranks_delta_then_activity_stars_name`, `keeps_week_baselines_before_pool_eviction`, `missing_search_result_does_not_erase_history`, `incomplete_search_marks_report_partial`, `pool_200_and_report_5_plus_5_limits`. Assert equal-delta ties are deterministic and a star loss never appears as rising.
- [x] Run `node --test tests/discovery.test.mjs`; observe expected failures.
- [x] Implement bounded search admission, daily polling of admitted candidates, bootstrap search when no pool exists, weekly refresh and post-publication eviction. Keep selected weekly baselines until report publication; mark unobserved/failed candidate fields. Preserve GitHub description as original text and call results related candidates, not verified installable tools or official Trending.
- [x] Rerun tests and all collector suites; verify no AI/translation/SNS endpoint exists.
- [x] Commit as `feat: publish evidence-based weekly GitHub discoveries`.

## Task 7: Collection orchestration and recoverable data writes

**Files:** Create `collector/run.mjs`, `tests/run.test.mjs`; finish package `collect` command.

**Interfaces:** Produces `collectAll({config,previous,client,now,weekly,workflowUrl}):Promise<StoredData>`, `writeStoredData({directory,data}):Promise<void>`, CLI `node collector/run.mjs --mode daily|weekly|registration --data-dir data`. Serialization uses a validated staging directory and atomic per-file rename; failures never replace current JSON with truncated content. Code publishes a fully validated set only after all staging writes succeed.

- [x] Write tests `bootstrap_empty_list_still_discovers`, `full_issue_state_beats_event_order`, `one_bad_tool_does_not_block_others`, `whole_api_failure_preserves_data_and_dates`, `schema_failure_does_not_touch_old_files`, `no_history_or_snapshot_lost_on_write_error`, `bounded_requests_and_retries_terminate`, `new_week_does_not_rewrite_existing_report_without_new_success`. Inject filesystem failure and fixed clock.
- [x] Run `node --test tests/run.test.mjs`; verify intended failures.
- [x] Implement full-state Issue sync, collection, snapshot merge, pool refresh, weekly due calculation, run summary, and staged validation. Persist `lastAttemptAt` on each run, `lastSuccessfulAt` only on a meaningful successful collection, and pass publication time explicitly during build/deploy. Remove closed entries from current output without deleting unrelated historical observations.
- [x] Run all tests; run an offline end-to-end fixture that produces four valid data files, partial errors, and no watchlist seed data. Test fixture inputs stay out of dist.
- [x] Commit as `feat: orchestrate recoverable watchlist collection`.

## Task 8: Working watchlist and detail UI

**Files:** Create `web/{app,state,render,format}.mjs`, `web/styles.css`, `tests/state.test.mjs`, `tests/format.test.mjs`, `DESIGN.md`; update `web/index.html` and build asset list.

**Interfaces:** Produces `parseViewState(search):ViewState`, `serializeViewState(state):string`, `selectVisibleTools(data,state):{rows,total,hasMore,counts}`, `formatDateTime(iso):string`, `freshnessStatus({lastSuccess,now,weekly}):string`, `renderApp(root,{config,data,state,now}):void`. ViewState fields: `view`, `query`, `kind`, `category`, `sort`, `selectedId`, `limit` (increments20). `renderApp` creates nodes using textContent and allowlisted URL setters; source descriptions never enter innerHTML.

- [x] Write tests `filters_name_category_and_memo`, `stable_sort_and_more20`, `counts_are_derived`, `roundtrips_unicode_state`, `clamps_after_filter_change`, `formats_kst_and_missing_dates`, `stale_48h_and_weekly_9d`, `invalid_or_missing_selected_id_returns_list`. Assert first view on empty current data has no sample tool.
- [x] Run `node --test tests/state.test.mjs tests/format.test.mjs`; verify missing implementation failures.
- [x] Implement approved layout: named neutral navigation; table with separate release/maintenance columns; selected detail with exact tracking scope and source links; native accessible filter controls; clear search; URL state; 20-item more button. No new framework or CSS dependency. Maintain shared tokens in DESIGN.md and CSS. Use a locally available Korean sans-serif font stack; avoid mandatory third-party font requests.
- [x] Build and serve dist. Browser-check empty/no-results/partial-error/archived/no-release/path scope, search with Korean composition, filters, sort, more, detail/back, URL refresh, keyboard focus, long unbroken repo names, and literal `<script>`/shell payload text. On 1440/768/390 verify no document-wide horizontal overflow and list state/scroll are restored after mobile detail.
- [x] Commit as `feat: build responsive watchlist and evidence detail UI`.

## Task 9: Weekly discovery and GitHub registration links

**Files:** Extend `web/{app,render,state}.mjs`, `web/styles.css`, create `web/links.mjs`, `tests/links.test.mjs`; update `DESIGN.md`.

**Interfaces:** Produces `issueFormUrl({config,targetUrl='',name='',kind='',category='',memo=''}):string`, `issueUrl(config,number):string`, `workflowUrl(config):string`, `safeGitHubUrl(input):string|null`. Uses template `track-tool.yml` and the exact Task 3 field IDs. Full issue URL is linked for edit/close/reopen; do not assume an unsupported direct edit URL.

- [x] Write tests `issue_form_encodes_repo_path_and_korean_memo`, `link_uses_config_owner_and_repo`, `rejects_javascript_and_other_hosts`, `candidate_prefill_does_not_claim_saved`, `field_size_never_creates_oversized_url`. Long optional memo is not embedded in the prefill URL; preserve target URL and show a plain instruction to enter remaining text on GitHub.
- [x] Run `node --test tests/links.test.mjs`; confirm intended failures.
- [x] Implement weekly report screen, growth/newcomer separation, actual observation periods and source descriptions. Add registration screen explaining GitHub submission and reflection delay, owner-only policy and publicly visible records. Wire all enabled source/README/Issue/Actions links to valid destinations; unavailable sources are labeled rather than fake buttons.
- [x] Browser-check candidate registration in a new tab without submitting it, external navigation safety, copy for empty first week/partial collection, keyboard flow, and mobile weekly/registration views. Return to the application without losing list state.
- [x] Commit as `feat: connect weekly discoveries and GitHub registration`.

## Task 10: GitHub workflow and operating guide

**Files:** Create `.github/workflows/{verify,update-and-deploy}.yml`, `tests/workflow.test.mjs`, `README.md`; modify build/run scripts only as needed for separate prepared/published timestamps.

**Interfaces:** update workflow runs on main push, authorized Issue lifecycle, `schedule`, `workflow_dispatch`. Inputs include mode and optional dry-run; scripts read GitHub event JSON through `GITHUB_EVENT_PATH`. Job outputs name collected revision/artifact identity explicitly. A single concurrency group covers all production updates, with `cancel-in-progress:false`.

- [x] Write tests `only_owner_registration_events_trigger_writes`, `collector_reads_payload_as_data`, `workflow_uses_single_writer_group`, `data_commit_and_deploy_are_in_same_run`, `failed_build_never_deploys`, `verify_uses_only_offline_fixtures`. Use structured workflow checks plus orchestration tests; don't implement tests that only snapshot whitespace.
- [x] Run `node --test tests/workflow.test.mjs`; verify failing assertions before workflow creation.
- [x] Implement standard Ubuntu workflows pinned to reviewed action revisions. Read/collect job gets contents/issues read; isolated data-persist job gets contents write and reruns against current main if its source revision changed; deploy job gets only pages write/id-token write and needs a successful validated artifact. Reuse collected public files between jobs; never upload tokens or event payloads. Explicitly deploy in the same run after bot data commit. PR verification never commits or deploys. Set short Pages-artifact retention and avoid long-lived caches. Record actual successful Pages deployment time after the deploy action succeeds for the next collected snapshot; do not label an artifact build time as a completed deployment. Display data freshness from collection timestamps and link the current deployment run.
- [x] Add README instructions for Issue registration/edit/close/reopen, source scope, manual run, first-week observations, 60-day scheduled-workflow suspension, stale-data recovery, API/Pages usage limits and account-specific local commands. Document one authorized operator and no auto-comment behavior.
- [x] Run all offline checks plus `npm run build` and `npm run check`; exercise a dry-run from fixture inputs and inspect job dependency/permission boundaries.
- [x] Commit as `ci: automate collection and GitHub Pages publishing`.

## Task 11: Whole-application verification and review

**Files:** Add focused regression tests only for failures found; update `README.md`, `DESIGN.md`, this plan's checkbox state and any affected implementation file.

**Interfaces:** Uses all prior public interfaces; no new architecture. Maintain a short validation record with exact commands and outcomes.

- [x] Run `npm test`, `npm run build`, `npm run check`, and `git diff --check`. Confirm no live tests depend on credentials, no dist fixture/sample records, and source account/base path are configured rather than duplicated literals.
- [x] Using a fixture-only temporary data directory, simulate a renamed repo, slash branch, long Korean path, archived project, empty repository, no release, missing path, API limit, missing baseline, negative stars, edited/closed Issue, and failed commit/deploy. Require the last good public data remain usable and all uncertainty states honest.
- [x] Inspect the built application at desktop/tablet/mobile and through keyboard flows. Verify no tokens in files or requests, no source HTML interpretation, direct-link refresh, accessible form/filter labels, selected state and mobile back behavior.
- [x] Obtain the independent whole-branch code review required by the chosen execution workflow. Fix substantive findings, then rerun only affected checks and the final build/check. Native execution uses one fresh reviewer at this point; do not fan out implementation tasks unless user chose that method.
- [x] Commit final corrections and record which automated checks and browser checks actually ran. Do not claim published before Task12 verifies the remote site.

## Task 12: Owner-account repository setup and live Pages verification

**Files:** Update config/workflow/README only if verified remote facts require it; do not introduce deployment credentials into files.

**Interfaces:** External target is `hyuuShin/plugin-inventory`. Authenticate each remote write explicitly as hyuuShin using a process-scoped credential retrieved from gh's keyring; never print it, persist it in git remote URLs, or change gh's global active account. Git author identity is distinct from GitHub authentication.

- [x] Read remote existence and ownership through hyuuShin authentication. If absent, create the public repository with Issues enabled; if present, compare its contents/history before connecting. An unrelated existing project is a concrete conflict requiring a new name, not authorization to overwrite it.
- [x] Create the `watchlist` label, connect origin without embedded credentials, push the reviewed main branch using a process-scoped authenticated git transport. Configure Pages source as GitHub Actions, use the default github.io domain and a github-pages environment restricted to main. Do not enable paid runners or add external service secrets.
- [x] Trigger bootstrap collection/deployment and inspect the exact workflow run. Require all dependency gates pass, the public URL answers successfully, static assets use `/plugin-inventory/`, and generated data reflects actual successful collection times with an empty interest list.
- [x] Run a live Issue lifecycle smoke check using one clearly marked temporary owner-authored Issue for a real public GitHub source; verify add, edit, close, reopen and close again. Retain the closed audit Issue but leave the active interest list empty. Do not post to another project's Issues or import the mockup tools.
- [x] Verify daily and weekly schedules are installed, manual run is available, and the final deployed list contains no temporary open record. Check public JSON for tokens, personal emails and sample metrics. A first report may contain only newcomers and must say so.
- [x] Commit any deployment fixes and repeat affected checks. Deliver the actual site URL, repo URL, validation summary, any closed smoke-test Issue link, and the first-real-registration instructions. If GitHub policy or account state blocks a step, report the exact failed action and continue independently useful validation; never replace a rejected operation with a broader credential or paid service.

## Plan self-review

- Spec coverage: goals/constraints → Global Constraints; registration/lifecycle → Task3; repository/path semantics → Tasks2/4; daily and retention → Tasks5/7; weekly/no paid AI → Task6; UI and accepted mockup → Tasks8/9; concurrency, token/publish constraints → Task10; production validation and account-specific setup → Tasks11/12.
- Interfaces: collector shares Task1 data contracts and Task2 client; Task6 consumes Task5 observations; Task7 integrates rather than reimplements those units; UI uses only public config/data. Weekly report property names and null states are shared with validators.
- Review Focus: all five classes have explicit owning tests above. Tool and web tests are meaningful behavior checks, not implementation mirrors. CSS/copy-only corrections use browser verification rather than extra tests.
- Execution order is sequential for shared interfaces. This is one app outcome; separate subsystem plans would add coordination without producing independently useful personal tools.
- No product code, scaffolding, dependencies, remote repository or deployment is created by this plan-writing step. Begin execution only after the plan review and method choice required by writing-plans.
