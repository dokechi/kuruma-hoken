let MODEL_CASES = [];
let SOURCE_REGISTRY = [];

const TYPE_ORDER = ["aioi_type", "tokio_type", "sompo_type", "ms_type", "kyoei_type", "direct_type"];
const CASE_TYPE_ORDER = ["daily", "familyRide", "familyWatch", "nightWork", "variable"];
const state = { questions: [], scoring: {}, results: {}, index: 0, answers: {}, ranked: [], selectedCaseId: null, returnCaseId: null, lastCaseScrollY: 0 };
const CATEGORY_ORDER = ["自分が毎日使う車", "家族を乗せる車", "家族が運転する車", "仕事・夜間で使う車"];
const categoryLabel = (category) => category;
const GLOBAL_DISCLAIMER = "本ページは、当社取扱5社について、特定の付帯サービスを重視する場合の比較の入口を示すものです。保険料、基本補償、保険金支払条件、特約、引受可否、代理店対応等を含む総合評価ではありません。掲載車種・年代は代表例です。実際の商品選択時には、補償内容、保険料、車両条件、契約始期、引受条件等の確認が必要です。";
const $ = (id) => document.getElementById(id);
const CASE_DIAGNOSIS_TYPES = {
  daily: { name: "毎日運転・データ活用型", candidate: "あいおいニッセイ同和損保型", checks: ["安全運転スコア", "走行データの取得条件", "継続時の割引"], caseId: "case1" },
  familyRide: { name: "家族同乗・事故時サポート型", candidate: "東京海上日動型", checks: ["事故自動通報", "音声通話", "SOS"], caseId: "case2" },
  familyWatch: { name: "家族見守り型", candidate: "三井住友海上型", checks: ["位置確認", "運転状況共有", "見守り機能"], caseId: "case4" },
  nightWork: { name: "夜間・現場帰りサポート型", candidate: "損保ジャパン型", checks: ["通信ドラレコ", "事故通知", "現場急行"], caseId: "case3" },
  variable: { name: "使い方変動・複数比較型", candidate: "分岐型：1社固定にしない", checks: ["使用目的", "車ごとの使い方", "変更手続き"], caseId: "case7" }
};
const CASE_Q1 = [
  ["self", "自分が中心", { daily: 2 }],
  ["family", "家族もよく使う", { familyRide: 2, variable: 1 }],
  ["watch", "子どもや親など、見守りたい家族が使う", { familyWatch: 3 }],
  ["work", "仕事でも使う", { nightWork: 2, variable: 1 }],
  ["different", "車ごとに使う人が違う", { variable: 3 }]
];
const CASE_Q2 = [
  ["daily", "ほぼ毎日運転する", { daily: 3 }],
  ["children", "子どもや家族をよく乗せる", { familyRide: 3 }],
  ["family-alone", "家族が一人で運転することがある", { familyWatch: 2, familyRide: 1 }],
  ["night", "夜間・仕事帰りに一人で運転することがある", { nightWork: 3 }],
  ["multi-car", "車が2台以上ある", { variable: 3 }],
  ["changes", "車の使い方が変わることがある", { variable: 3 }],
  ["accident-worry", "事故のとき、自分だけで対応できるか不安", { familyRide: 2, nightWork: 2 }],
  ["unknown", "よく分からないので、近い候補だけ知りたい", { variable: 4 }]
];
const caseDiagnosisState = { q1: "", q2: new Set() };

const RESULT_DESCRIPTIONS = {
  aioi_type: "毎日の運転データや安全運転スコアを比較の入口にしたい人向け。",
  tokio_type: "家族を乗せる車で、事故時の初動を重視する人向け。",
  sompo_type: "夜間や一人の事故現場で、通知や現場対応の不安を減らしたい人向け。",
  ms_type: "家族が運転する車を、位置確認や見守りで把握したい人向け。",
  kyoei_type: "使い方が変わる車で、相談しながら整理したい人向け。",
  direct_type: "保険料や補償内容を先に見比べ、条件を自分で整理したい人向け。",
  daily: "毎日の運転データや安全運転スコアを比較の入口にしたい人向け。",
  familyRide: "家族を乗せる車で、事故時の初動を重視する人向け。",
  familyWatch: "家族が運転する車を、位置確認や見守りで把握したい人向け。",
  nightWork: "夜間や仕事帰りの事故現場で、初動の不安を減らしたい人向け。",
  variable: "車ごとに使い方が変わるため、1社に固定せず複数比較したい人向け。"
};

const COMPANY_COMPARISON = [
  { key: "aioi", label: "あいおい", types: ["aioi_type", "daily"], values: ["◎", "○", "△", "○", "○"] },
  { key: "tokio", label: "東京海上", types: ["tokio_type", "familyRide"], values: ["○", "◎", "○", "△", "○"] },
  { key: "sompo", label: "損保ジャパン", types: ["sompo_type", "nightWork"], values: ["○", "○", "◎", "△", "○"] },
  { key: "ms", label: "三井住友", types: ["ms_type", "familyWatch"], values: ["○", "◎", "△", "◎", "○"] },
  { key: "kyoei", label: "共栄火災", types: ["kyoei_type", "variable"], values: ["△", "○", "○", "△", "◎"] }
];
const COMPARISON_ROWS = ["安全運転", "家族同乗", "夜間事故", "見守り", "使い方変化"];

function resultDescription(type) {
  return RESULT_DESCRIPTIONS[type] || "回答内容に近い候補を、比較の入口として確認したい人向け。";
}

function highlightedCompanyKey(type) {
  return COMPANY_COMPARISON.find((company) => company.types.includes(type))?.key || "";
}

function renderComparisonTable(type) {
  const highlightKey = highlightedCompanyKey(type);
  return `<table class="comparison-table">
    <thead><tr><th scope="col">場面</th>${COMPANY_COMPARISON.map((company) => `<th scope="col" class="${company.key === highlightKey ? "is-highlighted" : ""}">${escapeHtml(company.label)}</th>`).join("")}</tr></thead>
    <tbody>${COMPARISON_ROWS.map((row, rowIndex) => `<tr><th scope="row">${escapeHtml(row)}</th>${COMPANY_COMPARISON.map((company) => `<td class="${company.key === highlightKey ? "is-highlighted" : ""}">${company.values[rowIndex]}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function otherFitItems(type) {
  const items = [
    { types: ["sompo_type", "nightWork"], text: "夜間・一人の事故現場が不安 → 損保ジャパン型" },
    { types: ["ms_type", "familyWatch"], text: "家族の位置確認を重視 → 三井住友海上型" },
    { types: ["aioi_type", "daily"], text: "安全運転スコアを重視 → あいおい型" },
    { types: ["tokio_type", "familyRide"], text: "家族同乗時の事故初動を重視 → 東京海上日動型" },
    { types: ["kyoei_type", "variable"], text: "車の使い方が変わりやすい → 共栄火災型" }
  ];
  return items.filter((item) => !item.types.includes(type)).slice(0, 3).map((item) => item.text);
}

async function init() {
  const needsCases = Boolean($("caseCards") || $("caseDetailBody"));
  const needsSources = Boolean(document.querySelector("#sources .source-list") || $("caseDetailBody"));
  const needsQuestions = Boolean($("question-title"));

  const [questions, scoring, results, modelCases, sourceRegistry] = await Promise.all([
    needsQuestions ? fetch("data/questions.json").then((r) => r.json()) : Promise.resolve([]),
    needsQuestions ? fetch("data/scoring.json").then((r) => r.json()) : Promise.resolve({}),
    needsQuestions ? fetch("data/results.json").then((r) => r.json()) : Promise.resolve({}),
    needsCases ? fetch("data/model-cases.json").then((r) => r.json()) : Promise.resolve([]),
    needsSources ? fetch("data/source-registry.json").then((r) => r.json()) : Promise.resolve([])
  ]);

  MODEL_CASES = modelCases;
  SOURCE_REGISTRY = sourceRegistry;
  const isCasesPage = document.body.classList.contains("page-cases");
  Object.assign(state, {
    questions: isCasesPage ? questions.filter((question) => question.id === "case_q2") : questions.filter((question) => !question.id?.startsWith("case_")),
    scoring,
    results
  });
  bindEvents();
  renderCaseDiagnosis();
  renderCases();
  renderCasePageFromUrl();
  renderSourcesPage();
  renderQuestion();
  restoreCaseListPosition();
}

function showInitialScreen() {
  const id = window.location.hash.replace("#", "") || "home";
  showScreen($(id)?.classList.contains("screen") ? id : "home", { updateHash: false });
}

function bindEvents() {
  ["startBtn", "startBtnFromCases"].forEach((id) => $(id)?.addEventListener("click", () => showScreen("question")));
  $("restartBtn")?.addEventListener("click", restart);
  $("backBtn")?.addEventListener("click", previousQuestion);
  $("nextBtn")?.addEventListener("click", nextQuestion);
  $("candidateBtn")?.addEventListener("click", () => {
    const caseId = resultTypeToCaseId(state.ranked[0]?.type);
    showScreen("caseListScreen", { scrollTop: false });
    openCaseDetail(caseId);
  });
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.nav));
  });
  $("startCaseDiagnosis")?.addEventListener("click", () => showScreen($("question-title") ? "question" : "caseDiagnosis"));
  $("showCaseList")?.addEventListener("click", () => showScreen("caseListScreen"));
  document.querySelectorAll("[data-case-home]").forEach((button) => {
    button.addEventListener("click", () => showScreen("caseEntry"));
  });
  $("showDiagnosisResult")?.addEventListener("click", () => {
    renderCaseDiagnosisResult();
    showScreen("caseDiagnosisResult");
  });
  $("diagnosisResultBody")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-result-action]")?.dataset.resultAction;
    if (!action) return;
    if (action === "restart") {
      caseDiagnosisState.q1 = "";
      caseDiagnosisState.q2 = new Set();
      renderCaseDiagnosis();
      showScreen("caseDiagnosis");
    }
    if (action === "candidate") {
      showScreen("caseListScreen", { scrollTop: false });
      openCaseDetail(event.target.closest("[data-case-id]")?.dataset.caseId);
    }
  });
  window.addEventListener("popstate", () => {
    const caseId = decodeURIComponent(window.location.hash.replace("#", ""));
    if ($("caseDetailOverlay") && MODEL_CASES.some((item) => item.id === caseId)) {
      openCaseDetail(caseId, { updateHash: false });
    } else if ($("caseDetailOverlay")?.getAttribute("aria-hidden") === "false") {
      returnToCaseList({ updateHash: false });
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("caseDetailOverlay")?.getAttribute("aria-hidden") === "false") {
      returnToCaseList();
    }
  });
}


function escapeHtml(value) {
  return String(value ?? "").replaceAll("第一比較候補", "まず見る候補").replace(/[&<>"\']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\'": "&#39;" }[char]));
}

function listItems(items) {
  return `<ul>${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCaseDiagnosis() {
  if (!$("caseQ1") || !$("caseQ2")) return;
  $("caseQ1").innerHTML = CASE_Q1.map(([key, text]) => `
    <button type="button" class="diagnosis-option ${caseDiagnosisState.q1 === key ? "selected" : ""}" role="radio" aria-checked="${caseDiagnosisState.q1 === key}" data-q1="${key}">
      <span>${escapeHtml(text)}</span>
    </button>`).join("");
  $("caseQ2").innerHTML = CASE_Q2.map(([key, text]) => `
    <button type="button" class="diagnosis-option ${caseDiagnosisState.q2.has(key) ? "selected" : ""}" aria-pressed="${caseDiagnosisState.q2.has(key)}" data-q2="${key}">
      <span>${escapeHtml(text)}</span>
    </button>`).join("");
  document.querySelectorAll("[data-q1]").forEach((button) => {
    button.addEventListener("click", () => {
      caseDiagnosisState.q1 = button.dataset.q1;
      renderCaseDiagnosis();
    });
  });
  document.querySelectorAll("[data-q2]").forEach((button) => {
    button.addEventListener("click", () => {
      if (caseDiagnosisState.q2.has(button.dataset.q2)) {
        caseDiagnosisState.q2.delete(button.dataset.q2);
      } else {
        caseDiagnosisState.q2.add(button.dataset.q2);
      }
      renderCaseDiagnosis();
    });
  });
  if ($("showDiagnosisResult")) $("showDiagnosisResult").disabled = !caseDiagnosisState.q1 || caseDiagnosisState.q2.size === 0;
}

function addCasePoints(scores, points = {}) {
  Object.entries(points).forEach(([type, value]) => {
    scores[type] = (scores[type] || 0) + value;
  });
}

function getCaseDiagnosisResult() {
  const scores = Object.fromEntries(Object.keys(CASE_DIAGNOSIS_TYPES).map((type) => [type, 0]));
  addCasePoints(scores, CASE_Q1.find(([key]) => key === caseDiagnosisState.q1)?.[2]);
  CASE_Q2.filter(([key]) => caseDiagnosisState.q2.has(key)).forEach(([, , points]) => addCasePoints(scores, points));
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const isTie = ranked.length > 1 && ranked[0][1] === ranked[1][1];
  const isUnknown = caseDiagnosisState.q2.has("unknown");
  const typeKey = isTie || isUnknown ? "variable" : ranked[0][0];
  return CASE_DIAGNOSIS_TYPES[typeKey];
}

function renderCaseDiagnosisResult() {
  const container = $("diagnosisResultBody");
  if (!container) return;
  const result = getCaseDiagnosisResult();
  container.innerHTML = `
    <article class="diagnosis-result-card" data-case-id="${escapeHtml(result.caseId)}">
      <p class="eyebrow">比較の入口</p>
      <h1 id="diagnosis-result-title">あなたは、まずこれを見る</h1>
      <section class="diagnosis-result-section">
        <h2>あなたの車はこれに近いです</h2>
        <p>${escapeHtml(result.name)}</p>
      </section>
      <section class="diagnosis-result-section">
        <h2>まず見る候補</h2>
        <p>${escapeHtml(result.candidate)}</p>
      </section>
      <section class="diagnosis-result-section">
        <h2>理由は3つだけ</h2>
        ${listItems(result.checks)}
      </section>
      <section class="diagnosis-caution" aria-label="ただし注意">
        <h2>ただし注意</h2>
        <ul>
          <li>保険料や基本補償だけで決まるものではありません</li>
          <li>条件によっては他社が合う場合があります</li>
          <li>最終判断は契約条件の確認が必要です</li>
        </ul>
      </section>
      <div class="diagnosis-result-actions">
        <button class="primary-btn" type="button" data-result-action="candidate">この候補の根拠を見る</button>
      </div>
      <button class="text-link restart-link" type="button" data-result-action="restart">選び直す</button>
    </article>`;
}

function renderCases() {
  const container = $("caseCards");
  if (!container) return;
  const groups = CATEGORY_ORDER.map((label) => [label, MODEL_CASES.filter((item) => item.category === label)]);
  container.innerHTML = groups.map(([label, cases], index) => `
    <section class="case-group case-group-${index % 2 === 0 ? "direct" : "branch"}" aria-label="${label}">
      <div class="case-group-heading">
        <h2>${label}</h2>
      </div>
      <div class="case-card-grid">
        ${cases.map((modelCase) => `
          <article class="case-card ${index % 2 === 0 ? "is-direct" : "is-branch"}${state.returnCaseId === modelCase.id ? " is-return-target" : ""}" role="button" tabindex="0" id="${modelCase.id}" data-case-id="${modelCase.id}" aria-label="${escapeHtml(modelCase.title)}">
            <div class="case-card-text">
              <h3>${escapeHtml(modelCase.title)}</h3>
              <p class="case-card-candidate">${escapeHtml(modelCase.primaryCandidate)}</p>
              <p class="case-card-point">${escapeHtml(modelCase.listSummary || modelCase.conclusion)}</p>
            </div>
            <span class="case-card-action" aria-hidden="true">›</span>
          </article>`).join("")}
      </div>
    </section>`).join("") + renderModelCaseFaq();
  document.querySelectorAll(".case-card[data-case-id]").forEach((card) => {
    card.addEventListener("click", () => openCaseDetail(card.dataset.caseId));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCaseDetail(card.dataset.caseId);
      }
    });
  });
}

function renderModelCaseFaq() {
  const faqs = [
    ["なぜN-BOXならあいおいなのですか？", "N-BOX自体が理由ではありません。高頻度運転、安全運転スコアへの関心、500km以上の走行見込み、継続時の段階制割引を重視することが理由です。"],
    ["安全運転割引はあいおいだけですか？", "いいえ。他社にも運転評価や割引があります。このケースでは段階制の評価を重視するため、あいおい型をまず見る候補にしています。"],
    ["ALSOKは損保ジャパンだけですか？", "いいえ。共栄火災にも所定条件でALSOK現場急行があります。損保ジャパン型は、通信ドラレコ、通知、運転診断、ALSOKを一体で求める人の比較候補です。"],
    ["東京海上日動の月額500円型が一番高機能ですか？", "いいえ。低負担型です。後方カメラ、家族見守り、360度撮影、現場急行を重視する場合は他社型も比較します。"],
    ["三井住友海上の360度型なら死角はありませんか？", "いいえ。車両構造による死角があり、後方車両のナンバーを記録できない場合があります。"],
    ["60代以上なら共栄火災ですか？", "いいえ。年齢だけでは判断しません。使用目的が変わりやすく、使用目的による保険料差や変更手続きを避けたい場合の比較候補です。"],
    ["保険料を比較せずに会社を決められますか？", "決められません。本サイトは、付帯サービス面で最初に比較する候補を整理するもので、最終契約判断ではありません。"]
  ];
  return `<section class="faq-panel"><h2>比較前提FAQ</h2>${faqs.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</section>`;
}

function openCaseDetail(caseId, options = {}) {
  const overlay = $("caseDetailOverlay");
  if (!$("caseDetailBody")) return;
  const exists = MODEL_CASES.some((item) => item.id === caseId);
  if (!exists) return;
  state.lastCaseScrollY = window.scrollY;
  state.selectedCaseId = caseId;
  state.returnCaseId = caseId;
  renderCaseDetailPage(caseId);
  if (!overlay) {
    if (options.updateHash !== false) {
      history.pushState({ caseId }, "", `case.html?id=${encodeURIComponent(caseId)}`);
    }
    return;
  }
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
  document.querySelectorAll(".case-card.is-return-target").forEach((card) => card.classList.remove("is-return-target"));
  document.querySelector(`.case-card[data-case-id="${CSS.escape(caseId)}"]`)?.classList.add("is-return-target");
  if (options.updateHash !== false && window.location.hash !== `#${caseId}`) {
    history.pushState({ caseId }, "", `#${caseId}`);
  }
  requestAnimationFrame(() => overlay.querySelector("[data-return-cases]")?.focus({ preventScroll: true }));
}

function returnToCaseList(options = {}) {
  const overlay = $("caseDetailOverlay");
  if (!overlay) {
    const caseId = state.returnCaseId || state.selectedCaseId;
    window.location.href = caseId ? `cases.html#${encodeURIComponent(caseId)}` : "cases.html";
    return;
  }
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
  const caseId = state.returnCaseId || state.selectedCaseId;
  if (options.updateHash !== false && window.location.hash) {
    history.pushState({}, "", window.location.pathname);
  }
  requestAnimationFrame(() => {
    const target = caseId ? document.querySelector(`.case-card[data-case-id="${CSS.escape(caseId)}"]`) : null;
    window.scrollTo({ top: state.lastCaseScrollY, behavior: "auto" });
    target?.focus({ preventScroll: true });
  });
}

function renderCasePageFromUrl() {
  if (!$("caseDetailBody")) return;
  const requestedCaseId = new URLSearchParams(window.location.search).get("id") || MODEL_CASES[0]?.id;
  const caseId = MODEL_CASES.some((item) => item.id === requestedCaseId) ? requestedCaseId : MODEL_CASES[0]?.id;
  if (!caseId) return;
  state.selectedCaseId = caseId;
  state.returnCaseId = caseId;
  renderCaseDetailPage(caseId);
}

function restoreCaseListPosition() {
  if (!$("caseCards") || !window.location.hash) return;
  const caseId = decodeURIComponent(window.location.hash.slice(1));
  requestAnimationFrame(() => {
    if ($("caseDetailOverlay") && MODEL_CASES.some((item) => item.id === caseId)) {
      openCaseDetail(caseId, { updateHash: false });
      return;
    }
    const target = caseId ? document.querySelector(`.case-card[data-case-id="${CSS.escape(caseId)}"]`) : null;
    target?.scrollIntoView({ block: "center", behavior: "auto" });
    target?.focus({ preventScroll: true });
  });
}

function moveCase(offset) {
  const currentIndex = MODEL_CASES.findIndex((item) => item.id === state.selectedCaseId);
  const next = MODEL_CASES[currentIndex + offset];
  if (!next) return;
  openCaseDetail(next.id);
}

function renderCaseDetailPage(caseId) {
  const container = $("caseDetailBody");
  if (!container) return;
  container.innerHTML = renderCaseDetail(caseId);
  bindCaseDetailControls();
}

function bindCaseDetailControls() {
  document.querySelectorAll("[data-return-cases]").forEach((button) => {
    button.addEventListener("click", returnToCaseList);
  });
  document.querySelectorAll("[data-case-step]").forEach((button) => {
    button.addEventListener("click", () => moveCase(Number(button.dataset.caseStep)));
  });
  document.querySelectorAll("[data-close-case-detail]").forEach((button) => {
    button.addEventListener("click", () => returnToCaseList());
  });
}


function renderCaseDetail(caseId) {
  const modelCase = MODEL_CASES.find((item) => item.id === caseId) || MODEL_CASES[0];
  const sources = getSourcesByIds(modelCase.sourceIds || []);
  return `
    <article class="case-detail-panel" data-case-id="${escapeHtml(modelCase.id)}">
      ${renderCaseDetailNavigation(modelCase.id, "top")}
      <span class="badge">${categoryLabel(modelCase.category)}</span>
      <p class="inline-detail-kicker">この場面の詳しい理由</p>
      <h1 id="case-detail-title">${escapeHtml(modelCase.title)}</h1>
      <section class="conclusion-box" aria-label="この場面の結論">
        <p class="eyebrow">まず見る候補</p>
        <h2>${escapeHtml(modelCase.primaryCandidate)}</h2>
        <p class="conclusion-text">${escapeHtml(modelCase.conclusion)}</p>
        <div class="reason-line"><strong>選定理由：</strong><span>${escapeHtml(modelCase.selectionReason)}</span></div>
        <div class="reason-line muted"><strong>ただし：</strong><span>他社が勝つ条件もあります。事故現場の不安、家族見守り、低負担の事故自動通報、使用目的の変動などを重視する場合は下の比較を確認してください。</span></div>
      </section>
      <section><h2>この場面に近い人</h2>${listItems(modelCase.representativeExamples)}</section>
      <section><h2>この場面で見るポイント</h2>${listItems(modelCase.decisionCriteria)}</section>
      <div class="accordion-stack">
        <details><summary>他社と比べる</summary>${renderComparisonCards(modelCase.comparisons)}</details>
        <details><summary>細かい条件・対象外条件</summary>${listItems(modelCase.smallConditions)}</details>
        <details open><summary>根拠を見る</summary>${renderEvidenceClaims(modelCase.evidenceClaims)}</details>
        <details><summary>このページでは判断できないこと</summary>${listItems(modelCase.cannotDecideHere)}</details>
        <details><summary>根拠資料</summary>${renderSources(sources)}<p class="source-note">情報確認日：2026年6月25日。商品資料によって対象となる契約始期日が異なります。損保ジャパンは2026年1月始期資料と2026年7月始期資料を混同しないで表示しています。</p></details>
      </div>
      <p class="detail-disclaimer">${escapeHtml(modelCase.finalNotice)} ${escapeHtml(modelCase.importantNotice)}</p>
      ${renderCaseDetailNavigation(modelCase.id, "bottom")}
    </article>`;
}

function renderCaseDetailNavigation(caseId, position) {
  const currentIndex = MODEL_CASES.findIndex((item) => item.id === caseId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < MODEL_CASES.length - 1;
  return `<nav class="case-detail-nav case-detail-nav-${position}" aria-label="場面詳細の移動">
    <button class="secondary-btn quiet" type="button" data-return-cases>← 一覧に戻る</button>
    ${position === "bottom" ? `<div class="case-step-actions">
      <button class="secondary-btn quiet" type="button" data-case-step="-1" ${hasPrevious ? "" : "disabled"}>前の場面</button>
      <button class="secondary-btn quiet" type="button" data-case-step="1" ${hasNext ? "" : "disabled"}>次の場面</button>
    </div>` : ""}
  </nav>`;
}


function renderComparisonCards(comparisons) {
  return `<div class="comparison-cards">${(comparisons || []).map((item) => `<article class="company-compare-card">
    <h3>${escapeHtml(item.company)}</h3>
    <p><strong>強み</strong>${escapeHtml(item.strength)}</p>
    <p><strong>今回主役にしない理由</strong>${escapeHtml(item.whyNotPrimaryHere)}</p>
    <p><strong>この会社が主役になる条件</strong>${escapeHtml(item.whenThisCompanyWins)}</p>
  </article>`).join("")}</div>`;
}


function getSourcesByIds(sourceIds) {
  return (sourceIds || []).map((id) => SOURCE_REGISTRY.find((source) => source.id === id)).filter(Boolean);
}

function renderEvidenceClaims(evidenceClaims) {
  if (!Array.isArray(evidenceClaims) || !evidenceClaims.length) return '<p>この場面に紐づく根拠付き注意点は登録されていません。</p>';
  return `<div class="evidence-claims">${evidenceClaims.map((claim) => {
    const sources = getSourcesByIds(claim.sourceIds || []);
    return `<article class="evidence-card evidence-${escapeHtml(claim.riskLevel)}">
      <div class="evidence-card-head">
        <span class="evidence-group">${escapeHtml(claim.displayGroup)}</span>
        <span class="risk-label">${escapeHtml(claim.riskLevel)}</span>
      </div>
      <h3>${escapeHtml(claim.claim)}</h3>
      <p class="evidence-reason"><strong>重要理由</strong>${escapeHtml(claim.whyItMatters)}</p>
      <div class="evidence-source-list" aria-label="この注意点の根拠資料">
        ${sources.map((source) => `<div class="evidence-source-item">
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
          <dl>
            <div><dt>会社名</dt><dd>${escapeHtml(source.company)}</dd></div>
            <div><dt>確認日</dt><dd>${escapeHtml(source.verifiedAt)}</dd></div>
            <div><dt>適用始期</dt><dd>${escapeHtml(source.applicableFrom)}</dd></div>
          </dl>
        </div>`).join("")}
      </div>
    </article>`;
  }).join("")}</div>`;
}

function renderSources(sources) {
  if (!sources.length) return '<p>この場面に直接関係する公式資料は登録されていません。</p>';
  return `<ul class="source-list detail-sources">${sources.map((source) => `<li>
    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
    <p><strong>${escapeHtml(source.company)}</strong>／対象始期日：${escapeHtml(source.applicableFrom)}／確認日：${escapeHtml(source.verifiedAt)}</p>
    <p>${escapeHtml(source.note)}</p>
  </li>`).join("")}</ul>`;
}

function renderSourcesPage() {
  const list = document.querySelector("#sources .source-list");
  if (!list || !SOURCE_REGISTRY.length) return;
  list.innerHTML = SOURCE_REGISTRY.map((source) => `<li>
    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
    <p><strong>${escapeHtml(source.company)}</strong>／対象始期日：${escapeHtml(source.applicableFrom)}／情報確認日：${escapeHtml(source.verifiedAt)}</p>
    <p>${escapeHtml(source.note)}</p>
  </li>`).join("");
}

function showScreen(id, options = {}) {
  const target = $(id);
  if (!target?.classList.contains("screen")) return;

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === id);
  });

  if (options.updateHash !== false && window.location.hash !== `#${id}`) {
    history.pushState({ screen: id }, "", `#${id}`);
  }

  if (options.scrollTop !== false) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function renderQuestion() {
  if (!$("question-title") || !state.questions.length) return;
  const question = state.questions[state.index];
  const total = state.questions.length;
  $("questionCount").textContent = `質問 ${state.index + 1} / ${total}`;
  const hasAnswer = Array.isArray(state.answers[question.id]) ? state.answers[question.id].length > 0 : Boolean(state.answers[question.id]);
  $("answeredCount").textContent = hasAnswer ? "回答済み" : "未回答";
  $("progressBar").style.width = `${((state.index + 1) / total) * 100}%`;
  $("questionCategory").textContent = question.multiple ? "複数選択・証券情報は不要です" : "単一選択・証券情報は不要です";
  $("question-title").textContent = question.text;
  const selectedValues = Array.isArray(state.answers[question.id]) ? state.answers[question.id] : [state.answers[question.id]];
  $("choices").innerHTML = question.choices.map((choice) => `
    <button type="button" class="choice ${selectedValues.includes(choice.key) ? "selected" : ""}" data-choice="${choice.key}" aria-pressed="${question.multiple ? selectedValues.includes(choice.key) : "false"}">
      <span>${choice.text}</span>
    </button>`).join("");
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => selectChoice(question.id, button.dataset.choice));
  });
  $("backBtn").disabled = state.index === 0;
  $("nextBtn").disabled = !hasAnswer;
  $("nextBtn").textContent = state.index === total - 1 ? "結果を見る" : "次へ";
}

function selectChoice(questionId, key) {
  const question = state.questions.find((item) => item.id === questionId);
  if (question?.multiple) {
    const selected = new Set(Array.isArray(state.answers[questionId]) ? state.answers[questionId] : []);
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    state.answers[questionId] = [...selected];
  } else {
    state.answers[questionId] = key;
  }
  renderQuestion();
}

function previousQuestion() {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
  }
}

function nextQuestion() {
  if (!state.answers[state.questions[state.index].id]) return;
  if (state.index < state.questions.length - 1) {
    state.index += 1;
    renderQuestion();
    return;
  }
  renderResults();
  showScreen("summary");
}

function calculateScores() {
  if (document.body.classList.contains("page-cases")) return calculateCaseQuestionScores();
  const scores = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]));
  const maxScores = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]));
  state.questions.forEach((question) => {
    const key = state.answers[question.id];
    const points = state.scoring[question.id]?.[key] || {};
    Object.entries(points).forEach(([type, value]) => { scores[type] += value; });

    const choices = state.scoring[question.id] || {};
    TYPE_ORDER.forEach((type) => {
      const questionMax = Math.max(0, ...Object.values(choices).map((choicePoints) => choicePoints[type] || 0));
      maxScores[type] += questionMax;
    });
  });
  return TYPE_ORDER.map((type) => {
    const raw = maxScores[type] > 0 ? scores[type] / maxScores[type] : 0;
    const percent = Math.min(95, Math.round(raw * 100 / 5) * 5);
    return { type, score: scores[type], maxScore: maxScores[type], percent, ...state.results[type] };
  }).sort((a, b) => b.percent - a.percent || b.score - a.score || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
}

function calculateCaseQuestionScores() {
  const scores = Object.fromEntries(CASE_TYPE_ORDER.map((type) => [type, 0]));
  state.questions.forEach((question) => {
    const answer = state.answers[question.id];
    const keys = Array.isArray(answer) ? answer : [answer].filter(Boolean);
    keys.forEach((key) => addCasePoints(scores, state.scoring[question.id]?.[key]));
  });
  const ranked = CASE_TYPE_ORDER.map((type) => ({ type, score: scores[type], percent: 0, ...CASE_DIAGNOSIS_TYPES[type] }))
    .sort((a, b) => b.score - a.score || CASE_TYPE_ORDER.indexOf(a.type) - CASE_TYPE_ORDER.indexOf(b.type));
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;
  const isUnknown = Array.isArray(state.answers.case_q2) && state.answers.case_q2.includes("unknown");
  const ordered = isTie || isUnknown
    ? [ranked.find((item) => item.type === "variable"), ...ranked.filter((item) => item.type !== "variable")]
    : ranked;
  return ordered.map((item, index) => ({ ...item, percent: index === 0 ? 95 : Math.max(20, 75 - index * 15) }));
}

function labelFor(percent) {
  if (percent >= 80) return "第一候補";
  if (percent >= 60) return "比較候補";
  if (percent >= 40) return "条件次第";
  if (percent >= 20) return "優先度低め";
  return "該当薄め";
}

function resultTypeToCaseId(type) {
  if (CASE_DIAGNOSIS_TYPES[type]) return CASE_DIAGNOSIS_TYPES[type].caseId;
  return {
    aioi_type: "case1",
    tokio_type: "case2",
    sompo_type: "case3",
    ms_type: "case4",
    kyoei_type: "case6",
    direct_type: "case7"
  }[type] || MODEL_CASES[0]?.id;
}

function checksForResult(type) {
  if (CASE_DIAGNOSIS_TYPES[type]) return CASE_DIAGNOSIS_TYPES[type].checks;
  return {
    aioi_type: ["安全運転スコア", "走行データの取得条件", "継続時の割引"],
    tokio_type: ["事故自動通報", "事故時の通話", "家族同乗時の初動"],
    sompo_type: ["通信ドラレコ", "事故通知", "現場急行"],
    ms_type: ["位置確認", "運転状況共有", "見守り機能"],
    kyoei_type: ["分かりやすさ", "電話・担当者への相談", "使用目的の変化"],
    direct_type: ["保険料", "補償内容", "車両条件"]
  }[type] || ["補償内容", "保険料", "契約条件"];
}

function renderResults() {
  state.ranked = calculateScores();
  const top = state.ranked[0];
  if (!top) return;
  const candidateName = top.candidate || top.company;
  if ($("candidateResult")) $("candidateResult").innerHTML = `<p>${escapeHtml(candidateName)}</p>`;
  if ($("conclusionCandidate")) $("conclusionCandidate").textContent = candidateName;
  if ($("conclusionDescription")) $("conclusionDescription").textContent = resultDescription(top.type);
  $("topResult").innerHTML = `<h2>${escapeHtml(top.name)}</h2>`;
  $("scoreList").innerHTML = `<div class="reason-card-list">${checksForResult(top.type).map((item) => `<article class="reason-row-card"><span aria-hidden="true">✓</span><p>${escapeHtml(item)}</p></article>`).join("")}</div>`;
  if ($("comparisonTable")) $("comparisonTable").innerHTML = renderComparisonTable(top.type);
  if ($("otherFitList")) $("otherFitList").innerHTML = `<ul>${otherFitItems(top.type).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  $("compareReason").textContent = CASE_DIAGNOSIS_TYPES[top.type]
    ? "この1問診断は、使い方や不安に近い比較の入口を示すものです。保険の最終判断ではありません。"
    : top.type === "direct_type"
    ? "価格重視タイプが近い結果です。この結果だけで判断せず、補償内容・車両条件・契約条件を確認してください。"
    : `5社の中では、まず${top.company}を見る理由があります。ただし、契約判断を断定するものではありません。`;
  renderDetail();
}

function renderDetail() {
  if (document.body.classList.contains("page-cases")) {
    if ($("detailBody")) $("detailBody").innerHTML = "";
    return;
  }
  const top = state.ranked[0];
  const lowItems = state.ranked.slice(1);
  const highReason = top.type === "direct_type"
    ? "保険料や価格への関心が強い回答が多いため、このタイプの一致度が高くなっています。"
    : top.highReason;
  $("detailBody").innerHTML = `
    <article><h2>なぜ一致度が高いのか</h2><p>${highReason}</p></article>
    <article><h2>まず見る理由</h2><p>${top.type === "direct_type" ? "保険料への関心が強い結果です。実際の契約判断では、価格だけでなく補償内容・車両条件・契約条件も合わせて確認してください。" : `5社の中では、まず${top.company}を見る理由があります。回答内容と事故時の不安軸が近いためです。`}</p></article>
    <article><h2>なぜ他のタイプが低いのか</h2><p>${lowItems.map((item) => `${item.company}は${item.lowReason}`).join(" ")}</p></article>
    <article><h2>低いタイプの見方</h2><p>一致度が低いタイプは、その会社が悪いのではなく、今回の回答で見えた不安とはズレやすいという意味です。実際の契約判断では補償内容・保険料・車両条件などを確認してください。</p></article>`;
}

function restart() {
  state.index = 0;
  state.answers = {};
  state.ranked = [];
  renderQuestion();
  showScreen(document.body.classList.contains("page-cases") ? "caseEntry" : "cases");
}

init().catch(() => {
  document.body.insertAdjacentHTML("afterbegin", '<p class="callout">診断データの読み込みに失敗しました。ファイル構成を確認してください。</p>');
});
