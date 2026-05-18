import { useEffect, useMemo, useState } from "react";

const logStorageKey = "hasshin-labo.logs.v2";
const seriesStorageKey = "hasshin-labo.note-series.v1";
const articleStorageKey = "hasshin-labo.note-articles.v1";
const todayStorageKey = "hasshin-labo.today.v1";

const channels = ["X", "note", "Threads", "Instagram", "YouTube", "TikTok", "その他"];
const goals = ["認知", "note誘導", "有料note販売", "気づき保存", "学習記録"];
const seriesStatuses = ["企画中", "執筆中", "公開中", "完了"];
const priceTypes = ["無料", "有料", "無料+有料"];
const articleStatuses = ["候補", "構成中", "執筆中", "公開済み", "保留"];

const emptyToday = {
  selectedArticleId: "",
  nextNote: "",
  threadsIdea: "",
  scheduledPost: "",
  reactionMemo: "",
  quote: "",
};

const emptyLogForm = {
  id: "",
  sourceArticleId: "",
  publishedAt: today(),
  channel: "X",
  title: "",
  contentMemo: "",
  url: "",
  theme: "",
  goal: "認知",
  impressions: "",
  likes: "",
  comments: "",
  followerChange: "",
  clicks: "",
  revenueOrPurchases: "",
  goodPoint: "",
  reason: "",
  nextTry: "",
};

const emptySeriesForm = {
  id: "",
  title: "",
  concept: "",
  reader: "",
  status: "企画中",
  priceType: "無料",
  plannedCount: "",
  publishedCount: "",
  nextDeadline: "",
  nextAction: "",
  memo: "",
};

const emptyArticleForm = {
  id: "",
  title: "",
  seriesId: "",
  status: "候補",
  priority: "中",
  targetReader: "",
  promise: "",
  outline: "",
  hook: "",
  cta: "",
  memo: "",
  dueDate: "",
  publishedUrl: "",
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadObject(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function numberValue(value) {
  return Number(value || 0);
}

function reactionScore(log) {
  return numberValue(log.likes) + numberValue(log.comments) * 2 + numberValue(log.clicks) * 3 + numberValue(log.followerChange) * 5;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(numberValue(value));
}

function formatDate(value) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function priorityRank(priority) {
  if (priority === "高") return 0;
  if (priority === "中") return 1;
  return 2;
}

function App() {
  const [logs, setLogs] = useState(() => loadArray(logStorageKey));
  const [series, setSeries] = useState(() => loadArray(seriesStorageKey));
  const [articles, setArticles] = useState(() => loadArray(articleStorageKey));
  const [todayMemo, setTodayMemo] = useState(() => loadObject(todayStorageKey, emptyToday));
  const [activeView, setActiveView] = useState("home");
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [seriesForm, setSeriesForm] = useState(emptySeriesForm);
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("すべて");

  useEffect(() => {
    localStorage.setItem(logStorageKey, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(seriesStorageKey, JSON.stringify(series));
  }, [series]);

  useEffect(() => {
    localStorage.setItem(articleStorageKey, JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem(todayStorageKey, JSON.stringify(todayMemo));
  }, [todayMemo]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => `${b.publishedAt}${b.updatedAt || ""}`.localeCompare(`${a.publishedAt}${a.updatedAt || ""}`)),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedLogs
      .filter((log) => channelFilter === "すべて" || log.channel === channelFilter)
      .filter((log) => {
        if (!normalizedQuery) return true;
        return [log.title, log.contentMemo, log.theme, log.goal, log.goodPoint, log.reason, log.nextTry]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [channelFilter, query, sortedLogs]);

  const dashboard = useMemo(() => {
    const currentMonth = today().slice(0, 7);
    const monthLogs = logs.filter((log) => log.publishedAt?.startsWith(currentMonth));
    const channelCounts = channels.map((channel) => ({
      channel,
      count: logs.filter((log) => log.channel === channel).length,
    }));
    const bestLog = [...logs].sort((a, b) => reactionScore(b) - reactionScore(a))[0] || null;

    return { monthCount: monthLogs.length, channelCounts, bestLog };
  }, [logs]);

  const seriesSummary = useMemo(() => {
    const activeCount = series.filter((item) => item.status !== "完了").length;
    const publishedTotal = series.reduce((sum, item) => sum + numberValue(item.publishedCount), 0);
    const nextSeries = [...series]
      .filter((item) => item.nextDeadline)
      .sort((a, b) => a.nextDeadline.localeCompare(b.nextDeadline))[0];

    return { activeCount, publishedTotal, nextSeries };
  }, [series]);

  const articleSummary = useMemo(() => {
    const activeCount = articles.filter((item) => item.status !== "公開済み" && item.status !== "保留").length;
    const publishedCount = articles.filter((item) => item.status === "公開済み").length;
    const nextArticle = [...articles]
      .filter((item) => item.status !== "公開済み" && item.status !== "保留")
      .sort((a, b) => `${a.dueDate || "9999"}${priorityRank(a.priority)}`.localeCompare(`${b.dueDate || "9999"}${priorityRank(b.priority)}`))[0];

    return { activeCount, publishedCount, nextArticle };
  }, [articles]);

  function startNewLog() {
    setLogForm({ ...emptyLogForm, publishedAt: today() });
    setActiveView("form");
  }

  function makeArticleToday(article) {
    setTodayMemo((current) => ({
      ...current,
      selectedArticleId: article.id,
      nextNote: article.title,
    }));
    setArticles((current) =>
      current.map((item) => (item.id === article.id && item.status === "候補" ? { ...item, status: "構成中", updatedAt: new Date().toISOString() } : item)),
    );
    setActiveView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createLogFromToday() {
    const selectedArticle = articles.find((item) => item.id === todayMemo.selectedArticleId);
    const title = todayMemo.nextNote || selectedArticle?.title || "";
    const contentPieces = [
      selectedArticle?.promise ? `約束: ${selectedArticle.promise}` : "",
      selectedArticle?.outline ? `構成: ${selectedArticle.outline}` : "",
      selectedArticle?.hook ? `冒頭: ${selectedArticle.hook}` : "",
      todayMemo.scheduledPost ? `予約投稿: ${todayMemo.scheduledPost}` : "",
      todayMemo.quote ? `刺さった言葉: ${todayMemo.quote}` : "",
    ].filter(Boolean);

    setLogForm({
      ...emptyLogForm,
      sourceArticleId: selectedArticle?.id || "",
      publishedAt: today(),
      channel: "note",
      title,
      contentMemo: contentPieces.join("\n\n"),
      url: selectedArticle?.publishedUrl || "",
      theme: selectedArticle ? "note記事" : "",
      goal: "note誘導",
      goodPoint: todayMemo.reactionMemo,
      nextTry: selectedArticle?.cta || "",
    });
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editLog(log) {
    setLogForm({ ...emptyLogForm, ...log });
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteLog(id) {
    const target = logs.find((log) => log.id === id);
    if (!target) return;
    if (!window.confirm(`「${target.title}」を削除しますか？`)) return;
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  function saveLog(event) {
    event.preventDefault();
    const nextLog = {
      ...logForm,
      id: logForm.id || createId(),
      title: logForm.title.trim(),
      contentMemo: logForm.contentMemo.trim(),
      url: logForm.url.trim(),
      theme: logForm.theme.trim(),
      goodPoint: logForm.goodPoint.trim(),
      reason: logForm.reason.trim(),
      nextTry: logForm.nextTry.trim(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => {
      const exists = current.some((log) => log.id === nextLog.id);
      return exists ? current.map((log) => (log.id === nextLog.id ? nextLog : log)) : [nextLog, ...current];
    });

    if (nextLog.sourceArticleId) {
      setArticles((current) =>
        current.map((item) =>
          item.id === nextLog.sourceArticleId
            ? {
                ...item,
                status: "公開済み",
                publishedUrl: nextLog.url || item.publishedUrl,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    setLogForm({ ...emptyLogForm, publishedAt: today() });
    setActiveView("list");
  }

  function updateSeriesField(name, value) {
    setSeriesForm((current) => ({ ...current, [name]: value }));
  }

  function resetSeriesForm() {
    setSeriesForm(emptySeriesForm);
  }

  function editSeries(item) {
    setSeriesForm({ ...emptySeriesForm, ...item });
    setActiveView("series");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteSeries(id) {
    const target = series.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`「${target.title}」を削除しますか？`)) return;
    setSeries((current) => current.filter((item) => item.id !== id));
  }

  function saveSeries(event) {
    event.preventDefault();
    const nextSeries = {
      ...seriesForm,
      id: seriesForm.id || createId(),
      title: seriesForm.title.trim(),
      concept: seriesForm.concept.trim(),
      reader: seriesForm.reader.trim(),
      nextAction: seriesForm.nextAction.trim(),
      memo: seriesForm.memo.trim(),
      updatedAt: new Date().toISOString(),
    };

    setSeries((current) => {
      const exists = current.some((item) => item.id === nextSeries.id);
      return exists ? current.map((item) => (item.id === nextSeries.id ? nextSeries : item)) : [nextSeries, ...current];
    });
    resetSeriesForm();
  }

  function updateArticleField(name, value) {
    setArticleForm((current) => ({ ...current, [name]: value }));
  }

  function resetArticleForm() {
    setArticleForm(emptyArticleForm);
  }

  function editArticle(item) {
    setArticleForm({ ...emptyArticleForm, ...item });
    setActiveView("articles");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteArticle(id) {
    const target = articles.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`「${target.title}」を削除しますか？`)) return;
    setArticles((current) => current.filter((item) => item.id !== id));
  }

  function saveArticle(event) {
    event.preventDefault();
    const nextArticle = {
      ...articleForm,
      id: articleForm.id || createId(),
      title: articleForm.title.trim(),
      targetReader: articleForm.targetReader.trim(),
      promise: articleForm.promise.trim(),
      outline: articleForm.outline.trim(),
      hook: articleForm.hook.trim(),
      cta: articleForm.cta.trim(),
      memo: articleForm.memo.trim(),
      publishedUrl: articleForm.publishedUrl.trim(),
      updatedAt: new Date().toISOString(),
    };

    setArticles((current) => {
      const exists = current.some((item) => item.id === nextArticle.id);
      return exists ? current.map((item) => (item.id === nextArticle.id ? nextArticle : item)) : [nextArticle, ...current];
    });
    resetArticleForm();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hasshin Labo</p>
          <h1>発信Labo</h1>
        </div>
        <button className="primary-button" type="button" onClick={startNewLog}>
          新規登録
        </button>
      </header>

      <nav className="tab-nav" aria-label="画面切り替え">
        <button className={activeView === "home" ? "active" : ""} type="button" onClick={() => setActiveView("home")}>
          <span className="nav-label-full">トップ</span>
          <span className="nav-label-short">トップ</span>
        </button>
        <button className={activeView === "list" ? "active" : ""} type="button" onClick={() => setActiveView("list")}>
          <span className="nav-label-full">ログ一覧</span>
          <span className="nav-label-short">ログ</span>
        </button>
        <button className={activeView === "form" ? "active" : ""} type="button" onClick={startNewLog}>
          <span className="nav-label-full">新規登録・編集</span>
          <span className="nav-label-short">登録</span>
        </button>
        <button className={activeView === "series" ? "active" : ""} type="button" onClick={() => setActiveView("series")}>
          <span className="nav-label-full">noteシリーズ</span>
          <span className="nav-label-short">シリーズ</span>
        </button>
        <button className={activeView === "articles" ? "active" : ""} type="button" onClick={() => setActiveView("articles")}>
          <span className="nav-label-full">note記事候補</span>
          <span className="nav-label-short">候補</span>
        </button>
      </nav>

      {activeView === "home" && (
        <Home
          data={dashboard}
          series={series}
          seriesSummary={seriesSummary}
          articles={articles}
          articleSummary={articleSummary}
          todayMemo={todayMemo}
          onTodayMemoChange={(name, value) => setTodayMemo((current) => ({ ...current, [name]: value }))}
          onCreateLogFromToday={createLogFromToday}
          onMakeArticleToday={makeArticleToday}
          onEditSeries={editSeries}
        />
      )}

      {activeView === "list" && (
        <LogList
          logs={filteredLogs}
          query={query}
          channelFilter={channelFilter}
          onQueryChange={setQuery}
          onChannelFilterChange={setChannelFilter}
          onEdit={editLog}
          onDelete={deleteLog}
        />
      )}

      {activeView === "form" && (
        <LogForm
          form={logForm}
          onSubmit={saveLog}
          onFieldChange={(name, value) => setLogForm((current) => ({ ...current, [name]: value }))}
          onReset={() => setLogForm({ ...emptyLogForm, publishedAt: today() })}
        />
      )}

      {activeView === "series" && (
        <SeriesManager
          form={seriesForm}
          items={series}
          summary={seriesSummary}
          onFieldChange={updateSeriesField}
          onSubmit={saveSeries}
          onReset={resetSeriesForm}
          onEdit={editSeries}
          onDelete={deleteSeries}
        />
      )}

      {activeView === "articles" && (
        <ArticleManager
          form={articleForm}
          items={articles}
          series={series}
          summary={articleSummary}
          onFieldChange={updateArticleField}
          onSubmit={saveArticle}
          onReset={resetArticleForm}
          onEdit={editArticle}
          onDelete={deleteArticle}
          onMakeToday={makeArticleToday}
        />
      )}
    </main>
  );
}

function Home({ data, series, seriesSummary, articles, articleSummary, todayMemo, onTodayMemoChange, onCreateLogFromToday, onMakeArticleToday, onEditSeries }) {
  return (
    <section className="view-stack" aria-label="トップ">
      <div className="home-grid">
        <TodayPanel memo={todayMemo} onChange={onTodayMemoChange} onCreateLog={onCreateLogFromToday} />
        <SeriesProgressPanel series={series} summary={seriesSummary} onEditSeries={onEditSeries} />
      </div>

      <ArticleQueuePanel articles={articles} summary={articleSummary} onMakeToday={onMakeArticleToday} />

      <div className="summary-grid">
        <SummaryCard label="今月の投稿数" value={data.monthCount} />
        <SummaryCard label="進行中シリーズ" value={seriesSummary.activeCount} />
        <SummaryCard label="記事候補" value={articleSummary.activeCount} />
      </div>

      <article className="panel">
        <div className="section-title">
          <h2>一番反応が良かった投稿</h2>
        </div>
        {data.bestLog ? <LogCard log={data.bestLog} compact /> : <EmptyState text="まだ投稿ログがありません。" />}
      </article>
    </section>
  );
}

function ArticleQueuePanel({ articles, summary, onMakeToday }) {
  const queue = [...articles]
    .filter((item) => item.status !== "公開済み" && item.status !== "保留")
    .sort((a, b) => `${a.dueDate || "9999"}${priorityRank(a.priority)}`.localeCompare(`${b.dueDate || "9999"}${priorityRank(b.priority)}`))
    .slice(0, 4);

  return (
    <article className="panel">
      <div className="section-title">
        <h2>note記事候補</h2>
      </div>
      {queue.length ? (
        <div className="article-mini-list">
          {queue.map((item) => (
            <div className="article-mini-item" key={item.id}>
              <div>
                <span className="date-text">締切: {formatDate(item.dueDate)}</span>
                <h3>{item.title}</h3>
              </div>
              <div className="mini-card-footer">
                <div className="tag-row">
                  <span>{item.status}</span>
                  <span>優先度: {item.priority}</span>
                </div>
                <button className="secondary-button compact-button" type="button" onClick={() => onMakeToday(item)}>
                  今日のnoteにする
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="記事候補を追加すると、次に書くnoteがここに並びます。" />
      )}
      {summary.nextArticle && <p className="panel-note">次に書く候補: {summary.nextArticle.title}</p>}
    </article>
  );
}

function TodayPanel({ memo, onChange, onCreateLog }) {
  const hasTodayContent = [memo.nextNote, memo.threadsIdea, memo.scheduledPost, memo.reactionMemo, memo.quote].some((value) => String(value || "").trim());

  return (
    <article className="panel today-panel">
      <div className="section-title compact-title title-with-action">
        <h2>今日の発信</h2>
        <button className="primary-button compact-button" type="button" onClick={onCreateLog} disabled={!hasTodayContent}>
          投稿済みにする
        </button>
      </div>
      <div className="today-list">
        <InlineMemo label="次のnote" value={memo.nextNote} onChange={(value) => onChange("nextNote", value)} />
        <InlineMemo label="Threads候補" value={memo.threadsIdea} onChange={(value) => onChange("threadsIdea", value)} />
        <InlineMemo label="予約投稿" value={memo.scheduledPost} onChange={(value) => onChange("scheduledPost", value)} />
        <InlineMemo label="反応メモ" value={memo.reactionMemo} onChange={(value) => onChange("reactionMemo", value)} />
        <InlineMemo label="刺さった言葉" value={memo.quote} onChange={(value) => onChange("quote", value)} />
      </div>
    </article>
  );
}

function InlineMemo({ label, value, onChange }) {
  return (
    <label className="inline-memo">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="未入力" />
    </label>
  );
}

function SeriesProgressPanel({ series, summary, onEditSeries }) {
  const visibleSeries = series.length
    ? [...series].sort((a, b) => `${a.nextDeadline || "9999"}${a.updatedAt || ""}`.localeCompare(`${b.nextDeadline || "9999"}${b.updatedAt || ""}`))
    : [];

  return (
    <article className="panel series-progress-panel">
      <div className="section-title compact-title">
        <h2>シリーズ進行</h2>
      </div>
      <div className="series-progress-list">
        {visibleSeries.length ? (
          visibleSeries.slice(0, 4).map((item) => <SeriesProgressItem item={item} key={item.id} onEdit={onEditSeries} />)
        ) : (
          <EmptyState text="noteシリーズを作ると、ここに進捗が出ます。" />
        )}
      </div>
      {summary.nextSeries && <p className="panel-note">次の締切: {summary.nextSeries.title} / {formatDate(summary.nextSeries.nextDeadline)}</p>}
    </article>
  );
}

function SeriesProgressItem({ item, onEdit }) {
  const planned = Math.max(0, numberValue(item.plannedCount));
  const published = Math.max(0, numberValue(item.publishedCount));
  const progress = planned ? Math.min(100, Math.round((published / planned) * 100)) : 0;

  return (
    <button className="series-progress-item" type="button" onClick={() => onEdit(item)}>
      <span className="series-progress-title">{item.title}</span>
      <span className="series-progress-row">
        <span className="bar-track">
          <span style={{ width: `${progress}%` }} />
        </span>
        <strong>{published}/{planned || "-"}</strong>
      </span>
    </button>
  );
}

function LogList({ logs, query, channelFilter, onQueryChange, onChannelFilterChange, onEdit, onDelete }) {
  return (
    <section className="view-stack" aria-label="ログ一覧">
      <div className="list-tools">
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} type="search" placeholder="タイトル・テーマで検索" />
        <select value={channelFilter} onChange={(event) => onChannelFilterChange(event.target.value)}>
          <option value="すべて">すべて</option>
          {channels.map((channel) => (
            <option value={channel} key={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>

      <div className="cards-grid">
        {logs.length ? (
          logs.map((log) => <LogCard log={log} key={log.id} onEdit={onEdit} onDelete={onDelete} />)
        ) : (
          <EmptyState text="条件に合うログがありません。" />
        )}
      </div>
    </section>
  );
}

function LogCard({ log, compact = false, onEdit, onDelete }) {
  return (
    <article className="log-card">
      <div className="card-head">
        <div>
          <span className="date-text">{formatDate(log.publishedAt)}</span>
          <h3>{log.title}</h3>
        </div>
        <span className="badge">{log.channel}</span>
      </div>

      <div className="tag-row">
        <span>{log.theme || "テーマ未設定"}</span>
        <span>{log.goal}</span>
      </div>

      {log.contentMemo && !compact && <p className="memo">{log.contentMemo}</p>}

      <div className="stats-grid">
        <Stat label="表示" value={formatNumber(log.impressions)} />
        <Stat label="いいね" value={formatNumber(log.likes)} />
        <Stat label="コメント" value={formatNumber(log.comments)} />
        <Stat label="クリック" value={formatNumber(log.clicks)} />
      </div>

      {!compact && (
        <>
          <div className="reflection-grid">
            <Reflection label="良かったこと" value={log.goodPoint} />
            <Reflection label="理由メモ" value={log.reason} />
            <Reflection label="次に試すこと" value={log.nextTry} />
          </div>

          <div className="card-actions">
            {log.url && (
              <a className="link-button" href={log.url} target="_blank" rel="noreferrer">
                投稿を開く
              </a>
            )}
            <button className="secondary-button" type="button" onClick={() => onEdit(log)}>
              編集
            </button>
            <button className="danger-button" type="button" onClick={() => onDelete(log.id)}>
              削除
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function SeriesManager({ form, items, summary, onFieldChange, onSubmit, onReset, onEdit, onDelete }) {
  return (
    <section className="view-stack" aria-label="noteシリーズ管理">
      <div className="summary-grid">
        <SummaryCard label="進行中シリーズ" value={summary.activeCount} />
        <SummaryCard label="公開済み記事" value={summary.publishedTotal} />
        <SummaryCard label="次の締切" value={summary.nextSeries ? formatDate(summary.nextSeries.nextDeadline) : "未設定"} />
      </div>

      <article className="panel form-panel">
        <div className="section-title">
          <h2>{form.id ? "シリーズを編集" : "noteシリーズを作成"}</h2>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="シリーズ名">
              <input value={form.title} onChange={(event) => onFieldChange("title", event.target.value)} required maxLength="80" />
            </Field>
            <Field label="ステータス">
              <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)}>
                {seriesStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="価格設計">
              <select value={form.priceType} onChange={(event) => onFieldChange("priceType", event.target.value)}>
                {priceTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="次の締切">
              <input value={form.nextDeadline} onChange={(event) => onFieldChange("nextDeadline", event.target.value)} type="date" />
            </Field>
            <NumberField label="予定記事数" name="plannedCount" form={form} onFieldChange={onFieldChange} />
            <NumberField label="公開済み記事数" name="publishedCount" form={form} onFieldChange={onFieldChange} />
          </div>

          <Field label="コンセプト">
            <textarea value={form.concept} onChange={(event) => onFieldChange("concept", event.target.value)} rows="3" />
          </Field>
          <Field label="想定読者">
            <textarea value={form.reader} onChange={(event) => onFieldChange("reader", event.target.value)} rows="3" />
          </Field>
          <Field label="次にやること">
            <input value={form.nextAction} onChange={(event) => onFieldChange("nextAction", event.target.value)} />
          </Field>
          <Field label="メモ">
            <textarea value={form.memo} onChange={(event) => onFieldChange("memo", event.target.value)} rows="3" />
          </Field>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onReset}>
              クリア
            </button>
            <button className="primary-button" type="submit">
              保存
            </button>
          </div>
        </form>
      </article>

      <div className="cards-grid">
        {items.length ? (
          items.map((item) => <SeriesCard item={item} key={item.id} onEdit={onEdit} onDelete={onDelete} />)
        ) : (
          <EmptyState text="まだnoteシリーズがありません。" />
        )}
      </div>
    </section>
  );
}

function SeriesCard({ item, onEdit, onDelete }) {
  const planned = Math.max(0, numberValue(item.plannedCount));
  const published = Math.max(0, numberValue(item.publishedCount));
  const progress = planned ? Math.min(100, Math.round((published / planned) * 100)) : 0;

  return (
    <article className="log-card series-card">
      <div className="card-head">
        <div>
          <span className="date-text">次の締切: {formatDate(item.nextDeadline)}</span>
          <h3>{item.title}</h3>
        </div>
        <span className="badge">{item.status}</span>
      </div>

      <div className="tag-row">
        <span>{item.priceType}</span>
        <span>{published}/{planned || "-"} 記事</span>
      </div>

      <div className="progress-block">
        <div className="bar-label">
          <span>進捗</span>
          <strong>{progress}%</strong>
        </div>
        <div className="bar-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="reflection-grid">
        <Reflection label="コンセプト" value={item.concept} />
        <Reflection label="想定読者" value={item.reader} />
        <Reflection label="次にやること" value={item.nextAction} />
        <Reflection label="メモ" value={item.memo} />
      </div>

      <div className="card-actions">
        <button className="secondary-button" type="button" onClick={() => onEdit(item)}>
          編集
        </button>
        <button className="danger-button" type="button" onClick={() => onDelete(item.id)}>
          削除
        </button>
      </div>
    </article>
  );
}

function ArticleManager({ form, items, series, summary, onFieldChange, onSubmit, onReset, onEdit, onDelete, onMakeToday }) {
  const sortedItems = [...items].sort((a, b) =>
    `${a.status === "公開済み" ? 1 : 0}${a.dueDate || "9999"}${priorityRank(a.priority)}`.localeCompare(
      `${b.status === "公開済み" ? 1 : 0}${b.dueDate || "9999"}${priorityRank(b.priority)}`,
    ),
  );

  return (
    <section className="view-stack" aria-label="note記事候補リスト">
      <div className="summary-grid">
        <SummaryCard label="未公開の記事候補" value={summary.activeCount} />
        <SummaryCard label="公開済み記事" value={summary.publishedCount} />
        <SummaryCard label="次に書く記事" value={summary.nextArticle ? summary.nextArticle.title : "未設定"} />
      </div>

      <article className="panel form-panel">
        <div className="section-title">
          <h2>{form.id ? "記事候補を編集" : "note記事候補を追加"}</h2>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="記事タイトル">
              <input value={form.title} onChange={(event) => onFieldChange("title", event.target.value)} required maxLength="100" />
            </Field>
            <Field label="紐づくシリーズ">
              <select value={form.seriesId} onChange={(event) => onFieldChange("seriesId", event.target.value)}>
                <option value="">なし</option>
                {series.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ステータス">
              <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)}>
                {articleStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="優先度">
              <select value={form.priority} onChange={(event) => onFieldChange("priority", event.target.value)}>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </Field>
            <Field label="締切">
              <input value={form.dueDate} onChange={(event) => onFieldChange("dueDate", event.target.value)} type="date" />
            </Field>
            <Field label="公開URL">
              <input value={form.publishedUrl} onChange={(event) => onFieldChange("publishedUrl", event.target.value)} type="url" placeholder="https://note.com/..." />
            </Field>
          </div>

          <Field label="想定読者">
            <textarea value={form.targetReader} onChange={(event) => onFieldChange("targetReader", event.target.value)} rows="3" />
          </Field>
          <Field label="この記事で約束すること">
            <textarea value={form.promise} onChange={(event) => onFieldChange("promise", event.target.value)} rows="3" />
          </Field>
          <Field label="構成メモ">
            <textarea value={form.outline} onChange={(event) => onFieldChange("outline", event.target.value)} rows="4" placeholder="見出し案、順番、入れたい話など" />
          </Field>
          <Field label="冒頭の掴み">
            <textarea value={form.hook} onChange={(event) => onFieldChange("hook", event.target.value)} rows="3" />
          </Field>
          <Field label="CTA / 読後にしてほしいこと">
            <input value={form.cta} onChange={(event) => onFieldChange("cta", event.target.value)} />
          </Field>
          <Field label="メモ">
            <textarea value={form.memo} onChange={(event) => onFieldChange("memo", event.target.value)} rows="3" />
          </Field>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onReset}>
              クリア
            </button>
            <button className="primary-button" type="submit">
              保存
            </button>
          </div>
        </form>
      </article>

      <div className="cards-grid">
        {sortedItems.length ? (
          sortedItems.map((item) => <ArticleCard item={item} series={series} key={item.id} onEdit={onEdit} onDelete={onDelete} onMakeToday={onMakeToday} />)
        ) : (
          <EmptyState text="まだnote記事候補がありません。" />
        )}
      </div>
    </section>
  );
}

function ArticleCard({ item, series, onEdit, onDelete, onMakeToday }) {
  const linkedSeries = series.find((seriesItem) => seriesItem.id === item.seriesId);

  return (
    <article className="log-card article-card">
      <div className="card-head">
        <div>
          <span className="date-text">締切: {formatDate(item.dueDate)}</span>
          <h3>{item.title}</h3>
        </div>
        <span className="badge">{item.status}</span>
      </div>

      <div className="tag-row">
        <span>優先度: {item.priority}</span>
        <span>{linkedSeries ? linkedSeries.title : "シリーズなし"}</span>
      </div>

      <div className="reflection-grid">
        <Reflection label="想定読者" value={item.targetReader} />
        <Reflection label="約束すること" value={item.promise} />
        <Reflection label="構成メモ" value={item.outline} />
        <Reflection label="冒頭の掴み" value={item.hook} />
        <Reflection label="CTA" value={item.cta} />
        <Reflection label="メモ" value={item.memo} />
      </div>

      <div className="card-actions">
        {item.status !== "公開済み" && (
          <button className="primary-button" type="button" onClick={() => onMakeToday(item)}>
            今日のnoteにする
          </button>
        )}
        {item.publishedUrl && (
          <a className="link-button" href={item.publishedUrl} target="_blank" rel="noreferrer">
            noteを開く
          </a>
        )}
        <button className="secondary-button" type="button" onClick={() => onEdit(item)}>
          編集
        </button>
        <button className="danger-button" type="button" onClick={() => onDelete(item.id)}>
          削除
        </button>
      </div>
    </article>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Reflection({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function LogForm({ form, onSubmit, onFieldChange, onReset }) {
  return (
    <section className="panel form-panel" aria-label="新規登録・編集">
      <div className="section-title">
        <h2>{form.id ? "ログを編集" : "新しい発信を記録"}</h2>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <Field label="投稿日">
            <input value={form.publishedAt} onChange={(event) => onFieldChange("publishedAt", event.target.value)} type="date" required />
          </Field>
          <Field label="媒体">
            <select value={form.channel} onChange={(event) => onFieldChange("channel", event.target.value)} required>
              {channels.map((channel) => (
                <option value={channel} key={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </Field>
          <Field label="タイトル">
            <input value={form.title} onChange={(event) => onFieldChange("title", event.target.value)} type="text" maxLength="80" required />
          </Field>
          <Field label="投稿URL">
            <input value={form.url} onChange={(event) => onFieldChange("url", event.target.value)} type="url" placeholder="https://example.com/post" />
          </Field>
          <Field label="テーマ">
            <input value={form.theme} onChange={(event) => onFieldChange("theme", event.target.value)} type="text" placeholder="例：AI活用、学習記録" />
          </Field>
          <Field label="狙い">
            <select value={form.goal} onChange={(event) => onFieldChange("goal", event.target.value)}>
              {goals.map((goal) => (
                <option value={goal} key={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="投稿内容メモ">
          <textarea value={form.contentMemo} onChange={(event) => onFieldChange("contentMemo", event.target.value)} rows="4" />
        </Field>

        <div className="number-grid">
          <NumberField label="表示数" name="impressions" form={form} onFieldChange={onFieldChange} />
          <NumberField label="いいね" name="likes" form={form} onFieldChange={onFieldChange} />
          <NumberField label="コメント" name="comments" form={form} onFieldChange={onFieldChange} />
          <NumberField label="フォロー増減" name="followerChange" form={form} onFieldChange={onFieldChange} />
          <NumberField label="クリック数" name="clicks" form={form} onFieldChange={onFieldChange} />
          <NumberField label="売上または購入数" name="revenueOrPurchases" form={form} onFieldChange={onFieldChange} />
        </div>

        <Field label="良かったこと">
          <textarea value={form.goodPoint} onChange={(event) => onFieldChange("goodPoint", event.target.value)} rows="3" />
        </Field>
        <Field label="なぜ伸びた/伸びなかったと思うか">
          <textarea value={form.reason} onChange={(event) => onFieldChange("reason", event.target.value)} rows="3" />
        </Field>
        <Field label="次に試すこと">
          <textarea value={form.nextTry} onChange={(event) => onFieldChange("nextTry", event.target.value)} rows="3" />
        </Field>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onReset}>
            クリア
          </button>
          <button className="primary-button" type="submit">
            保存
          </button>
        </div>
      </form>
    </section>
  );
}

function NumberField({ label, name, form, onFieldChange }) {
  return (
    <Field label={label}>
      <input value={form[name]} onChange={(event) => onFieldChange(name, event.target.value)} type="number" inputMode="numeric" />
    </Field>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

export default App;
