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
  renderQuestion();
}

function bindEvents() {
  $("startBtn").addEventListener("click", () => showScreen("question"));
  $("restartBtn").addEventListener("click", restart);
  $("backBtn").addEventListener("click", previousQuestion);
  $("nextBtn").addEventListener("click", nextQuestion);
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.nav));
  });
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
  let maxPossible = 0;
  state.questions.forEach((question) => {
    const key = state.answers[question.id];
    const points = state.scoring[question.id]?.[key] || {};
    maxPossible += 4;
    Object.entries(points).forEach(([type, value]) => { scores[type] += value; });
  });
  return TYPE_ORDER.map((type) => {
    const raw = scores[type] / maxPossible;
    const percent = Math.min(95, Math.round(raw * 100 / 5) * 5);
    return { type, score: scores[type], percent, ...state.results[type] };
  }).sort((a, b) => b.score - a.score || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
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
  const lowItems = state.ranked.slice(3);
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
  showScreen("home");
}

init().catch(() => {
  document.body.insertAdjacentHTML("afterbegin", '<p class="callout">診断データの読み込みに失敗しました。ファイル構成を確認してください。</p>');
});
