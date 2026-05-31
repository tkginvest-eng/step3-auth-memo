"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("メール確認を処理しています...");

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      queueMicrotask(() => setMessage("Supabase環境変数が未設定です。"));
      return;
    }

    let cancelled = false;

    async function finishAuth() {
      const { data } = await supabase!.auth.getSession();

      if (cancelled) return;

      if (data.session) {
        setMessage("メール確認が完了しました。アプリへ戻ります。");
        window.setTimeout(() => {
          window.location.replace("/");
        }, 900);
      } else {
        setMessage("確認は完了しました。ログイン画面から再度ログインしてください。");
        window.setTimeout(() => {
          window.location.replace("/");
        }, 1600);
      }
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef2ef] px-5 text-[#18201c]">
      <section className="w-full max-w-md border border-[#18201c]/10 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center bg-[#f7faf7]">
          {message.includes("処理") ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#4c6b5b]" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-[#4c6b5b]" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-bold">メール確認</h1>
        <p className="mt-3 leading-7 text-[#4d584f]">{message}</p>
      </section>
    </main>
  );
}
