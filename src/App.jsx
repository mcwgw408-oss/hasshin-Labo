import { useEffect, useMemo, useState } from "react";

const storageKey = "hasshin-labo.logs.v2";

const channels = ["X", "note", "Threads", "Instagram", "YouTube", "TikTok", "その他"];
const goals = ["認知", "note誘導", "有料note販売", "気づき保存", "学習記録"];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyForm = {
  id: "",
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

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadLogs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function App() {
  const [logs, setLogs] = useState(loadLogs);
  const [activeView, setActiveView] = useState("dashboard");
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("すべて");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(logs));
  }, [logs]);

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

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm, publishedAt: today() });
  }

  function startNewLog() {
    resetForm();
    setActiveView("form");
  }

  function editLog(log) {
    setForm({ ...emptyForm, ...log });
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteLog(id) {
    const target = logs.find((log) => log.id === id);
    if (!target) return;
    if (!window.confirm(`「${target.title}」を削除しますか？`)) return;
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextLog = {
      ...form,
      id: form.id || createId(),
      title: form.title.trim(),
      contentMemo: form.contentMemo.trim(),
      url: form.url.trim(),
      theme: form.theme.trim(),
      goodPoint: form.goodPoint.trim(),
      reason: form.reason.trim(),
      nextTry: form.nextTry.trim(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => {
      const exists = current.some((log) => log.id === nextLog.id);
      return exists ? current.map((log) => (log.id === nextLog.id ? nextLog : log)) : [nextLog, ...current];
    });

    resetForm();
    setActiveView("list");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hasshin Labo</p>
          <h1>発信ログ</h1>
        </div>
        <button className="primary-button" type="button" onClick={startNewLog}>
          新規登録
        </button>
      </header>

      <nav className="tab-nav" aria-label="画面切り替え">
        <button className={activeView === "dashboard" ? "active" : ""} type="button" onClick={() => setActiveView("dashboard")}>
          ダッシュボード
        </button>
        <button className={activeView === "list" ? "active" : ""} type="button" onClick={() => setActiveView("list")}>
          ログ一覧
        </button>
        <button className={activeView === "form" ? "active" : ""} type="button" onClick={startNewLog}>
          新規登録・編集
        </button>
      </nav>

      {activeView === "dashboard" && <Dashboard data={dashboard} />}

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

      {activeView === "form" && <LogForm form={form} onSubmit={handleSubmit} onFieldChange={updateField} onReset={resetForm} />}
    </main>
  );
}

function Dashboard({ data }) {
  const maxCount = Math.max(1, ...data.channelCounts.map((item) => item.count));

  return (
    <section className="view-stack" aria-label="ダッシュボード">
      <article className="hero-card">
        <span>今月の投稿数</span>
        <strong>{data.monthCount}</strong>
      </article>

      <article className="panel">
        <div className="section-title">
          <h2>媒体別投稿数</h2>
        </div>
        <div className="channel-bars">
          {data.channelCounts.map((item) => (
            <div className="channel-bar" key={item.channel}>
              <div className="bar-label">
                <span>{item.channel}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <span style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="section-title">
          <h2>一番反応が良かった投稿</h2>
        </div>
        {data.bestLog ? <LogCard log={data.bestLog} compact /> : <EmptyState text="まだ投稿ログがありません。" />}
      </article>
    </section>
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
