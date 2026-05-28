"use client";

import type { User } from "@supabase/supabase-js";
import {
  Check,
  Circle,
  Database,
  Edit3,
  LogIn,
  LogOut,
  Pin,
  PinOff,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, Memo, supabase } from "@/lib/supabase";

type Draft = {
  title: string;
  body: string;
};

const emptyDraft: Draft = {
  title: "",
  body: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authMessage, setAuthMessage] = useState("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      queueMicrotask(() => setMemos([]));
      return;
    }

    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) setIsLoading(true);
    });

    supabase
      .from("memos")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (ignore) return;
        if (error) {
          setErrorMessage(error.message);
        } else {
          setMemos((data ?? []) as Memo[]);
          setErrorMessage("");
        }
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const done = memos.filter((memo) => memo.status === "done").length;
    return {
      total: memos.length,
      open: memos.length - done,
      done,
    };
  }, [memos]);

  const visibleMemos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return memos
      .filter((memo) => filter === "all" || memo.status === filter)
      .filter((memo) => {
        if (!normalizedQuery) return true;
        return `${memo.title} ${memo.body}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [filter, memos, query]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setIsSaving(true);
    setAuthMessage("");

    const action =
      authMode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setIsSaving(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage(
      authMode === "sign-up"
        ? "登録しました。メール確認が必要な場合は受信箱を確認してください。"
        : "ログインしました。",
    );
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMemos([]);
  }

  async function createMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;

    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from("memos")
      .insert({
        user_id: user.id,
        title,
        body,
        status: "open",
        pinned: false,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMemos((current) => [data as Memo, ...current]);
    setDraft(emptyDraft);
    setErrorMessage("");
  }

  function startEdit(memo: Memo) {
    setEditingId(memo.id);
    setEditingDraft({
      title: memo.title,
      body: memo.body,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft(emptyDraft);
  }

  async function updateMemo(id: string, changes: Partial<Memo>) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("memos")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMemos((current) =>
      current.map((memo) => (memo.id === id ? (data as Memo) : memo)),
    );
    setErrorMessage("");
  }

  async function saveEdit(id: string) {
    const title = editingDraft.title.trim();
    const body = editingDraft.body.trim();
    if (!title || !body) return;

    await updateMemo(id, { title, body });
    cancelEdit();
  }

  async function deleteMemo(id: string) {
    if (!supabase) return;

    const { error } = await supabase.from("memos").delete().eq("id", id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMemos((current) => current.filter((memo) => memo.id !== id));
    if (editingId === id) cancelEdit();
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-[#eef2ef] px-5 py-8 text-[#18201c]">
        <section className="mx-auto max-w-3xl border border-[#18201c]/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-[#4c6b5b]" aria-hidden="true" />
            <h1 className="text-3xl font-bold">Supabase設定が必要です</h1>
          </div>
          <p className="mt-4 leading-7 text-[#4d584f]">
            Step 3はSupabase AuthとDBを使います。`.env.local` またはVercelの環境変数に以下を設定してください。
          </p>
          <pre className="mt-5 overflow-x-auto bg-[#18201c] p-4 text-sm text-white">
            {`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p className="mt-4 text-sm text-[#66736a]">
            SQLは `supabase/schema.sql` に用意しています。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2ef] text-[#18201c]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#18201c]/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4c6b5b]">
              Step 3 Auth + DB
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
              個人メモ
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#4d584f]">
              Supabase Authでログインし、ユーザーごとにメモを保存します。
              RLSにより、他人のメモは読めない設計です。
            </p>
          </div>

          {user ? (
            <div className="flex flex-col gap-3 border border-[#18201c]/10 bg-white p-4 sm:min-w-[360px]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {user.email}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-10 items-center justify-center gap-2 border border-[#18201c]/15 px-4 text-sm font-semibold transition hover:bg-[#eef2ef]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                ログアウト
              </button>
            </div>
          ) : null}
        </header>

        {!user ? (
          <section className="mx-auto grid w-full max-w-5xl gap-6 py-6 lg:grid-cols-[1fr_420px]">
            <div className="border border-[#18201c]/10 bg-white p-6 shadow-sm">
              <ShieldCheck className="h-10 w-10 text-[#4c6b5b]" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-bold">ログインして始める</h2>
              <p className="mt-3 leading-7 text-[#4d584f]">
                Step 2ではブラウザに保存していました。Step 3では、ログインしたユーザーのIDとメモをDBに保存します。
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "メールアドレスとパスワードで認証",
                  "ログインユーザーごとにメモを分離",
                  "DB側のRLSで他人のデータを保護",
                ].map((item) => (
                  <div key={item} className="border-l-4 border-[#4c6b5b] bg-[#f7faf7] p-3 font-semibold">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleAuth}
              className="border border-[#18201c]/10 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-[#4c6b5b]" aria-hidden="true" />
                <h2 className="text-xl font-bold">
                  {authMode === "sign-in" ? "ログイン" : "新規登録"}
                </h2>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-[#4d584f]">
                  メールアドレス
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full border border-[#18201c]/15 bg-[#fbfbf8] px-3 outline-none transition focus:border-[#4c6b5b]"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold text-[#4d584f]">
                  パスワード
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-12 w-full border border-[#18201c]/15 bg-[#fbfbf8] px-3 outline-none transition focus:border-[#4c6b5b]"
                  minLength={6}
                  required
                />
              </label>

              {authMessage ? (
                <p className="mt-4 border border-[#d6a94f]/30 bg-[#fff8e8] p-3 text-sm font-semibold text-[#6f551c]">
                  {authMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSaving}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[#18201c] px-4 font-semibold text-white transition hover:bg-[#2d3b34] disabled:cursor-not-allowed disabled:bg-[#9aa49d]"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                {isSaving ? "処理中..." : authMode === "sign-in" ? "ログイン" : "登録"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAuthMode((current) =>
                    current === "sign-in" ? "sign-up" : "sign-in",
                  )
                }
                className="mt-3 h-11 w-full border border-[#18201c]/15 text-sm font-semibold transition hover:bg-[#eef2ef]"
              >
                {authMode === "sign-in" ? "新規登録に切り替え" : "ログインに切り替え"}
              </button>
            </form>
          </section>
        ) : (
          <section className="grid flex-1 gap-6 lg:grid-cols-[380px_1fr]">
            <form
              onSubmit={createMemo}
              className="self-start border border-[#18201c]/10 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#4c6b5b]" aria-hidden="true" />
                <h2 className="text-xl font-bold">新規メモ</h2>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-[#4d584f]">
                  タイトル
                </span>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-2 h-12 w-full border border-[#18201c]/15 bg-[#fbfbf8] px-3 outline-none transition focus:border-[#4c6b5b]"
                  maxLength={80}
                  placeholder="例: Supabaseで保存"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold text-[#4d584f]">本文</span>
                <textarea
                  value={draft.body}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-36 w-full resize-y border border-[#18201c]/15 bg-[#fbfbf8] px-3 py-3 outline-none transition focus:border-[#4c6b5b]"
                  maxLength={800}
                  placeholder="メモの内容を入力"
                />
              </label>

              <button
                type="submit"
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[#18201c] px-4 font-semibold text-white transition hover:bg-[#2d3b34] disabled:cursor-not-allowed disabled:bg-[#9aa49d]"
                disabled={isSaving || !draft.title.trim() || !draft.body.trim()}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                {isSaving ? "保存中..." : "追加する"}
              </button>
            </form>

            <section className="min-w-0">
              <div className="grid grid-cols-3 gap-2 pb-4">
                <Stat label="Total" value={stats.total} />
                <Stat label="Open" value={stats.open} />
                <Stat label="Done" value={stats.done} />
              </div>

              <div className="flex flex-col gap-3 border border-[#18201c]/10 bg-white p-4 shadow-sm md:flex-row md:items-center">
                <label className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66736a]"
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-11 w-full border border-[#18201c]/15 bg-[#fbfbf8] pl-10 pr-3 outline-none transition focus:border-[#4c6b5b]"
                    placeholder="タイトル・本文で検索"
                  />
                </label>

                <div className="grid grid-cols-3 border border-[#18201c]/15">
                  {(["all", "open", "done"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`h-11 px-4 text-sm font-semibold transition ${
                        filter === item
                          ? "bg-[#4c6b5b] text-white"
                          : "bg-white text-[#4d584f] hover:bg-[#eef2ef]"
                      }`}
                    >
                      {item === "all" ? "全て" : item === "open" ? "未完了" : "完了"}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage ? (
                <p className="mt-4 border border-[#b94a48]/25 bg-[#fff0f0] p-3 text-sm font-semibold text-[#b94a48]">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3">
                {isLoading ? (
                  <div className="border border-[#18201c]/10 bg-white p-8 text-center font-semibold">
                    読み込み中...
                  </div>
                ) : null}

                {visibleMemos.map((memo) => {
                  const isEditing = editingId === memo.id;

                  return (
                    <article
                      key={memo.id}
                      className="border border-[#18201c]/10 bg-white p-4 shadow-sm"
                    >
                      {isEditing ? (
                        <div className="grid gap-3">
                          <input
                            value={editingDraft.title}
                            onChange={(event) =>
                              setEditingDraft((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            className="h-11 w-full border border-[#18201c]/15 bg-[#fbfbf8] px-3 font-semibold outline-none transition focus:border-[#4c6b5b]"
                            maxLength={80}
                          />
                          <textarea
                            value={editingDraft.body}
                            onChange={(event) =>
                              setEditingDraft((current) => ({
                                ...current,
                                body: event.target.value,
                              }))
                            }
                            className="min-h-28 w-full resize-y border border-[#18201c]/15 bg-[#fbfbf8] px-3 py-3 outline-none transition focus:border-[#4c6b5b]"
                            maxLength={800}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(memo.id)}
                              className="flex h-10 items-center gap-2 bg-[#18201c] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3b34]"
                            >
                              <Save className="h-4 w-4" aria-hidden="true" />
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditingDraft({ title: "", body: "" });
                              }}
                              className="flex h-10 items-center gap-2 border border-[#18201c]/15 px-4 text-sm font-semibold transition hover:bg-[#eef2ef]"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {memo.pinned && (
                                <span className="border border-[#d06f3c]/25 bg-[#fff4ed] px-2 py-1 text-xs font-bold text-[#a85122]">
                                  PIN
                                </span>
                              )}
                              <span
                                className={`border px-2 py-1 text-xs font-bold ${
                                  memo.status === "done"
                                    ? "border-[#4c6b5b]/25 bg-[#eef7f1] text-[#386047]"
                                    : "border-[#d6a94f]/30 bg-[#fff8e8] text-[#8a671e]"
                                }`}
                              >
                                {memo.status === "done" ? "DONE" : "OPEN"}
                              </span>
                              <p className="text-xs text-[#66736a]">
                                更新 {formatDate(memo.updated_at)}
                              </p>
                            </div>
                            <h3 className="mt-3 break-words text-xl font-bold">
                              {memo.title}
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-[#4d584f]">
                              {memo.body}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <IconButton
                              label={memo.status === "done" ? "未完了に戻す" : "完了にする"}
                              onClick={() =>
                                updateMemo(memo.id, {
                                  status: memo.status === "done" ? "open" : "done",
                                })
                              }
                            >
                              {memo.status === "done" ? <CheckIcon /> : <CircleIcon />}
                            </IconButton>
                            <IconButton
                              label={memo.pinned ? "ピンを外す" : "ピン留め"}
                              onClick={() =>
                                updateMemo(memo.id, { pinned: !memo.pinned })
                              }
                            >
                              {memo.pinned ? <PinOffIcon /> : <PinIcon />}
                            </IconButton>
                            <IconButton label="編集" onClick={() => startEdit(memo)}>
                              <Edit3 className="h-5 w-5" aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              label="削除"
                              onClick={() => deleteMemo(memo.id)}
                              danger
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </IconButton>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {!isLoading && visibleMemos.length === 0 ? (
                  <div className="border border-dashed border-[#18201c]/20 bg-white p-8 text-center">
                    <p className="font-semibold">メモがありません</p>
                    <p className="mt-2 text-sm text-[#66736a]">
                      新しいメモを追加してください。
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#18201c]/10 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-[#66736a]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function IconButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center border transition ${
        danger
          ? "border-[#b94a48]/25 text-[#b94a48] hover:bg-[#fff0f0]"
          : "border-[#18201c]/15 hover:bg-[#eef2ef]"
      }`}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return <Check className="h-5 w-5" aria-hidden="true" />;
}

function CircleIcon() {
  return <Circle className="h-5 w-5" aria-hidden="true" />;
}

function PinIcon() {
  return <Pin className="h-5 w-5" aria-hidden="true" />;
}

function PinOffIcon() {
  return <PinOff className="h-5 w-5" aria-hidden="true" />;
}
