import { useEffect, useMemo, useState } from "react";

const logStorageKey = "hasshin-labo.logs.v2";
const seriesStorageKey = "hasshin-labo.note-series.v1";
const articleStorageKey = "hasshin-labo.note-articles.v1";
const xCandidateStorageKey = "hasshin-labo.x-candidates.v1";
const threadsCandidateStorageKey = "hasshin-labo.threads-candidates.v1";
const todayStorageKey = "hasshin-labo.today.v1";
const tempMemoStorageKey = "hasshin-labo.temp-memos.v1";

const channels = ["X", "note", "Threads", "Instagram", "YouTube", "TikTok", "その他"];
const goals = ["認知", "note誘導", "有料note販売", "気づき保存", "学習記録"];
const seriesStatuses = ["企画中", "執筆中", "公開中", "完了"];
const priceTypes = ["無料", "有料", "無料+有料"];
const articleStatuses = ["候補", "構成中", "執筆中", "予約投稿", "公開済み", "保留"];
const articleStructureItems = ["共感", "構造", "不安"];
const articleLinkTargets = ["note", "X", "Threads", "AI記事", "シリーズ", "有料", "マガジン"];
const socialCandidateStatuses = ["候補", "作成中", "投稿済み", "保留"];
const timeSlots = ["朝", "昼", "夜"];
const tempMemoTypes = ["一言保存", "タイトル候補", "Threads化候補", "note化候補", "AI実験メモ"];

const emptyToday = {
  selectedArticleId: "",
  weeklyTheme: "",
  task: "",
  weeklyTasks: createEmptyWeeklyTasks(),
  nextNote: "",
  threadsIdea: "",
  scheduledPost: "",
  reactionMemo: "",
  quote: "",
};

const emptyLogForm = {
  id: "",
  sourceArticleId: "",
  sourceCandidateId: "",
  sourceCandidateType: "",
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
  structureItem: "共感",
  outline: "",
  hook: "",
  linkTarget: "",
  cta: "",
  memo: "",
  dueDate: "",
  publishedUrl: "",
};

const emptySocialCandidateForm = {
  id: "",
  title: "",
  status: "候補",
  priority: "中",
  dueDate: "",
  publishedUrl: "",
  targetReader: "",
  goal: "",
  hook: "",
  body: "",
  cta: "",
  memo: "",
};

const emptyTempMemoForm = {
  id: "",
  type: "一言保存",
  body: "",
  memo: "",
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

function createEmptyWeeklyTasks() {
  return Array.from({ length: 5 }, () => ({ text: "", done: false }));
}

function normalizeWeeklyTasks(tasks, legacyTask = "") {
  const normalized = createEmptyWeeklyTasks();

  if (Array.isArray(tasks)) {
    tasks.slice(0, 5).forEach((task, index) => {
      if (typeof task === "string") {
        normalized[index] = { text: task, done: false };
        return;
      }
      if (task && typeof task === "object") {
        normalized[index] = {
          text: String(task.text || ""),
          done: Boolean(task.done),
        };
      }
    });
    return normalized;
  }

  if (legacyTask) {
    normalized[0] = { text: legacyTask, done: false };
  }

  return normalized;
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

function timeSlotRank(value) {
  const index = timeSlots.indexOf(value);
  return index === -1 ? 0 : index;
}

function socialSortRank(item) {
  return timeSlotRank(item.priority);
}

function socialTimeSlot(value) {
  return timeSlots.includes(value) ? value : timeSlots[0];
}

function socialCandidateTitle(candidate, channel) {
  const firstLine = String(candidate.body || "")
    .trim()
    .split(/\r?\n/)
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 60) : `${channel}投稿候補`;
}

function articleWorldline(article, series) {
  const linkedSeries = series.find((seriesItem) => seriesItem.id === article.seriesId);
  return linkedSeries ? linkedSeries.title : "世界線未定";
}

function articleLinkTarget(article) {
  return article.linkTarget || "導線未定";
}

function summarizeSocialCandidates(items, channel) {
  const activeCount = items.filter((item) => item.status !== "投稿済み" && item.status !== "保留").length;
  const publishedCount = items.filter((item) => item.status === "投稿済み").length;
  const nextItem = [...items]
    .filter((item) => item.status !== "投稿済み" && item.status !== "保留")
    .sort((a, b) => `${a.dueDate || "9999"}${socialSortRank(a)}`.localeCompare(`${b.dueDate || "9999"}${socialSortRank(b)}`))[0];

  return { activeCount, publishedCount, nextItem };
}

function buildLogFromArticle(article, overrides = {}) {
  const contentPieces = [
    article.promise ? `約束: ${article.promise}` : "",
    article.structureItem ? `構成項目: ${article.structureItem}` : "",
    article.outline ? `構成: ${article.outline}` : "",
    article.hook ? `冒頭: ${article.hook}` : "",
    article.linkTarget ? `導線: ${article.linkTarget}` : "",
    article.memo ? `メモ: ${article.memo}` : "",
  ].filter(Boolean);

  return {
    ...emptyLogForm,
    sourceArticleId: article.id,
    publishedAt: article.dueDate || today(),
    channel: "note",
    title: article.title,
    contentMemo: contentPieces.join("\n\n"),
    url: article.publishedUrl || "",
    theme: "note記事",
    goal: "note誘導",
    nextTry: article.cta || "",
    ...overrides,
  };
}

function buildLogFromSocialCandidate(candidate, channel, overrides = {}) {
  const contentPieces = [
    `投稿時間帯: ${socialTimeSlot(candidate.priority)}`,
    candidate.goal ? `狙い: ${candidate.goal}` : "",
    candidate.body ? `本文: ${candidate.body}` : "",
    candidate.memo ? `メモ: ${candidate.memo}` : "",
  ].filter(Boolean);

  return {
    ...emptyLogForm,
    sourceCandidateId: candidate.id,
    sourceCandidateType: channel,
    publishedAt: candidate.dueDate || today(),
    channel,
    title: socialCandidateTitle(candidate, channel),
    contentMemo: contentPieces.join("\n\n"),
    url: candidate.publishedUrl || "",
    theme: `${channel}投稿`,
    goal: candidate.goal || "認知",
    ...overrides,
  };
}

function App() {
  const [logs, setLogs] = useState(() => loadArray(logStorageKey));
  const [series, setSeries] = useState(() => loadArray(seriesStorageKey));
  const [articles, setArticles] = useState(() => loadArray(articleStorageKey));
  const [xCandidates, setXCandidates] = useState(() => loadArray(xCandidateStorageKey));
  const [threadsCandidates, setThreadsCandidates] = useState(() => loadArray(threadsCandidateStorageKey));
  const [todayMemo, setTodayMemo] = useState(() => loadObject(todayStorageKey, emptyToday));
  const [tempMemos, setTempMemos] = useState(() => loadArray(tempMemoStorageKey));
  const [activeView, setActiveView] = useState("home");
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [seriesForm, setSeriesForm] = useState(emptySeriesForm);
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [xCandidateForm, setXCandidateForm] = useState(emptySocialCandidateForm);
  const [threadsCandidateForm, setThreadsCandidateForm] = useState(emptySocialCandidateForm);
  const [tempMemoForm, setTempMemoForm] = useState(emptyTempMemoForm);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("すべて");
  const [tempMemoQuery, setTempMemoQuery] = useState("");
  const [tempMemoTypeFilter, setTempMemoTypeFilter] = useState("すべて");

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
    localStorage.setItem(xCandidateStorageKey, JSON.stringify(xCandidates));
  }, [xCandidates]);

  useEffect(() => {
    localStorage.setItem(threadsCandidateStorageKey, JSON.stringify(threadsCandidates));
  }, [threadsCandidates]);

  useEffect(() => {
    localStorage.setItem(todayStorageKey, JSON.stringify(todayMemo));
  }, [todayMemo]);

  useEffect(() => {
    localStorage.setItem(tempMemoStorageKey, JSON.stringify(tempMemos));
  }, [tempMemos]);

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

  const xCandidateSummary = useMemo(() => summarizeSocialCandidates(xCandidates, "X"), [xCandidates]);
  const threadsCandidateSummary = useMemo(() => summarizeSocialCandidates(threadsCandidates, "Threads"), [threadsCandidates]);

  const filteredTempMemos = useMemo(() => {
    const normalizedQuery = tempMemoQuery.trim().toLowerCase();

    return [...tempMemos]
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .filter((memo) => tempMemoTypeFilter === "すべて" || memo.type === tempMemoTypeFilter)
      .filter((memo) => {
        if (!normalizedQuery) return true;
        return [memo.type, memo.body, memo.memo].join(" ").toLowerCase().includes(normalizedQuery);
      });
  }, [tempMemoQuery, tempMemoTypeFilter, tempMemos]);

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
      selectedArticle?.structureItem ? `構成項目: ${selectedArticle.structureItem}` : "",
      selectedArticle?.outline ? `構成: ${selectedArticle.outline}` : "",
      selectedArticle?.hook ? `冒頭: ${selectedArticle.hook}` : "",
      todayMemo.scheduledPost ? `予約投稿: ${todayMemo.scheduledPost}` : "",
      todayMemo.quote ? `刺さった言葉: ${todayMemo.quote}` : "",
    ].filter(Boolean);

    setLogForm(
      selectedArticle
        ? buildLogFromArticle(selectedArticle, {
            publishedAt: today(),
            title,
            contentMemo: contentPieces.join("\n\n"),
            goodPoint: todayMemo.reactionMemo,
          })
        : {
            ...emptyLogForm,
            publishedAt: today(),
            channel: "note",
            title,
            contentMemo: contentPieces.join("\n\n"),
            goal: "note誘導",
            goodPoint: todayMemo.reactionMemo,
          },
    );
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function upsertLogFromArticle(article) {
    const logFields = buildLogFromArticle(article);
    const nextLog = {
      ...logFields,
      id: "",
      title: article.title.trim(),
      contentMemo: logFields.contentMemo.trim(),
      url: article.publishedUrl.trim(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => {
      const existing = current.find((log) => log.sourceArticleId === article.id);
      const logWithId = { ...nextLog, id: existing?.id || createId() };
      return existing ? current.map((log) => (log.id === existing.id ? { ...existing, ...logWithId } : log)) : [logWithId, ...current];
    });
  }

  function createLogFromArticleCandidate(article) {
    upsertLogFromArticle(article);
    setArticles((current) =>
      current.map((item) =>
        item.id === article.id
          ? {
              ...item,
              status: "公開済み",
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setActiveView("list");
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

    if (nextLog.sourceCandidateId && nextLog.sourceCandidateType === "X") {
      setXCandidates((current) =>
        current.map((item) =>
          item.id === nextLog.sourceCandidateId
            ? {
                ...item,
                status: "投稿済み",
                publishedUrl: nextLog.url || item.publishedUrl,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    if (nextLog.sourceCandidateId && nextLog.sourceCandidateType === "Threads") {
      setThreadsCandidates((current) =>
        current.map((item) =>
          item.id === nextLog.sourceCandidateId
            ? {
                ...item,
                status: "投稿済み",
                publishedUrl: nextLog.url || item.publishedUrl,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    setLogForm({ ...emptyLogForm, publishedAt: today() });
    setActiveView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      structureItem: articleForm.structureItem || articleStructureItems[0],
      outline: articleForm.outline.trim(),
      hook: articleForm.hook.trim(),
      linkTarget: articleForm.linkTarget,
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

    if (nextArticle.status === "公開済み") {
      upsertLogFromArticle(nextArticle);
      setActiveView("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function updateXCandidateField(name, value) {
    setXCandidateForm((current) => ({ ...current, [name]: value }));
  }

  function updateThreadsCandidateField(name, value) {
    setThreadsCandidateForm((current) => ({ ...current, [name]: value }));
  }

  function resetXCandidateForm() {
    setXCandidateForm(emptySocialCandidateForm);
  }

  function resetThreadsCandidateForm() {
    setThreadsCandidateForm(emptySocialCandidateForm);
  }

  function saveSocialCandidate(event, form, channel, setItems, resetForm) {
    event.preventDefault();
    const nextCandidate = {
      ...form,
      id: form.id || createId(),
      title: "",
      priority: socialTimeSlot(form.priority),
      targetReader: "",
      goal: form.goal.trim(),
      hook: "",
      body: form.body.trim(),
      cta: "",
      memo: form.memo.trim(),
      publishedUrl: form.publishedUrl.trim(),
      updatedAt: new Date().toISOString(),
    };

    setItems((current) => {
      const exists = current.some((item) => item.id === nextCandidate.id);
      return exists ? current.map((item) => (item.id === nextCandidate.id ? nextCandidate : item)) : [nextCandidate, ...current];
    });
    resetForm();

    if (nextCandidate.status === "投稿済み") {
      upsertLogFromSocialCandidate(nextCandidate, channel);
      setActiveView("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function editSocialCandidate(item, setForm, view) {
    setForm({ ...emptySocialCandidateForm, ...item });
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteSocialCandidate(id, items, setItems, channel) {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`「${socialCandidateTitle(target, channel)}」を削除しますか？`)) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function upsertLogFromSocialCandidate(candidate, channel) {
    const logFields = buildLogFromSocialCandidate(candidate, channel);
    const nextLog = {
      ...logFields,
      id: "",
      title: socialCandidateTitle(candidate, channel),
      contentMemo: logFields.contentMemo.trim(),
      url: candidate.publishedUrl.trim(),
      updatedAt: new Date().toISOString(),
    };

    setLogs((current) => {
      const existing = current.find((log) => log.sourceCandidateId === candidate.id && log.sourceCandidateType === channel);
      const logWithId = { ...nextLog, id: existing?.id || createId() };
      return existing ? current.map((log) => (log.id === existing.id ? { ...existing, ...logWithId } : log)) : [logWithId, ...current];
    });
  }

  function createLogFromSocialCandidate(candidate, channel) {
    upsertLogFromSocialCandidate(candidate, channel);
    const setItems = channel === "X" ? setXCandidates : setThreadsCandidates;
    setItems((current) =>
      current.map((item) =>
        item.id === candidate.id
          ? {
              ...item,
              status: "投稿済み",
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setActiveView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateTempMemoField(name, value) {
    setTempMemoForm((current) => ({ ...current, [name]: value }));
  }

  function resetTempMemoForm() {
    setTempMemoForm(emptyTempMemoForm);
  }

  function saveTempMemo(event) {
    event.preventDefault();
    const nextMemo = {
      ...tempMemoForm,
      id: tempMemoForm.id || createId(),
      type: tempMemoForm.type || tempMemoTypes[0],
      body: tempMemoForm.body.trim(),
      memo: tempMemoForm.memo.trim(),
      updatedAt: new Date().toISOString(),
    };

    setTempMemos((current) => {
      const exists = current.some((item) => item.id === nextMemo.id);
      return exists ? current.map((item) => (item.id === nextMemo.id ? nextMemo : item)) : [nextMemo, ...current];
    });
    resetTempMemoForm();
  }

  function editTempMemo(item) {
    setTempMemoForm({ ...emptyTempMemoForm, ...item });
    setActiveView("tempMemos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTempMemo(id) {
    const target = tempMemos.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm("この仮メモを削除しますか？")) return;
    setTempMemos((current) => current.filter((item) => item.id !== id));
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
        <button className={activeView === "tempMemos" ? "active" : ""} type="button" onClick={() => setActiveView("tempMemos")}>
          <span className="nav-label-full">仮メモ</span>
          <span className="nav-label-short">仮メモ</span>
        </button>
        <button className={activeView === "xCandidates" ? "active" : ""} type="button" onClick={() => setActiveView("xCandidates")}>
          <span className="nav-label-full">X候補</span>
          <span className="nav-label-short">X</span>
        </button>
        <button className={activeView === "threadsCandidates" ? "active" : ""} type="button" onClick={() => setActiveView("threadsCandidates")}>
          <span className="nav-label-full">Threads候補</span>
          <span className="nav-label-short">Threads</span>
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
          onCreateLogFromArticle={createLogFromArticleCandidate}
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
          onCreateLog={createLogFromArticleCandidate}
        />
      )}

      {activeView === "tempMemos" && (
        <TempMemoManager
          form={tempMemoForm}
          items={filteredTempMemos}
          allItems={tempMemos}
          totalCount={tempMemos.length}
          query={tempMemoQuery}
          typeFilter={tempMemoTypeFilter}
          onQueryChange={setTempMemoQuery}
          onTypeFilterChange={setTempMemoTypeFilter}
          onFieldChange={updateTempMemoField}
          onSubmit={saveTempMemo}
          onReset={resetTempMemoForm}
          onEdit={editTempMemo}
          onDelete={deleteTempMemo}
        />
      )}

      {activeView === "xCandidates" && (
        <SocialCandidateManager
          channel="X"
          form={xCandidateForm}
          items={xCandidates}
          summary={xCandidateSummary}
          onFieldChange={updateXCandidateField}
          onSubmit={(event) => saveSocialCandidate(event, xCandidateForm, "X", setXCandidates, resetXCandidateForm)}
          onReset={resetXCandidateForm}
          onEdit={(item) => editSocialCandidate(item, setXCandidateForm, "xCandidates")}
          onDelete={(id) => deleteSocialCandidate(id, xCandidates, setXCandidates, "X")}
          onCreateLog={(item) => createLogFromSocialCandidate(item, "X")}
        />
      )}

      {activeView === "threadsCandidates" && (
        <SocialCandidateManager
          channel="Threads"
          form={threadsCandidateForm}
          items={threadsCandidates}
          summary={threadsCandidateSummary}
          onFieldChange={updateThreadsCandidateField}
          onSubmit={(event) => saveSocialCandidate(event, threadsCandidateForm, "Threads", setThreadsCandidates, resetThreadsCandidateForm)}
          onReset={resetThreadsCandidateForm}
          onEdit={(item) => editSocialCandidate(item, setThreadsCandidateForm, "threadsCandidates")}
          onDelete={(id) => deleteSocialCandidate(id, threadsCandidates, setThreadsCandidates, "Threads")}
          onCreateLog={(item) => createLogFromSocialCandidate(item, "Threads")}
        />
      )}
    </main>
  );
}

function Home({ data, series, seriesSummary, articles, articleSummary, todayMemo, onTodayMemoChange, onCreateLogFromArticle, onEditSeries }) {
  return (
    <section className="view-stack" aria-label="トップ">
      <div className="home-grid">
        <WeeklyThemePanel memo={todayMemo} onChange={onTodayMemoChange} />
        <SeriesProgressPanel series={series} summary={seriesSummary} onEditSeries={onEditSeries} />
      </div>

      <ArticleQueuePanel articles={articles} series={series} summary={articleSummary} onCreateLog={onCreateLogFromArticle} />

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

function ArticleQueuePanel({ articles, series, summary, onCreateLog }) {
  const queue = [...articles]
    .filter((item) => item.status !== "公開済み" && item.status !== "保留")
    .sort((a, b) => `${a.dueDate || "9999"}${priorityRank(a.priority)}`.localeCompare(`${b.dueDate || "9999"}${priorityRank(b.priority)}`))
    .slice(0, 4);

  return (
    <article className="panel">
      <div className="section-title">
        <h2>今書く世界線</h2>
      </div>
      {queue.length ? (
        <div className="article-mini-list">
          {queue.map((item) => (
            <div className="article-mini-item" key={item.id}>
              <div>
                <span className="date-text">投稿日: {formatDate(item.dueDate)}</span>
                <h3>{item.title}</h3>
              </div>
              <div className="mini-card-footer">
                <div className="tag-row">
                  <span>{item.status}</span>
                  <span>優先度: {item.priority}</span>
                  <span className="worldline-tag">世界線: {articleWorldline(item, series)}</span>
                  <span className="route-tag">導線: {articleLinkTarget(item)}</span>
                </div>
                <button className="secondary-button compact-button" type="button" onClick={() => onCreateLog(item)}>
                  投稿ログにする
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="記事候補を追加すると、次に書くnoteがここに並びます。" />
      )}
      {summary.nextArticle && (
        <p className="panel-note">
          次に書く候補: {summary.nextArticle.title} / {articleWorldline(summary.nextArticle, series)} から {articleLinkTarget(summary.nextArticle)} へ
        </p>
      )}
    </article>
  );
}

function WeeklyThemePanel({ memo, onChange }) {
  const weeklyTasks = normalizeWeeklyTasks(memo.weeklyTasks, memo.task);

  function updateTask(index, field, value) {
    const nextTasks = weeklyTasks.map((task, taskIndex) => (taskIndex === index ? { ...task, [field]: value } : task));
    onChange("weeklyTasks", nextTasks);
  }

  return (
    <article className="panel today-panel">
      <div className="section-title compact-title">
        <h2>今週のテーマ</h2>
      </div>
      <div className="today-list">
        <InlineMemo label="テーマ" value={memo.weeklyTheme} onChange={(value) => onChange("weeklyTheme", value)} placeholder="今週、何を届ける？" />
        <WeeklyTaskList tasks={weeklyTasks} onTaskChange={updateTask} />
      </div>
    </article>
  );
}

function WeeklyTaskList({ tasks, onTaskChange }) {
  return (
    <div className="weekly-task-group">
      <span>タスク</span>
      <div className="weekly-task-list">
        {tasks.map((task, index) => (
          <label className="weekly-task-row" key={index}>
            <input type="checkbox" checked={task.done} onChange={(event) => onTaskChange(index, "done", event.target.checked)} />
            <input
              type="text"
              className={task.done ? "task-done" : ""}
              value={task.text}
              onChange={(event) => onTaskChange(index, "text", event.target.value)}
              placeholder={`タスク ${index + 1}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function InlineMemo({ label, value, onChange, placeholder = "未入力", multiline = false }) {
  return (
    <label className="inline-memo">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
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

function ArticleManager({ form, items, series, summary, onFieldChange, onSubmit, onReset, onEdit, onDelete, onCreateLog }) {
  const visibleItems = items.filter((item) => item.status !== "公開済み" && item.status !== "保留");
  const sortedItems = [...visibleItems].sort((a, b) =>
    `${a.status === "公開済み" ? 1 : 0}${a.dueDate || "9999"}${priorityRank(a.priority)}`.localeCompare(
      `${b.status === "公開済み" ? 1 : 0}${b.dueDate || "9999"}${priorityRank(b.priority)}`,
    ),
  );

  return (
    <section className="view-stack" aria-label="note記事候補リスト">
      <div className="summary-grid">
        <SummaryCard label="未公開の記事候補" value={summary.activeCount} />
        <SummaryCard label="公開済み記事" value={summary.publishedCount} />
        <SummaryCard label="次の導線" value={summary.nextArticle ? articleLinkTarget(summary.nextArticle) : "未設定"} />
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
            <Field label="この記事の世界線">
              <select value={form.seriesId} onChange={(event) => onFieldChange("seriesId", event.target.value)}>
                <option value="">まだ決めない</option>
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
            <Field label="このnoteから繋げる先">
              <select value={form.linkTarget} onChange={(event) => onFieldChange("linkTarget", event.target.value)}>
                <option value="">まだ決めない</option>
                {articleLinkTargets.map((target) => (
                  <option value={target} key={target}>
                    {target}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="投稿日">
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
          <Field label="構成項目">
            <select value={form.structureItem || articleStructureItems[0]} onChange={(event) => onFieldChange("structureItem", event.target.value)}>
              {articleStructureItems.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="構成メモ">
            <textarea value={form.outline} onChange={(event) => onFieldChange("outline", event.target.value)} rows="4" placeholder="見出し案、順番、入れたい話など" />
          </Field>
          <Field label="冒頭の掴み">
            <textarea value={form.hook} onChange={(event) => onFieldChange("hook", event.target.value)} rows="3" />
          </Field>
          <Field label="導線メモ / 読後にしてほしいこと">
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
          sortedItems.map((item) => <ArticleCard item={item} series={series} key={item.id} onEdit={onEdit} onDelete={onDelete} onCreateLog={onCreateLog} />)
        ) : (
          <EmptyState text="まだnote記事候補がありません。" />
        )}
      </div>
    </section>
  );
}

function ArticleCard({ item, series, onEdit, onDelete, onCreateLog }) {
  const worldline = articleWorldline(item, series);

  return (
    <article className="log-card article-card">
      <div className="card-head">
        <div>
          <span className="date-text">投稿日: {formatDate(item.dueDate)}</span>
          <h3>{item.title}</h3>
        </div>
        <span className="badge">{item.status}</span>
      </div>

      <div className="tag-row">
        <span>優先度: {item.priority}</span>
        <span className="worldline-tag">世界線: {worldline}</span>
        <span className="route-tag">導線: {articleLinkTarget(item)}</span>
      </div>

      <div className="reflection-grid">
        <Reflection label="想定読者" value={item.targetReader} />
        <Reflection label="約束すること" value={item.promise} />
        <Reflection label="構成項目" value={item.structureItem} />
        <Reflection label="構成メモ" value={item.outline} />
        <Reflection label="冒頭の掴み" value={item.hook} />
        <Reflection label="導線メモ" value={item.cta} />
        <Reflection label="メモ" value={item.memo} />
      </div>

      <div className="card-actions">
        {item.status !== "公開済み" && (
          <button className="primary-button" type="button" onClick={() => onCreateLog(item)}>
            投稿ログにする
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

function TempMemoManager({
  form,
  items,
  allItems,
  totalCount,
  query,
  typeFilter,
  onQueryChange,
  onTypeFilterChange,
  onFieldChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
}) {
  const pinnedTypes = tempMemoTypes.map((type) => ({
    type,
    count: allItems.filter((item) => item.type === type).length,
  }));

  return (
    <section className="view-stack" aria-label="仮メモ">
      <div className="summary-grid">
        <SummaryCard label="仮メモ総数" value={totalCount} />
        <SummaryCard label="表示中" value={items.length} />
        <SummaryCard label="カテゴリ" value={typeFilter} />
      </div>

      <article className="panel form-panel temp-memo-panel">
        <div className="section-title">
          <h2>{form.id ? "仮メモを編集" : "仮メモを追加"}</h2>
        </div>

        <form onSubmit={onSubmit}>
          <div className="quick-memo-grid">
            <Field label="種類">
              <select value={form.type} onChange={(event) => onFieldChange("type", event.target.value)}>
                {tempMemoTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="メモ">
              <textarea
                value={form.body}
                onChange={(event) => onFieldChange("body", event.target.value)}
                rows="3"
                placeholder="思いついた一言、タイトル案、note化したい種など"
                required
              />
            </Field>
          </div>

          <Field label="補足">
            <input value={form.memo} onChange={(event) => onFieldChange("memo", event.target.value)} placeholder="必要なら軽く" />
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

      <div className="temp-memo-filters">
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} type="search" placeholder="仮メモを検索" />
        <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
          <option value="すべて">すべて</option>
          {tempMemoTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="temp-memo-type-row" aria-label="仮メモカテゴリ">
        {pinnedTypes.map((item) => (
          <button
            className={typeFilter === item.type ? "active" : ""}
            type="button"
            key={item.type}
            onClick={() => onTypeFilterChange(typeFilter === item.type ? "すべて" : item.type)}
          >
            <span>{item.type}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>

      <div className="cards-grid">
        {items.length ? (
          items.map((item) => <TempMemoCard item={item} key={item.id} onEdit={onEdit} onDelete={onDelete} />)
        ) : (
          <EmptyState text="仮メモはまだありません。思いついたものを軽く入れておけます。" />
        )}
      </div>
    </section>
  );
}

function TempMemoCard({ item, onEdit, onDelete }) {
  return (
    <article className="log-card temp-memo-card">
      <div className="card-head">
        <div>
          <span className="date-text">更新: {item.updatedAt ? new Date(item.updatedAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "未設定"}</span>
          <h3>{item.body}</h3>
        </div>
        <span className="badge">{item.type}</span>
      </div>

      {item.memo && <p className="memo">{item.memo}</p>}

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

function SocialCandidateManager({ channel, form, items, summary, onFieldChange, onSubmit, onReset, onEdit, onDelete, onCreateLog }) {
  const scheduleValue = socialTimeSlot(form.priority);
  const visibleItems = items.filter((item) => item.status !== "投稿済み" && item.status !== "保留");
  const sortedItems = [...visibleItems].sort((a, b) =>
    `${a.status === "投稿済み" ? 1 : 0}${a.dueDate || "9999"}${socialSortRank(a)}`.localeCompare(
      `${b.status === "投稿済み" ? 1 : 0}${b.dueDate || "9999"}${socialSortRank(b)}`,
    ),
  );

  return (
    <section className="view-stack" aria-label={`${channel}候補リスト`}>
      <div className="summary-grid">
        <SummaryCard label="未投稿の候補" value={summary.activeCount} />
        <SummaryCard label="投稿済み" value={summary.publishedCount} />
        <SummaryCard label="次に投稿する候補" value={summary.nextItem ? socialCandidateTitle(summary.nextItem, channel) : "未設定"} />
      </div>

      <article className="panel form-panel">
        <div className="section-title">
          <h2>{form.id ? `${channel}候補を編集` : `${channel}候補を追加`}</h2>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="ステータス">
              <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)}>
                {socialCandidateStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="投稿時間帯">
              <select value={scheduleValue} onChange={(event) => onFieldChange("priority", event.target.value)}>
                {timeSlots.map((slot) => (
                  <option value={slot} key={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="投稿日目安">
              <input value={form.dueDate} onChange={(event) => onFieldChange("dueDate", event.target.value)} type="date" />
            </Field>
            <Field label="投稿URL">
              <input value={form.publishedUrl} onChange={(event) => onFieldChange("publishedUrl", event.target.value)} type="url" placeholder="https://..." />
            </Field>
            <Field label="狙い">
              <input value={form.goal} onChange={(event) => onFieldChange("goal", event.target.value)} placeholder="例: 認知、note誘導、反応を見る" />
            </Field>
          </div>

          <Field label="投稿本文">
            <textarea value={form.body} onChange={(event) => onFieldChange("body", event.target.value)} rows={channel === "X" ? "4" : "5"} />
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
          sortedItems.map((item) => (
            <SocialCandidateCard item={item} channel={channel} key={item.id} onEdit={onEdit} onDelete={onDelete} onCreateLog={onCreateLog} />
          ))
        ) : (
          <EmptyState text={`${channel}候補はまだありません。`} />
        )}
      </div>
    </section>
  );
}

function SocialCandidateCard({ item, channel, onEdit, onDelete, onCreateLog }) {
  return (
    <article className="log-card social-candidate-card">
      <div className="card-head">
        <div>
          <span className="date-text">投稿日目安: {formatDate(item.dueDate)}</span>
          <h3>{socialCandidateTitle(item, channel)}</h3>
        </div>
        <span className="badge">{item.status}</span>
      </div>

      <div className="tag-row">
        <span>{channel}</span>
        <span>投稿時間帯: {socialTimeSlot(item.priority)}</span>
        {item.goal && <span>{item.goal}</span>}
      </div>

      <div className="reflection-grid">
        <Reflection label="投稿本文" value={item.body} />
        <Reflection label="メモ" value={item.memo} />
      </div>

      <div className="card-actions">
        {item.status !== "投稿済み" && (
          <button className="primary-button" type="button" onClick={() => onCreateLog(item)}>
            投稿ログにする
          </button>
        )}
        {item.publishedUrl && (
          <a className="link-button" href={item.publishedUrl} target="_blank" rel="noreferrer">
            投稿を開く
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
