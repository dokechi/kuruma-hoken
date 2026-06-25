const MODEL_CASES = [
  {
    id: "nbox_commute_40s",
    title: "N-BOXで毎日通勤している40代",
    type: "あいおいニッセイ同和損保型",
    axis: "安全運転がどう評価されるか",
    close: "毎日の通勤で同じ道を走ることが多く、運転の丁寧さや急操作の少なさを保険選びの軸にしたい人。",
    overlooked: "保険料だけを見ると、日々の安全運転や運転傾向がどう扱われるかを見落としやすいです。",
    reason: "安全運転がどう評価されるかを確認したい使い方なので、まず比較する理由があります。",
    mismatch: "事故時の連絡体制や家族同乗時の不安を最優先にすると、見るべき軸が少しズレやすいです。"
  },
  {
    id: "sienta_freed_family",
    title: "シエンタ・フリードで子どもを乗せる人",
    type: "東京海上日動型",
    axis: "事故時の初動、連絡、家族同乗時の不安",
    close: "送迎や買い物で子どもを乗せる機会があり、事故直後に何をすればよいかを重視したい人。",
    overlooked: "補償額や保険料だけで比べると、家族が同乗しているときの初動対応や連絡の安心感を見落としやすいです。",
    reason: "事故時の初動、連絡、家族同乗時の不安を整理したい使い方なので、まず比較する理由があります。",
    mismatch: "一人で夜道を走る不安や、見守り機能を最優先にすると、見るべき軸がズレやすいです。"
  },
  {
    id: "night_shift_solo",
    title: "夜勤明け・現場帰りに一人で走る人",
    type: "損保ジャパン型",
    axis: "夜道や郊外で事故現場に一人になる不安",
    close: "夜勤明け、早朝、現場帰りなど、人通りが少ない時間帯や場所を一人で走ることがある人。",
    overlooked: "日中の街中での事故を前提に考えると、夜道や郊外で事故現場に一人になる不安を見落としやすいです。",
    reason: "事故現場で一人になる不安を重視する使い方なので、まず比較する理由があります。",
    mismatch: "家族同乗時の連絡や安全運転評価を最優先にすると、見るべき軸がズレやすいです。"
  },
  {
    id: "new_driver_child",
    title: "子どもが初めて車に乗る家庭",
    type: "三井住友海上型",
    axis: "親が状況を把握できるか、見守り",
    close: "免許を取ったばかりの子どもが運転し、親として運転状況や事故時の状況把握を気にしている家庭。",
    overlooked: "年齢条件や保険料だけに目が向くと、親が状況を把握できるか、見守れるかを見落としやすいです。",
    reason: "初めて運転する家族の見守りを重視する使い方なので、まず比較する理由があります。",
    mismatch: "本人の安全運転評価や高齢者向けの分かりやすさを最優先にすると、見るべき軸がズレやすいです。"
  },
  {
    id: "move_wagonr_senior",
    title: "ムーヴ・ワゴンRで買い物・病院に使う60代以上",
    type: "共栄火災型",
    axis: "分かりやすさ、使いやすさ",
    close: "近所の買い物、通院、家族の用事などで軽自動車を使い、説明の分かりやすさを重視したい人。",
    overlooked: "安さや補償の多さだけで比べると、困ったときに理解しやすいか、使いやすいかを見落としやすいです。",
    reason: "分かりやすさ、使いやすさを重視する使い方なので、まず比較する理由があります。",
    mismatch: "テレマティクスによる安全運転評価や若い家族の見守りを最優先にすると、見るべき軸がズレやすいです。"
  }
];

const TYPE_ORDER = ["aioi_type", "tokio_type", "sompo_type", "ms_type", "kyoei_type", "direct_type"];
const state = { questions: [], scoring: {}, results: {}, index: 0, answers: {}, ranked: [] };
const $ = (id) => document.getElementById(id);

async function init() {
  const [questions, scoring, results] = await Promise.all([
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/scoring.json").then((r) => r.json()),
    fetch("data/results.json").then((r) => r.json())
  ]);
  Object.assign(state, { questions, scoring, results });
  bindEvents();
  renderCases();
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


function renderCases() {
  const container = $("caseCards");
  if (!container) return;
  container.innerHTML = MODEL_CASES.map((modelCase) => `
    <button type="button" class="case-card" data-case-id="${modelCase.id}">
      <span class="badge">${modelCase.type}</span>
      <h2>${modelCase.title}</h2>
      <p class="axis"><strong>見るべき軸：</strong>${modelCase.axis}</p>
    </button>`).join("");
  document.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => renderCaseDetail(button.dataset.caseId));
  });
}

function renderCaseDetail(caseId) {
  const modelCase = MODEL_CASES.find((item) => item.id === caseId) || MODEL_CASES[0];
  $("caseDetailBody").innerHTML = `
    <article class="case-detail-panel">
      <span class="badge">${modelCase.type}</span>
      <h1 id="case-detail-title">${modelCase.title}</h1>
      <p>保険会社の優劣ではなく、車の使い方との相性です。このタイプに近い人は、ここを見落としやすいです。</p>
      <div class="case-detail-grid">
        <article><h2>このケースに近い人</h2><p>${modelCase.close}</p></article>
        <article><h2>見落としやすいポイント</h2><p>${modelCase.overlooked}</p></article>
        <article><h2>まず比較する理由があるタイプ</h2><p>${modelCase.type}は、${modelCase.reason}</p></article>
        <article><h2>他タイプだとズレやすい点</h2><p>${modelCase.mismatch}</p></article>
        <article><h2>注意書き</h2><p>このサイトは、特定の保険商品の加入をすすめるものではありません。実際の契約判断には、補償内容・保険料・車両条件などの確認が必要です。</p></article>
      </div>
    </article>`;
  showScreen("caseDetail");
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
