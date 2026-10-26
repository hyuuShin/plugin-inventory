import { selectVisibleTools } from "./state.mjs";
import { formatDateTime, formatNumber, freshnessStatus } from "./format.mjs";
import { issueFormUrl, workflowUrl, safeGitHubUrl } from "./links.mjs";
import { comparisonState } from "./signals.mjs";
export function node(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || (value === false && !key.startsWith("aria-")))
      continue;
    if (key === "class") el.className = value;
    else if (key === "value") el.value = value;
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null) continue;
    el.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return el;
}
export function external(url, label, className = "") {
  const safe = safeGitHubUrl(url);
  return safe
    ? node(
        "a",
        {
          href: safe,
          target: "_blank",
          rel: "noopener noreferrer",
          class: className,
        },
        label,
        node("span", { class: "sr-only" }, " (새 탭)"),
      )
    : node("span", { class: "muted" }, label + " · 링크 없음");
}
const button = (label, action, attrs = {}) =>
  node("button", { type: "button", "data-action": action, ...attrs }, label);
const text = (label, cls = "muted small") => node("p", { class: cls }, label);
const repoUrl = (c) => "https://github.com/" + c.owner + "/" + c.repository;
const titleRow = (title, sub, action) =>
  node(
    "header",
    { class: "heading" },
    node("div", {}, node("h1", { tabindex: "-1" }, title), text(sub, "muted")),
    action,
  );
function select(id, label, value, items) {
  const el = node(
    "select",
    { id, "aria-label": label },
    items.map(([v, l]) => node("option", { value: v }, l)),
  );
  el.value = value;
  return el;
}
function detail(row) {
  const t = row.tool,
    head = [
      button("← 목록으로", "back", { class: "button mobile-back" }),
      text(row.kind + " / " + row.category),
      node("h2", {}, row.displayName),
    ];
  if (!t)
    return node(
      "aside",
      { class: "detail", "aria-label": "도구 상세" },
      head,
      text(
        row.validation.message || "아직 자료를 수집하지 못했습니다",
        "notice",
      ),
      external(row.issueUrl, "등록 Issue 확인", "button"),
    );
  const m = t.metadata.value,
    a = t.activity.value,
    r = t.release.value;
  const info = node(
    "dl",
    { class: "facts" },
    node("dt", {}, "추적 범위"),
    node(
      "dd",
      {},
      t.target.scopeType === "repository" ? "저장소 전체" : t.target.scopePath,
    ),
    node("dt", {}, "저장소 릴리스"),
    node(
      "dd",
      {},
      r?.tag ?? (t.release.status === "missing" ? "없음" : "확인 불가"),
    ),
    node("dt", {}, "최근 커밋"),
    node(
      "dd",
      {},
      a?.lastCommitDate
        ? formatDateTime(a.lastCommitDate)
        : a?.lastCommitSha === null
          ? "기록 없음"
          : "확인 불가",
    ),
  );
  const sections = [
    text(m?.description || "GitHub 원문 설명이 없습니다", "description"),
    info,
  ];
  const comparison = comparisonState(t);
  sections.push(
    node(
      "section",
      {},
      node("h3", {}, "이전 확인과 비교"),
      comparison.baseline === "first"
        ? text("첫 확인입니다. 다음 성공 수집부터 변경을 비교합니다.")
        : [
            text(
              comparison.release === "unknown"
                ? "저장소 릴리스 비교 미확인"
                : comparison.release === "changed"
                  ? "이전 확인 이후 저장소 릴리스 변경"
                  : "이전 확인 이후 새 저장소 릴리스 없음",
              comparison.release === "changed"
                ? "small data-tone"
                : "small muted",
            ),
            text(
              comparison.activity === "unknown"
                ? "추적 범위 변경 비교 미확인"
                : comparison.activity === "changed"
                  ? "이전 확인 이후 추적 범위의 커밋 변경"
                  : "이전 확인 이후 추적 범위의 새 커밋 없음",
              comparison.activity === "changed"
                ? "small data-tone"
                : "small muted",
            ),
          ],
    ),
  );
  if ([t.metadata, t.release, t.activity].some((f) => f.status === "error"))
    sections.push(
      text("일부 조회에 실패하여 직전 확인 자료를 함께 표시합니다.", "notice"),
    );
  if (a?.pathExists === false)
    sections.push(
      text(
        "추적 경로를 찾을 수 없습니다. 등록 Issue에서 주소를 확인해 주세요.",
        "notice",
      ),
    );
  if (m?.archived)
    sections.push(text("GitHub에서 보관된 저장소입니다.", "notice"));
  if (a?.bins?.length) {
    const max = a.bins.some((b) => b.count !== null)
        ? Math.max(0, ...a.bins.map((b) => b.count ?? 0))
        : null,
      bars = node("div", {
        class: "activity",
        role: "img",
        "aria-label":
          "최근 12주 주별 커밋: " +
          a.bins
            .map((b) => (b.count === null ? "미확인" : b.count + "회"))
            .join(", "),
      });
    a.bins.forEach((b) => {
      const bar = node("i", {
        class: b.count === null ? "unknown" : b.count === 0 ? "zero" : "",
      });
      bar.style.height =
        (b.count === null
          ? 100
          : Math.max(3, (b.count / Math.max(1, max ?? 0)) * 100)) + "%";
      bars.append(bar);
    });
    sections.push(
      node(
        "section",
        {},
        node("h3", {}, "최근 12주 활동"),
        bars,
        node(
          "div",
          { class: "chart-caption" },
          node("span", {}, "12주 전"),
          node(
            "span",
            {},
            max === null
              ? "커밋 수 미확인"
              : "주별 커밋 · 최대 " + formatNumber(max) + "회",
          ),
          node("span", {}, "최근"),
        ),
        a.complete
          ? null
          : text("집계 일부 · 미확인 구간은 점선으로 표시합니다."),
      ),
    );
  }
  sections.push(
    node(
      "section",
      {},
      node("h3", {}, "내 사용법 메모"),
      node(
        "p",
        { class: "memo" },
        row.memo || "사용법 메모를 추가할 수 있습니다.",
      ),
      external(row.issueUrl, "메모 수정 · 등록 관리", "text-link"),
    ),
  );
  sections.push(
    node(
      "section",
      {},
      node("h3", {}, "원문과 변경 기록"),
      node(
        "div",
        { class: "source-links" },
        external(t.target.url, "추적 대상"),
        external(m?.url ? m.url + "#readme" : null, "공식 README"),
        r?.url ? external(r.url, "저장소 릴리스") : null,
        a?.lastCommitUrl ? external(a.lastCommitUrl, "최근 커밋") : null,
      ),
    ),
  );
  sections.push(text("자료 확인 " + formatDateTime(t.metadata.succeededAt)));
  return node(
    "aside",
    { class: "detail", "aria-label": "도구 상세" },
    head,
    sections,
  );
}
function releaseCell(row) {
  if (!row.tool) return text("등록 확인 필요");
  const f = row.tool.release;
  return node(
    "div",
    {},
    text(
      f.value?.tag ?? (f.status === "missing" ? "릴리스 없음" : "확인 불가"),
      "small",
    ),
    text(
      f.status === "error"
        ? "조회 실패 · 직전 자료"
        : f.status === "partial"
          ? "일부 릴리스만 확인"
          : row.signals.recentRelease
            ? "7일 내 새 릴리스"
            : "최근 새 릴리스 없음",
      row.signals.recentRelease ? "small data-tone" : "small muted",
    ),
    f.value?.publishedAt ? text(formatDateTime(f.value.publishedAt)) : null,
  );
}
function activityCell(row) {
  const t = row.tool;
  if (!t) return text(row.validation.message, "small warning");
  return node(
    "div",
    {},
    text(
      t.metadata.value?.archived
        ? "저장소 보관됨"
        : t.activity.value?.pathExists === false
          ? "추적 경로 없음"
          : t.activity.status === "error"
            ? "활동 조회 실패"
            : row.signals.noRecentChange
              ? "최근 90일 변경 없음"
              : t.activity.value?.lastCommitDate
                ? formatDateTime(t.activity.value.lastCommitDate)
                : "커밋 기록 없음",
      row.signals.attention ? "small warning" : "small",
    ),
    row.signals.stale ? text("직전 확인 자료 포함") : null,
  );
}
function list(data, config, state, now) {
  const model = selectVisibleTools(data, state, now),
    selected =
      model.selected ??
      (matchMedia("(min-width:1101px)").matches ? model.rows[0] : null);
  const search = node(
    "div",
    { class: "searchbox" },
    node("input", {
      id: "query",
      type: "search",
      "aria-label": "관심 도구 검색",
      placeholder: "이름, 분류, 메모로 검색",
      value: state.query,
    }),
    state.query
      ? button("×", "clear", { "aria-label": "검색어 지우기" })
      : null,
  );
  const toolbar = node(
    "div",
    { class: "toolbar" },
    search,
    select("kind", "도구 유형", state.kind, [
      ["all", "모든 유형"],
      ...["Skill", "MCP", "Plugin"].map((k) => [k, k]),
    ]),
    select("category", "용도 분류", state.category, [
      ["all", "모든 용도"],
      ...config.categories.map((k) => [k, k]),
    ]),
    select("sort", "정렬", state.sort, [
      ["activity", "최근 활동순"],
      ["name", "이름순"],
    ]),
  );
  const summary = node(
    "div",
    { class: "summary" },
    [
      ["all", "관심 도구"],
      ["new", "7일 내 새 릴리스"],
      ["attention", "상태 확인 필요"],
    ].map(([key, label]) =>
      button(
        [
          node("strong", {}, formatNumber(model.counts[key])),
          node("span", {}, label),
        ],
        "signal",
        { "data-signal": key, "aria-pressed": String(state.signal === key) },
      ),
    ),
  );
  const tbody = node(
    "tbody",
    {},
    model.rows.map((row) =>
      node(
        "tr",
        { class: row.id === selected?.id ? "selected" : "" },
        node(
          "td",
          {},
          button(row.displayName, "detail", {
            class: "tool-name",
            "data-id": row.id,
            "aria-label": row.displayName + " 상세 보기",
          }),
          text(
            row.category +
              (row.target?.scopePath ? " · " + row.target.scopePath : ""),
          ),
        ),
        node("td", {}, node("span", { class: "small" }, row.kind)),
        node("td", { "data-label": "최근 릴리스" }, releaseCell(row)),
        node("td", { "data-label": "유지보수" }, activityCell(row)),
      ),
    ),
  );
  const empty = node(
    "div",
    { class: "empty" },
    node(
      "h2",
      {},
      data.registrations.length
        ? "일치하는 도구가 없습니다"
        : "관심 도구를 추가해 보세요",
    ),
    text(
      data.registrations.length
        ? "검색어와 필터를 바꾸면 다른 도구를 볼 수 있습니다."
        : "GitHub 주소를 등록하면 릴리스와 활동을 모아서 확인할 수 있습니다.",
    ),
    data.registrations.length
      ? button("검색과 필터 초기화", "reset", { class: "button" })
      : button("첫 관심 도구 등록", "register", { class: "button primary" }),
  );
  const table = node(
    "div",
    { class: "tablewrap" },
    model.rows.length
      ? node(
          "table",
          {},
          node(
            "thead",
            {},
            node(
              "tr",
              {},
              ["도구 / 용도", "유형", "최근 릴리스", "유지보수"].map((c) =>
                node("th", { scope: "col" }, c),
              ),
            ),
          ),
          tbody,
        )
      : empty,
    node(
      "div",
      { class: "tablefoot", role: "status" },
      formatNumber(model.rows.length) +
        "개 표시 · 검색 결과 " +
        formatNumber(model.total) +
        "개",
      model.hasMore
        ? button("20개 더 보기", "more", { class: "text-link" })
        : null,
    ),
  );
  return [
    summary,
    node(
      "div",
      { class: "workspace" + (model.selected ? " detail-open" : "") },
      node(
        "section",
        { class: "list-column", "aria-label": "관심 도구 목록" },
        toolbar,
        table,
        text(
          "릴리스가 없다는 이유만으로 관리 중단으로 판단하지 않습니다.",
          "footnote",
        ),
      ),
      selected
        ? detail(selected)
        : node(
            "aside",
            { class: "detail empty-detail" },
            node("h2", {}, "도구의 변경과 사용법"),
            text(
              "관심 도구를 선택하면 추적 범위와 활동 근거, 사용법 메모를 확인할 수 있습니다.",
            ),
          ),
    ),
  ];
}
function candidateRow(item, config) {
  const kind = item.topics?.some((t) => t.includes("mcp"))
    ? "MCP"
    : item.topics?.some((t) => t.includes("skill"))
      ? "Skill"
      : "";
  return node(
    "article",
    { class: "candidate" },
    node(
      "div",
      {},
      node("h3", {}, external(item.url, item.fullName)),
      text(
        "별 " +
          formatNumber(item.stars) +
          "개 · 최근 변경 " +
          formatDateTime(item.pushedAt),
      ),
    ),
    node(
      "div",
      {},
      node(
        "p",
        { class: "candidate-description" },
        item.description || "GitHub 원문 설명이 없습니다.",
      ),
      item.delta === null
        ? text("비교 이력 수집 중 · 증가량 미확인")
        : text(
            "관측 별 증가 +" +
              formatNumber(item.delta) +
              "개 · " +
              formatDateTime(item.baselineAt) +
              " → " +
              formatDateTime(item.observedAt),
            "small data-tone",
          ),
    ),
    external(
      issueFormUrl({ config, targetUrl: item.url, name: item.fullName, kind }),
      "등록 검토",
      "button",
    ),
  );
}
function weekly(data, config, now) {
  const report = data.weekly;
  if (!report)
    return node(
      "section",
      { class: "panel" },
      node("h2", {}, "첫 주간 자료를 준비하고 있습니다"),
      text(
        "현재 자료가 없는 상태입니다. 수집 실행을 확인하면 새로 찾은 후보부터 볼 수 있습니다.",
      ),
      external(workflowUrl(config), "수집 실행 확인", "text-link"),
    );
  return node(
    "div",
    { class: "weekly-content" },
    text(
      report.weekId + " 주간 · 자료 생성 " + formatDateTime(report.publishedAt),
      "week-date",
    ),
    freshnessStatus({ lastSuccess: report.publishedAt, now, weekly: true }) ===
      "stale"
      ? text(
          "9일 이상 갱신되지 않은 주간 자료입니다. 실행 상태를 확인해 주세요.",
          "notice",
        )
      : null,
    report.status !== "ok"
      ? text(
          "설정한 검색 범위에서 일부 자료만 확인했습니다. 아래는 확인한 근거가 있는 후보입니다.",
          "notice",
        )
      : null,
    node(
      "section",
      { class: "discovery-section" },
      node("h2", {}, "관측한 주간 변화"),
      text(
        "실제 두 관측 시점의 별 수를 비교했습니다. 전체 GitHub의 공식 순위는 아닙니다.",
      ),
      report.growth.length
        ? node(
            "div",
            { class: "candidates" },
            report.growth.map((item) => candidateRow(item, config)),
          )
        : node(
            "div",
            { class: "panel empty-week" },
            text(
              "비교할 자료가 충분한 상승 후보가 없습니다. 처음에는 약 1주일의 관측 이력이 필요합니다.",
            ),
          ),
    ),
    node(
      "section",
      { class: "discovery-section" },
      node("h2", {}, "새로 찾은 후보"),
      text(
        "아직 주간 증가량을 비교할 수 없는 관련 저장소입니다. 등록 전에 원문과 기능을 살펴보세요.",
      ),
      report.newcomers.length
        ? node(
            "div",
            { class: "candidates" },
            report.newcomers.map((item) => candidateRow(item, config)),
          )
        : node(
            "div",
            { class: "panel empty-week" },
            text("이번 자료에 새로 소개할 후보가 없습니다."),
          ),
    ),
    text(
      "후보는 주제와 이름·설명으로 검색한 결과입니다. 설치 가능한 도구인지와 사용법은 각 GitHub 원문에서 확인합니다.",
      "footnote",
    ),
  );
}
function register(config) {
  const definitions = [
    ["GitHub 주소", "공개 저장소 또는 기본 브랜치의 파일·폴더 주소"],
    ["표시 이름", "원하는 이름을 적거나 비워두면 저장소 이름 사용"],
    ["유형", "Skill / MCP / Plugin 중 선택"],
    ["용도 분류", config.categories.join(" / ")],
    ["내 사용법 메모", "언제, 어떤 명령으로 쓰는지 한국어로 정리"],
  ];
  return node(
    "section",
    { class: "panel registration" },
    node("h2", {}, "GitHub 양식에서 등록합니다"),
    text(
      config.owner + " 계정으로 제출한 공개 Issue만 관심 목록에 반영됩니다.",
    ),
    node(
      "dl",
      { class: "registration-fields" },
      definitions.map(([term, description]) => [
        node("dt", {}, term),
        node("dd", {}, description),
      ]),
    ),
    external(
      issueFormUrl({ config }),
      "GitHub 등록 양식 열기",
      "button primary",
    ),
    text(
      "제출 후 수집·배포가 끝나면 목록에 반영됩니다. 현재 사이트에서 즉시 저장되는 방식은 아닙니다.",
    ),
    node(
      "section",
      {},
      node("h3", {}, "수정 · 제외 · 복원"),
      text(
        "등록한 Issue의 본문을 편집하면 이름과 메모를 바꿀 수 있습니다. 닫으면 현재 관심 목록에서 제외되고, 다시 열면 복원됩니다. 공개된 Git 기록은 남습니다.",
      ),
    ),
    external(
      "https://github.com/" +
        config.owner +
        "/" +
        config.repository +
        "/issues?q=is%3Aissue+label%3Awatchlist",
      "등록 기록 보기",
      "text-link",
    ),
  );
}
export function renderApp(root, { config, data, state, now }) {
  const base = repoUrl(config),
    nav = node(
      "nav",
      { class: "nav", "aria-label": "주 메뉴" },
      [
        ["watchlist", "관심 목록"],
        ["weekly", "이번 주 발견"],
        ["register", "도구 등록"],
      ].map(([view, label]) =>
        node(
          "a",
          {
            href: "?view=" + view,
            "data-view": view,
            "aria-current": state.view === view ? "page" : null,
          },
          label,
        ),
      ),
    );
  const sidebar = node(
    "aside",
    { class: "sidebar" },
    node(
      "div",
      { class: "brand" },
      node("span", { class: "brand-mark", "aria-hidden": "true" }, "⑂"),
      node("span", {}, "Plugin Inventory"),
    ),
    text(config.owner + "의 관심 도구"),
    nav,
    node(
      "div",
      { class: "sidebar-foot" },
      external(base, config.owner + " / " + config.repository, "small"),
      text("GitHub 공개 관심 목록"),
    ),
  );
  const titles = {
    watchlist: ["관심 도구", "최근 릴리스와 유지보수 활동을 구분해서 봅니다."],
    weekly: ["이번 주 발견", "GitHub의 활동 지표로 찾은 관련 도구 후보입니다."],
    register: [
      "관심 도구 등록",
      "GitHub 양식에서 목록과 사용법 메모를 관리합니다.",
    ],
  };
  const main = node(
    "main",
    { class: "canvas" },
    titleRow(
      ...titles[state.view],
      state.view === "watchlist"
        ? button("+ 관심 도구 추가", "register", { class: "button primary" })
        : button("관심 목록으로", "watchlist", { class: "button" }),
    ),
  );
  main.append(
    node(
      "div",
      { class: "run-line" },
      text("마지막 수집 " + formatDateTime(data.run.lastSuccessfulAt)),
      external(
        data.run.workflowUrl || workflowUrl(config),
        "수집 실행 확인",
        "text-link",
      ),
    ),
  );
  if (data.run.status === "partial" || data.run.status === "error")
    main.append(
      text(
        "자료 수집에 " +
          (data.run.status === "error"
            ? "실패했습니다"
            : "일부 실패가 있습니다") +
          ". 직전 확인 자료를 함께 표시합니다.",
        "notice",
      ),
    );
  if (
    freshnessStatus({ lastSuccess: data.run.lastSuccessfulAt, now }) === "stale"
  )
    main.append(
      text(
        "48시간 이상 갱신되지 않았습니다. GitHub Actions에서 수집 실행 상태를 확인해 주세요.",
        "notice",
      ),
    );
  if (state.view === "watchlist") {
    main.append(...list(data, config, state, now));
    main.append(
      node(
        "section",
        { class: "weekly-preview" },
        node(
          "div",
          { class: "section-heading" },
          node("h2", {}, "이번 주 발견"),
          node(
            "a",
            { href: "?view=weekly", "data-view": "weekly", class: "text-link" },
            "전체 후보와 선정 근거 →",
          ),
        ),
        text(
          data.weekly
            ? formatNumber(data.weekly.growth.length) +
                "개 주간 변화 후보 · " +
                formatNumber(data.weekly.newcomers.length) +
                "개 새로 찾은 후보"
            : "첫 주간 자료를 준비하고 있습니다.",
        ),
        data.weekly
          ? node(
              "div",
              { class: "candidates" },
              [...data.weekly.growth, ...data.weekly.newcomers]
                .slice(0, 2)
                .map((item) => candidateRow(item, config)),
            )
          : null,
      ),
    );
  } else if (state.view === "weekly") main.append(weekly(data, config, now));
  else main.append(register(config));
  main.append(
    node(
      "footer",
      {},
      text(
        "GitHub 원문과 직접 작성한 메모를 사용합니다. 주간 후보는 관심 목록에 자동으로 추가되지 않습니다.",
      ),
    ),
  );
  const shell = node("div", { class: "shell" }, sidebar, main);
  for (const old of root.querySelectorAll("input[id],select[id]")) {
    const fresh = shell.querySelector("#" + old.id);
    if (fresh && fresh.tagName === old.tagName) {
      old.value = fresh.value;
      fresh.replaceWith(old);
    }
  }
  root.replaceChildren(shell);
  document.title = titles[state.view][0] + " · Plugin Inventory";
}
