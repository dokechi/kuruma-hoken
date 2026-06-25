let MODEL_CASES = [];
let SOURCE_REGISTRY = [];

const TYPE_ORDER = ["aioi_type", "tokio_type", "sompo_type", "ms_type", "kyoei_type", "direct_type"];
const state = { questions: [], scoring: {}, results: {}, index: 0, answers: {}, ranked: [] };
const categoryLabel = (category) => category === "direct" ? "会社直結型" : "分岐型";
const GLOBAL_DISCLAIMER = "本ページは、当社取扱5社について、特定の付帯サービスを重視する場合の比較の入口を示すものです。保険料、基本補償、保険金支払条件、特約、引受可否、代理店対応等を含む総合評価ではありません。掲載車種・年代は代表例です。実際の商品選択時には、補償内容、保険料、車両条件、契約始期、引受条件等の確認が必要です。";
const $ = (id) => document.getElementById(id);

async function init() {
  const [questions, scoring, results, modelCases, sourceRegistry] = await Promise.all([
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/scoring.json").then((r) => r.json()),
    fetch("data/results.json").then((r) => r.json()),
    fetch("data/model-cases.json").then((r) => r.json()),
    fetch("data/source-registry.json").then((r) => r.json())
  ]);
  MODEL_CASES = modelCases;
  SOURCE_REGISTRY = sourceRegistry;
  Object.assign(state, { questions, scoring, results });
  bindEvents();
  renderCases();
  renderSourcesPage();
  renderQuestion();
}

function bindEvents() {
  ["startBtn", "startBtnFromCases", "startBtnFromDetail"].forEach((id) => $(id)?.addEventListener("click", () => showScreen("question")));
  $("restartBtn").addEventListener("click", restart);
  $("backBtn").addEventListener("click", previousQuestion);
  $("nextBtn").addEventListener("click", nextQuestion);
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.nav));
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
  const groups = [
    ["会社直結型", MODEL_CASES.filter((item) => item.category === "direct")],
    ["分岐型", MODEL_CASES.filter((item) => item.category === "branch")]
  ];
  container.innerHTML = groups.map(([label, cases]) => `
    <section class="case-group" aria-label="${label}">
      <h2>${label}</h2>
      <div class="case-card-grid">
        ${cases.map((modelCase) => `
          <article class="case-card">
            <span class="badge">${categoryLabel(modelCase.category)}</span>
            <h3>${escapeHtml(modelCase.title)}</h3>
            <p><strong>代表車種・場面：</strong>${escapeHtml(modelCase.shortDescription)}</p>
            <p class="axis"><strong>このケースで見る軸：</strong>${escapeHtml(modelCase.decisionCriteria?.[0] || "付帯サービスの重視点")}</p>
            <button type="button" class="secondary-btn" data-case-id="${modelCase.id}">詳細を見る</button>
          </article>`).join("")}
      </div>
    </section>`).join("") + renderModelCaseFaq();
  document.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => renderCaseDetail(button.dataset.caseId));
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

function renderCaseDetail(caseId) {
  const modelCase = MODEL_CASES.find((item) => item.id === caseId) || MODEL_CASES[0];
  const sources = (modelCase.sourceIds || []).map((id) => SOURCE_REGISTRY.find((source) => source.id === id)).filter(Boolean);
  $("caseDetailBody").innerHTML = `
    <article class="case-detail-panel">
      <span class="badge">${categoryLabel(modelCase.category)}</span>
      <h1 id="case-detail-title">${escapeHtml(modelCase.title)}</h1>
      <p class="callout">当社取扱5社の中で、特定の付帯サービスを重視した場合の第一比較候補を整理します。${escapeHtml(modelCase.importantNotice)}</p>
      <section><h2>1. このケースに近い人</h2>${listItems(modelCase.representativeExamples)}</section>
      <section><h2>2. 会社選定に必要な条件</h2>${listItems(modelCase.decisionCriteria)}</section>
      <section><h2>3. 第一比較候補、または分岐</h2><p><strong>${escapeHtml(modelCase.primaryCandidate)}</strong></p></section>
      <section><h2>4. 第一候補にした理由</h2><p>${escapeHtml(modelCase.selectionReason)}</p></section>
      <section><h2>5. 他社を今回の主役にしなかった理由</h2>${renderComparisonTable(modelCase.comparisons, "why")}</section>
      <section><h2>6. 他社が主役になる条件</h2>${renderComparisonTable(modelCase.comparisons, "win")}</section>
      <section><h2>7. 細かい条件・対象外条件</h2>${listItems(modelCase.smallConditions)}</section>
      <section><h2>8. ミスマッチが起きる点</h2><p>${escapeHtml(modelCase.mismatchRisk)}</p></section>
      <section><h2>9. このページでは判断できないこと</h2>${listItems(modelCase.cannotDecideHere)}</section>
      <section><h2>10. 結論</h2><p>${escapeHtml(modelCase.conclusion)}</p><p class="callout">${escapeHtml(modelCase.finalNotice)}</p></section>
      <section><h2>11. 根拠資料</h2>${renderSources(sources)}</section>
      <section><h2>12. 情報確認日</h2><p>情報確認日：2026年6月25日。商品資料によって対象となる契約始期日が異なります。損保ジャパンは2026年1月始期資料と2026年7月始期資料を混同しないで表示しています。</p></section>
    </article>`;
  showScreen("caseDetail");
}

function renderComparisonTable(comparisons, mode) {
  const head = mode === "why" ? "今回主役にしない理由" : "主役になる条件";
  return `<div class="comparison-table" role="table">
    <div class="comparison-row comparison-head" role="row"><div>会社</div><div>強み</div><div>${head}</div></div>
    ${(comparisons || []).map((item) => `<div class="comparison-row" role="row">
      <div data-label="会社">${escapeHtml(item.company)}</div>
      <div data-label="強み">${escapeHtml(item.strength)}</div>
      <div data-label="${head}">${escapeHtml(mode === "why" ? item.whyNotPrimaryHere : item.whenThisCompanyWins)}</div>
    </div>`).join("")}
  </div>`;
}

function renderSources(sources) {
  if (!sources.length) return '<p>このケースに直接関係する公式資料は登録されていません。</p>';
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

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuestion() {
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
    ? "価格重視タイプが最も近い結果です。代理店型5社へ無理に進む必要はなく、ダイレクト型や一括見積りも選択肢です。"
    : `5社の中では、まず${top.company}を比較する理由があります。ただし、加入を断定するものではありません。`;
  renderDetail();
}

function renderDetail() {
  const top = state.ranked[0];
  const lowItems = state.ranked.slice(1);
  $("detailBody").innerHTML = `
    <article><h2>なぜ一致度が高いのか</h2><p>${top.highReason}</p></article>
    <article><h2>まず比較する理由</h2><p>${top.type === "direct_type" ? "保険料だけを下げたい意向が強いため、ダイレクト型や一括見積りも含めて価格軸を確認する理由があります。" : `5社の中では、まず${top.company}を比較する理由があります。回答内容と事故時の不安軸が近いためです。`}</p></article>
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
