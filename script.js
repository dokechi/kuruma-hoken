let MODEL_CASES = [];
let SOURCE_REGISTRY = [];

const TYPE_ORDER = ["aioi_type", "tokio_type", "sompo_type", "ms_type", "kyoei_type", "direct_type"];
const state = { questions: [], scoring: {}, results: {}, index: 0, answers: {}, ranked: [], selectedCaseId: null, returnCaseId: null, lastCaseScrollY: 0 };
const CATEGORY_ORDER = ["自分が毎日使う車", "家族を乗せる車", "家族が運転する車", "仕事・夜間で使う車"];
const categoryLabel = (category) => category;
const GLOBAL_DISCLAIMER = "本ページは、当社取扱5社について、特定の付帯サービスを重視する場合の比較の入口を示すものです。保険料、基本補償、保険金支払条件、特約、引受可否、代理店対応等を含む総合評価ではありません。掲載車種・年代は代表例です。実際の商品選択時には、補償内容、保険料、車両条件、契約始期、引受条件等の確認が必要です。";
const $ = (id) => document.getElementById(id);

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
  Object.assign(state, { questions, scoring, results });
  bindEvents();
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
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.nav));
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
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function listItems(items) {
  return `<ul>${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCases() {
  const container = $("caseCards");
  if (!container) return;
  const groups = CATEGORY_ORDER.map((label) => [label, MODEL_CASES.filter((item) => item.category === label)]);
  container.innerHTML = groups.map(([label, cases], index) => `
    <section class="case-group case-group-${index % 2 === 0 ? "direct" : "branch"}" aria-label="${label}">
      <div class="case-group-heading">
        <span class="badge ${index % 2 === 0 ? "badge-direct" : "badge-branch"}">${label}</span>
        <h2>${label}</h2>
      </div>
      <div class="case-card-grid">
        ${cases.map((modelCase) => `
          <article class="case-card ${index % 2 === 0 ? "is-direct" : "is-branch"}${state.returnCaseId === modelCase.id ? " is-return-target" : ""}" role="button" tabindex="0" id="${modelCase.id}" data-case-id="${modelCase.id}" aria-label="${escapeHtml(modelCase.title)}の詳細を見る">
            <div class="case-card-text">
              <h3>${escapeHtml(modelCase.title)}</h3>
              <p class="case-card-candidate">${escapeHtml(modelCase.primaryCandidate)}</p>
              <p class="case-card-point">${escapeHtml(modelCase.listSummary || modelCase.conclusion)}</p>
            </div>
            <span class="case-card-action" aria-hidden="true">詳細を見る</span>
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
    ["安全運転割引はあいおいだけですか？", "いいえ。他社にも運転評価や割引があります。このケースでは段階制の評価を重視するため、あいおい型を第一比較候補にしています。"],
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
  const sources = (modelCase.sourceIds || []).map((id) => SOURCE_REGISTRY.find((source) => source.id === id)).filter(Boolean);
  return `
    <article class="case-detail-panel" data-case-id="${escapeHtml(modelCase.id)}">
      ${renderCaseDetailNavigation(modelCase.id, "top")}
      <span class="badge">${categoryLabel(modelCase.category)}</span>
      <p class="inline-detail-kicker">この場面の詳しい理由</p>
      <h1 id="case-detail-title">${escapeHtml(modelCase.title)}</h1>
      <section class="conclusion-box" aria-label="この場面の結論">
        <p class="eyebrow">この場面の第一比較候補</p>
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
    <button class="secondary-btn quiet" type="button" data-return-cases>← 場面一覧の同じ位置に戻る</button>
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


function renderSources(sources) {
  if (!sources.length) return '<p>この場面に直接関係する公式資料は登録されていません。</p>';
  return `<ul class="source-list detail-sources">${sources.map((source) => `<li>
    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
    <p><strong>${escapeHtml(source.company)}</strong>／対象始期日：${escapeHtml(source.applicableFrom)}／確認日：2026年6月25日</p>
    <p>${escapeHtml(source.note)}</p>
  </li>`).join("")}</ul>`;
}

function renderSourcesPage() {
  const list = document.querySelector("#sources .source-list");
  if (!list || !SOURCE_REGISTRY.length) return;
  list.innerHTML = SOURCE_REGISTRY.map((source) => `<li>
    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
    <p><strong>${escapeHtml(source.company)}</strong>／対象始期日：${escapeHtml(source.applicableFrom)}／情報確認日：2026年6月25日</p>
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
  $("answeredCount").textContent = state.answers[question.id] ? "回答済み" : "未回答";
  $("progressBar").style.width = `${((state.index + 1) / total) * 100}%`;
  $("questionCategory").textContent = "選択式・証券情報は不要です";
  $("question-title").textContent = question.text;
  $("choices").innerHTML = question.choices.map((choice) => `
    <button type="button" class="choice ${state.answers[question.id] === choice.key ? "selected" : ""}" data-choice="${choice.key}">
      <span class="choice-key">${choice.key}</span><span>${choice.text}</span>
    </button>`).join("");
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => selectChoice(question.id, button.dataset.choice));
  });
  $("backBtn").disabled = state.index === 0;
  $("nextBtn").disabled = !state.answers[question.id];
  $("nextBtn").textContent = state.index === total - 1 ? "結果を見る" : "次へ";
}

function selectChoice(questionId, key) {
  state.answers[questionId] = key;
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

function labelFor(percent) {
  if (percent >= 80) return "第一候補";
  if (percent >= 60) return "比較候補";
  if (percent >= 40) return "条件次第";
  if (percent >= 20) return "優先度低め";
  return "該当薄め";
}

function renderResults() {
  state.ranked = calculateScores();
  const top = state.ranked[0];
  $("topResult").innerHTML = `<span class="badge">${top.company}</span><h2>${top.name}</h2><p>${top.summary}</p>`;
  $("scoreList").innerHTML = state.ranked.map((item, index) => `
    <article class="score-row">
      <div class="score-head"><span>${index + 1}. ${item.company}</span><span>タイプ一致度 ${item.percent}%・${labelFor(item.percent)}</span></div>
      <div class="meter" aria-hidden="true"><span style="width:${item.percent}%"></span></div>
      <p>${item.name}</p>
    </article>`).join("");
  $("compareReason").textContent = top.type === "direct_type"
    ? "価格重視タイプが最も近い結果です。この診断結果だけで加入を断定せず、補償内容・車両条件・契約条件を確認してください。"
    : `5社の中では、まず${top.company}を比較する理由があります。ただし、加入を断定するものではありません。`;
  renderDetail();
}

function renderDetail() {
  const top = state.ranked[0];
  const lowItems = state.ranked.slice(1);
  const highReason = top.type === "direct_type"
    ? "保険料や価格への関心が強い回答が多いため、このタイプの一致度が高くなっています。"
    : top.highReason;
  $("detailBody").innerHTML = `
    <article><h2>なぜ一致度が高いのか</h2><p>${highReason}</p></article>
    <article><h2>まず比較する理由</h2><p>${top.type === "direct_type" ? "保険料への関心が強い結果です。実際の契約判断では、価格だけでなく補償内容・車両条件・契約条件も合わせて確認してください。" : `5社の中では、まず${top.company}を比較する理由があります。回答内容と事故時の不安軸が近いためです。`}</p></article>
    <article><h2>なぜ他のタイプが低いのか</h2><p>${lowItems.map((item) => `${item.company}は${item.lowReason}`).join(" ")}</p></article>
    <article><h2>低いタイプの見方</h2><p>一致度が低いタイプは、その会社が悪いのではなく、今回の回答で見えた不安とはズレやすいという意味です。実際の契約判断では補償内容・保険料・車両条件などを確認してください。</p></article>`;
}

function restart() {
  state.index = 0;
  state.answers = {};
  state.ranked = [];
  renderQuestion();
  showScreen("cases");
}

init().catch(() => {
  document.body.insertAdjacentHTML("afterbegin", '<p class="callout">診断データの読み込みに失敗しました。ファイル構成を確認してください。</p>');
});
