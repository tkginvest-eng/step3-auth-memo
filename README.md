# Step 3 Auth Memo

本番公開しながらアプリ開発を学ぶロードマップの Step 3 です。

## 目的

Step 2のCRUDメモアプリに、ログインとDB保存を追加します。

- Supabase Authでログインする
- ログインユーザーごとにメモを保存する
- Supabase DBにCRUDする
- Row Level Securityで他人のメモを見えないようにする

## 構成

```text
ユーザー
  ↓
Next.js画面
  ↓
Supabase Auth
  ↓
Supabase DB
  ↓
Row Level Security
```

## 使用技術

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Row Level Security
- lucide-react
- Vercel

## Supabaseセットアップ

1. Supabaseで新しいProjectを作成する
2. SQL Editorで `supabase/schema.sql` を実行する
3. Project Settings > API から以下を取得する
   - Project URL
   - anon public key
4. `.env.local` を作成する

```powershell
Copy-Item .env.example .env.local
```

`.env.local` に設定します。

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## ローカル起動

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

## 確認コマンド

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run build
```

## Vercel環境変数

Vercel Project Settings > Environment Variables に以下を設定します。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

設定後、再デプロイします。

## Step 3の完了条件

- メールアドレスとパスワードで登録できる
- ログインできる
- ログアウトできる
- ログインユーザーごとにメモを保存できる
- 他人のメモが見えない
- 本番ビルドが成功する
- GitHubにpushされている
- Vercelで公開されている
