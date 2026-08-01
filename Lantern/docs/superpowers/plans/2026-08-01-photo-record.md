# 写真記録 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文章を書かなくても写真1枚で記録を残せるようにする。

**Architecture:** クライアントで画像を圧縮し、Flask 経由で Supabase Storage に保存する。写真のパスは `logs` テーブルの2カラムに持つ。`/save`（テキスト保存）は写真カラムに一切書き込まないことで、テキスト編集による写真の消失を構造的に防ぐ。

**Tech Stack:** Flask / supabase-py / React + Vite / Expo SDK 57（`expo-image-picker`, `expo-image-manipulator`）/ pytest / vitest

**Spec:** `docs/superpowers/specs/2026-08-01-photo-record-design.md`

---

## 前提（確認済み・作業不要）

- `logs.photo_path` / `logs.photo_thumb_path` は追加済み
- `lantern-photos` バケットは作成済み（非公開・1MB上限・`image/jpeg` のみ）
- サーバー経由でアップロードするため `storage.objects` の RLS ポリシーは不要

---

## ファイル構成

| ファイル | 責務 |
|---|---|
| `modules/photos.py`（新規） | Storage への保存・削除・署名付きURL発行。パス生成 |
| `modules/logs.py`（変更） | `_DB_SELECT` と `_from_db` に写真カラムを追加。`_to_db` には**追加しない**。削除時に Storage も消す |
| `main.py`（変更） | 写真の PUT / DELETE。`/api/logs` に署名付きURLを付与 |
| `modules/ai.py`（変更） | `_fmt_logs` が中身の無い記録をスキップ |
| `frontend/src/lib/image.js`（新規） | 縮小寸法の計算（純粋関数）と canvas による圧縮 |
| `mobile/lib/image.js`（新規） | 同上。**寸法計算部分は frontend と同一に保つ** |
| `frontend/src/components/PhotoPicker.jsx`（新規） | 選択・プレビュー・削除のUI |
| `mobile/components/PhotoPicker.jsx`（新規） | 同上（expo のAPIを使う） |
| 各記録フォーム・表示コンポーネント（変更） | ピッカーの設置、必須条件の変更、サムネイル表示 |

---

## Task 1: Storage のパス生成

**Files:**
- Create: `modules/photos.py`
- Test: `tests/test_photos.py`

- [ ] **Step 1: 失敗するテストを書く**

```python
"""modules/photos.py のテスト。

パスは必ずサーバー側で user_id と date から組み立てる。
クライアントから渡された文字列をパスに使うと、他ユーザーの
ファイルを指定される経路ができてしまう。
"""

import pytest

from modules.photos import build_photo_path, build_thumb_path, BUCKET


class TestBuildPath:
    def test_本体のパスはuser_idとdateから決まる(self):
        assert build_photo_path("abc-123", "2026-08-01") == "abc-123/2026-08-01.jpg"

    def test_サムネイルのパスは_thumb_が付く(self):
        assert build_thumb_path("abc-123", "2026-08-01") == "abc-123/2026-08-01_thumb.jpg"

    def test_バケット名は定数で持つ(self):
        assert BUCKET == "lantern-photos"

    @pytest.mark.parametrize("bad_date", [
        "../../etc/passwd", "2026-08-01/../x", "..", "a/b", "2026-08-01.jpg",
    ])
    def test_不正な日付は拒否する(self, bad_date):
        # パス区切りや相対参照を含む値でディレクトリを抜けられないようにする
        with pytest.raises(ValueError):
            build_photo_path("abc-123", bad_date)

    @pytest.mark.parametrize("bad_user", ["../other", "a/b", "", None])
    def test_不正なuser_idは拒否する(self, bad_user):
        with pytest.raises(ValueError):
            build_photo_path(bad_user, "2026-08-01")

    def test_日付の形式はYYYY_MM_DDのみ(self):
        with pytest.raises(ValueError):
            build_photo_path("abc-123", "2026-8-1")
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_photos.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'modules.photos'`

- [ ] **Step 3: 最小限の実装**

Create `modules/photos.py`:

```python
"""写真の保存先の管理。

パスは必ず user_id と date から組み立てる。
クライアントから受け取った文字列をそのままパスに使わない。
"""

import re

BUCKET = "lantern-photos"

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# user_id は Supabase Auth の UUID。区切り文字や相対参照を含まないことだけ確認する。
_USER_ID_RE = re.compile(r"^[A-Za-z0-9\-_]+$")


def _validate(user_id, date):
    if not user_id or not _USER_ID_RE.match(str(user_id)):
        raise ValueError(f"不正な user_id: {user_id!r}")
    if not date or not _DATE_RE.match(str(date)):
        raise ValueError(f"不正な date: {date!r}")


def build_photo_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}.jpg"


def build_thumb_path(user_id, date):
    _validate(user_id, date)
    return f"{user_id}/{date}_thumb.jpg"
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/test_photos.py -q`
Expected: PASS（13件）

- [ ] **Step 5: コミット**

```bash
git add Lantern/modules/photos.py Lantern/tests/test_photos.py
git commit -m "feat: 写真のStorageパス生成を追加する"
```

---

## Task 2: Storage への保存・削除・URL発行

**Files:**
- Modify: `modules/photos.py`
- Test: `tests/test_photos.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/test_photos.py` の末尾に追記:

```python
class _FakeStorageBucket:
    """supabase.storage.from_(BUCKET) の代わり。呼ばれた内容だけ記録する。"""

    def __init__(self):
        self.uploaded = []
        self.removed = []
        self.signed = []

    def upload(self, path, file, file_options=None):
        self.uploaded.append({"path": path, "file": file, "options": file_options})

    def remove(self, paths):
        self.removed.append(paths)

    def create_signed_url(self, path, expires_in):
        self.signed.append({"path": path, "expires_in": expires_in})
        return {"signedURL": f"https://example.test/{path}?token=dummy"}


class _FakeStorage:
    def __init__(self, bucket):
        self._bucket = bucket

    def from_(self, name):
        assert name == BUCKET
        return self._bucket


class _FakeSupabase:
    def __init__(self, bucket):
        self.storage = _FakeStorage(bucket)


class TestSaveAndDelete:
    def test_本体とサムネイルを両方アップロードする(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        paths = photos.save_photo("abc-123", "2026-08-01", b"photo-bytes", b"thumb-bytes")

        assert paths == ("abc-123/2026-08-01.jpg", "abc-123/2026-08-01_thumb.jpg")
        assert [u["path"] for u in bucket.uploaded] == [
            "abc-123/2026-08-01.jpg",
            "abc-123/2026-08-01_thumb.jpg",
        ]

    def test_撮り直しは上書きになる(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        photos.save_photo("abc-123", "2026-08-01", b"x", b"y")

        # 1記録1枚なので同じパスに上書きする。upsert を有効にしないと409になる
        assert bucket.uploaded[0]["options"]["upsert"] == "true"

    def test_content_typeをjpegで指定する(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        photos.save_photo("abc-123", "2026-08-01", b"x", b"y")

        # バケットが image/jpeg のみ許可しているため、未指定だと拒否される
        assert bucket.uploaded[0]["options"]["content-type"] == "image/jpeg"

    def test_削除は本体とサムネイルの両方を消す(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        photos.delete_photo("abc-123", "2026-08-01")

        assert bucket.removed == [[
            "abc-123/2026-08-01.jpg",
            "abc-123/2026-08-01_thumb.jpg",
        ]]

    def test_署名付きURLを発行する(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        url = photos.signed_url("abc-123/2026-08-01.jpg")

        assert url.startswith("https://example.test/")
        assert bucket.signed[0]["expires_in"] == 3600

    def test_パスがNoneならURLもNone(self, monkeypatch):
        from modules import photos
        bucket = _FakeStorageBucket()
        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(bucket))

        assert photos.signed_url(None) is None
        assert photos.signed_url("") is None
        assert bucket.signed == []

    def test_削除の失敗は握り潰さずログに出す(self, monkeypatch, capsys):
        from modules import photos

        class _Failing(_FakeStorageBucket):
            def remove(self, paths):
                raise RuntimeError("storage down")

        monkeypatch.setattr(photos, "_client", lambda: _FakeSupabase(_Failing()))

        # 呼び出し元（記録の削除）を巻き添えにしないため例外は外に出さない
        photos.delete_photo("abc-123", "2026-08-01")
        assert "写真の削除に失敗" in capsys.readouterr().out
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_photos.py -q`
Expected: FAIL — `AttributeError: module 'modules.photos' has no attribute '_client'`

- [ ] **Step 3: 実装を追記**

`modules/photos.py` の末尾に追記:

```python
_SIGNED_URL_TTL_SECONDS = 3600


def _client():
    """Supabase クライアントを返す。テストで差し替えられるよう関数にしている。"""
    from modules.logs import supabase
    return supabase


def save_photo(user_id, date, photo_bytes, thumb_bytes):
    """本体とサムネイルを保存し (本体パス, サムネイルパス) を返す。"""
    photo_path = build_photo_path(user_id, date)
    thumb_path = build_thumb_path(user_id, date)

    # 1記録1枚なので同じパスへの上書きが正常系。
    # content-type はバケットが image/jpeg のみ許可しているため必須。
    options = {"content-type": "image/jpeg", "upsert": "true"}

    bucket = _client().storage.from_(BUCKET)
    bucket.upload(photo_path, photo_bytes, file_options=options)
    bucket.upload(thumb_path, thumb_bytes, file_options=options)
    return photo_path, thumb_path


def delete_photo(user_id, date):
    """本体とサムネイルを削除する。

    記録の削除に巻き込まれて500にならないよう、失敗しても例外は外に出さない。
    ただしログには残す（孤児ファイルに気づけるようにするため）。
    """
    try:
        paths = [build_photo_path(user_id, date), build_thumb_path(user_id, date)]
        _client().storage.from_(BUCKET).remove(paths)
    except Exception as e:
        print(f"[Photo] 写真の削除に失敗 user={user_id} date={date}: {type(e).__name__}: {e}")


def signed_url(path):
    """署名付きURLを発行する。パスが無ければ None。

    URLはDBに保存しない。期限が切れて壊れるため、読み出しのたびに発行する。
    """
    if not path:
        return None
    try:
        res = _client().storage.from_(BUCKET).create_signed_url(path, _SIGNED_URL_TTL_SECONDS)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl")
        return getattr(res, "signedURL", None)
    except Exception as e:
        print(f"[Photo] 署名付きURLの発行に失敗 path={path}: {type(e).__name__}: {e}")
        return None
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/test_photos.py -q`
Expected: PASS（20件）

- [ ] **Step 5: コミット**

```bash
git add Lantern/modules/photos.py Lantern/tests/test_photos.py
git commit -m "feat: 写真のStorage保存・削除・署名付きURL発行を追加する"
```

---

## Task 3: `_to_db` に写真を書かせない（本設計の核心）

**Files:**
- Modify: `modules/logs.py`
- Test: `tests/test_logs_mapping.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/test_logs_mapping.py` の末尾に追記:

```python
class TestPhotoColumns:
    """写真カラムの扱い。

    /save は受け取ったデータから entry を作り直すため、_to_db が写真を
    書くようにするとテキスト編集だけで写真が消える。
    そのため _to_db は写真カラムを一切出力しない。
    """

    def test_from_dbは写真パスを変換する(self):
        row = {**DB_ROW, "photo_path": "u/2026-08-01.jpg", "photo_thumb_path": "u/2026-08-01_thumb.jpg"}
        result = _from_db(row)
        assert result["photo_path"] == "u/2026-08-01.jpg"
        assert result["photo_thumb_path"] == "u/2026-08-01_thumb.jpg"

    def test_写真がなければ空文字になる(self):
        result = _from_db(DB_ROW)
        assert result["photo_path"] == ""
        assert result["photo_thumb_path"] == ""

    def test_to_dbは写真カラムを出力しない(self):
        # ここが崩れると、テキスト編集のたびに写真が消える
        row = _to_db({**APP_LOG, "photo_path": "u/x.jpg", "photo_thumb_path": "u/x_thumb.jpg"}, "abc-123")
        assert "photo_path" not in row
        assert "photo_thumb_path" not in row

    def test_to_dbの出力キーは固定(self):
        assert set(_to_db(APP_LOG, "abc-123").keys()) == {
            "date", "content", "good_things", "struggles",
            "next_action", "lantern_message", "updated_at", "user_id",
        }
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_logs_mapping.py -q`
Expected: FAIL — `KeyError: 'photo_path'`

- [ ] **Step 3: 実装**

`modules/logs.py` の `_DB_SELECT` を変更（写真カラムを追加しないと読み出せない）:

```python
_DB_SELECT = (
    "id, date, content, next_action, good_things, struggles, "
    "lantern_message, updated_at, user_id, photo_path, photo_thumb_path"
)
```

`_from_db` に2行追加:

```python
def _from_db(row):
    return {
        "date": str(row.get("date", "")),
        "created": row.get("content", ""),
        "enjoyable": row.get("good_things", ""),
        "struggled": row.get("struggles", ""),
        "next": row.get("next_action", ""),
        "saved_at": row.get("updated_at", "") or "",
        "ai_response": row.get("lantern_message", ""),
        "photo_path": row.get("photo_path", "") or "",
        "photo_thumb_path": row.get("photo_thumb_path", "") or "",
    }
```

`_to_db` は**変更しない**。写真カラムを追加しないことが仕様である。
その意図をコメントで残す:

```python
def _to_db(l, user_id=None):
    # 写真カラム（photo_path / photo_thumb_path）は意図的に含めない。
    # /save は受け取ったデータから entry を作り直すため、ここに写真を足すと
    # テキストだけを編集したときに写真が消える。
    # 写真の更新は main.py の /api/logs/<date>/photo だけが行う。
    return {
        "date": l.get("date", ""),
        ...
    }
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/test_logs_mapping.py -q`
Expected: PASS（27件）

- [ ] **Step 5: 変異テストで実効性を確認**

`_to_db` に `"photo_path": l.get("photo_path", "")` を一時的に足し、
`test_to_dbは写真カラムを出力しない` と `test_to_dbの出力キーは固定` が
落ちることを確認してから元に戻す。

- [ ] **Step 6: コミット**

```bash
git add Lantern/modules/logs.py Lantern/tests/test_logs_mapping.py
git commit -m "feat: logs の写真カラムを読み出しに追加する（_to_dbには含めない）"
```

---

## Task 4: 記録削除時に Storage も消す

**Files:**
- Modify: `modules/logs.py:84-90`
- Test: `tests/test_logs_mapping.py`

- [ ] **Step 1: 失敗するテストを書く**

```python
class TestDeleteLogRemovesPhoto:
    def test_記録を削除するとStorageの写真も消す(self, monkeypatch):
        # ON DELETE CASCADE はDBの行しか消さない。
        # Storage を消さないと、消したはずの写真が容量を食い続ける。
        from modules import logs as logs_mod
        called = []
        monkeypatch.setattr(logs_mod, "supabase", None)
        monkeypatch.setattr(
            "modules.photos.delete_photo",
            lambda user_id, date: called.append((user_id, date)),
        )

        logs_mod.delete_log_by_date("2026-08-01", "abc-123")

        assert called == [("abc-123", "2026-08-01")]
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_logs_mapping.py::TestDeleteLogRemovesPhoto -q`
Expected: FAIL — `assert [] == [('abc-123', '2026-08-01')]`

- [ ] **Step 3: 実装**

`modules/logs.py` の `delete_log_by_date` を変更:

```python
def delete_log_by_date(date, user_id=None):
    # Storage は DB の CASCADE では消えないため明示的に削除する。
    # supabase が未設定でも写真の削除は試みる（テスト容易性のため先に呼ぶ）。
    if user_id:
        from modules.photos import delete_photo
        delete_photo(user_id, date)

    if not supabase:
        return
    q = supabase.table("logs").delete().eq("date", date)
    if user_id:
        q = q.eq("user_id", user_id)
    q.execute()
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/ -q`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

```bash
git add Lantern/modules/logs.py Lantern/tests/test_logs_mapping.py
git commit -m "fix: 記録の削除でStorageの写真も消すようにする"
```

---

## Task 5: `_fmt_logs` が中身の無い記録を渡さない

**Files:**
- Modify: `modules/ai.py:188-196`
- Test: `tests/test_ai_parsing.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/test_ai_parsing.py` の `TestFmtLogs` に追記:

```python
    def test_全項目が空の記録はスキップする(self):
        # 写真だけの記録。「2026-08-01: 」という中身の無い行をAIに渡さない
        logs = [
            {"date": "2026-08-01", "created": "", "enjoyable": "", "struggled": "", "next": ""},
            {"date": "2026-08-02", "created": "曲を書いた"},
        ]
        assert _fmt_logs(logs) == "\n2026-08-02: 曲を書いた"

    def test_全部が空の記録だけなら空文字(self):
        logs = [{"date": "2026-08-01", "created": ""}]
        assert _fmt_logs(logs) == ""

    def test_createdが空でも他が埋まっていれば残す(self):
        logs = [{"date": "2026-08-01", "created": "", "enjoyable": "静かな朝"}]
        result = _fmt_logs(logs)
        assert "2026-08-01" in result
        assert "静かな朝" in result
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_ai_parsing.py -q`
Expected: FAIL — 空の記録が出力に含まれる

- [ ] **Step 3: 実装**

`modules/ai.py` の `_fmt_logs` を変更:

```python
def _fmt_logs(logs):
    text = ""
    for log in logs:
        # 写真だけの記録は本文が空になる。中身の無い行をAIに渡すと
        # 「2026-08-01: 」という無意味な入力になるためスキップする。
        if not any(log.get(k) for k in ("created", "enjoyable", "struggled", "next")):
            continue
        text += f"\n{log['date']}: {log.get('created', '')}"
        if log.get("enjoyable"):
            text += f"（楽しかったこと: {log['enjoyable']}）"
        if log.get("struggled"):
            text += f"（困ったこと: {log['struggled']}）"
    return text
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/test_ai_parsing.py -q`
Expected: PASS（22件）

- [ ] **Step 5: コミット**

```bash
git add Lantern/modules/ai.py Lantern/tests/test_ai_parsing.py
git commit -m "fix: 写真のみの記録をAIへの整形から除外する"
```

---

## Task 6: 写真の PUT / DELETE エンドポイント

**Files:**
- Modify: `main.py`
- Test: `tests/test_photo_routes.py`

- [ ] **Step 1: 失敗するテストを書く**

Create `tests/test_photo_routes.py`:

```python
"""写真エンドポイントの認証ガードのテスト。

実際のアップロードは Storage に依存するため、ここでは
「認証で守られていること」と「ルートが存在すること」を固定する。
"""

import pytest

from main import app


@pytest.fixture
def client():
    return app.test_client()


class TestPhotoRoutesAuth:
    def test_PUTは認証なしで401(self, client):
        assert client.put("/api/logs/2026-08-01/photo").status_code == 401

    def test_DELETEは認証なしで401(self, client):
        assert client.delete("/api/logs/2026-08-01/photo").status_code == 401

    def test_不正なトークンでも401(self, client):
        headers = {"Authorization": "Bearer not-a-jwt"}
        assert client.put("/api/logs/2026-08-01/photo", headers=headers).status_code == 401
        assert client.delete("/api/logs/2026-08-01/photo", headers=headers).status_code == 401

    def test_ルートが登録されている(self):
        paths = {str(r) for r in app.url_map.iter_rules()}
        assert "/api/logs/<date>/photo" in paths
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_photo_routes.py -q`
Expected: FAIL — 404 が返る（ルート未実装）

- [ ] **Step 3: 実装**

`main.py` の `delete_log` の直後に追加:

```python
@app.route("/api/logs/<date>/photo", methods=["PUT"])
@require_auth
def upload_log_photo(date):
    """圧縮済みの写真とサムネイルを受け取り、Storageに保存してDBに記録する。

    パスは g.user_id と date から組み立てる。クライアントからパスは受け取らない。
    """
    from modules.photos import save_photo

    photo = request.files.get("photo")
    thumb = request.files.get("thumb")
    if not photo or not thumb:
        return jsonify({"error": "photo と thumb の両方が必要です"}), 400

    try:
        photo_path, thumb_path = save_photo(g.user_id, date, photo.read(), thumb.read())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"[Photo] アップロードに失敗 user={g.user_id} date={date}: {type(e).__name__}: {e}")
        return jsonify({"error": "写真の保存に失敗しました"}), 500

    try:
        _set_photo_paths(g.user_id, date, photo_path, thumb_path)
    except Exception as e:
        print(f"[Photo] DB更新に失敗 user={g.user_id} date={date}: {type(e).__name__}: {e}")
        return jsonify({"error": "写真の保存に失敗しました"}), 500

    from modules.photos import signed_url
    return jsonify({
        "photo_url": signed_url(photo_path),
        "photo_thumb_url": signed_url(thumb_path),
    })


@app.route("/api/logs/<date>/photo", methods=["DELETE"])
@require_auth
def delete_log_photo(date):
    from modules.photos import delete_photo

    delete_photo(g.user_id, date)
    try:
        _set_photo_paths(g.user_id, date, None, None)
    except Exception as e:
        print(f"[Photo] DB更新に失敗 user={g.user_id} date={date}: {type(e).__name__}: {e}")
        return jsonify({"error": "写真の削除に失敗しました"}), 500
    return jsonify({"status": "ok"})
```

`modules/logs.py` に写真パスだけを更新する関数を追加:

```python
def set_photo_paths(user_id, date, photo_path, thumb_path):
    """写真カラムだけを更新する。テキストには触らない。

    該当日の記録が無ければ作る（写真だけで記録を成立させるため）。
    """
    if not supabase:
        return
    fields = {"photo_path": photo_path, "photo_thumb_path": thumb_path}
    existing = (
        supabase.table("logs").select("id")
        .eq("date", date).eq("user_id", user_id).execute()
    )
    if existing.data:
        supabase.table("logs").update(fields).eq("date", date).eq("user_id", user_id).execute()
    else:
        supabase.table("logs").insert({
            "date": date,
            "user_id": user_id,
            "updated_at": datetime.now().isoformat(),
            **fields,
        }).execute()
```

`main.py` の import に追加し、`_set_photo_paths` として使う:

```python
from modules.logs import (
    load_logs, save_logs,
    load_goals,
    delete_log_by_date,
    load_daily_quote, save_daily_quote,
    set_photo_paths as _set_photo_paths,
)
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/test_photo_routes.py -q`
Expected: PASS（6件）

- [ ] **Step 5: 認証テストの許可リストが変わらないことを確認**

Run: `python -m pytest tests/test_route_auth.py -q`
Expected: PASS — 新ルートは `@require_auth` 付きなので公開ルートは増えない

- [ ] **Step 6: コミット**

```bash
git add Lantern/main.py Lantern/modules/logs.py Lantern/tests/test_photo_routes.py
git commit -m "feat: 写真のアップロード・削除エンドポイントを追加する"
```

---

## Task 7: `/api/logs` に署名付きURLを付与

**Files:**
- Modify: `main.py`（`get_logs_api`）
- Test: `tests/test_photo_routes.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/test_photo_routes.py` に追記:

```python
class TestAttachUrls:
    def test_写真パスがあれば署名付きURLを付ける(self, monkeypatch):
        import main
        monkeypatch.setattr(
            "modules.photos.signed_url",
            lambda path: f"https://example.test/{path}" if path else None,
        )
        logs = [{"date": "2026-08-01", "photo_path": "u/a.jpg", "photo_thumb_path": "u/a_thumb.jpg"}]

        result = main._attach_photo_urls(logs)

        assert result[0]["photo_url"] == "https://example.test/u/a.jpg"
        assert result[0]["photo_thumb_url"] == "https://example.test/u/a_thumb.jpg"

    def test_写真がなければURLはNone(self, monkeypatch):
        import main
        monkeypatch.setattr("modules.photos.signed_url", lambda path: None)
        logs = [{"date": "2026-08-01", "photo_path": "", "photo_thumb_path": ""}]

        result = main._attach_photo_urls(logs)

        assert result[0]["photo_url"] is None
        assert result[0]["photo_thumb_url"] is None

    def test_パスそのものは返さない(self, monkeypatch):
        # 内部のStorageパスをクライアントに渡す必要はない
        import main
        monkeypatch.setattr("modules.photos.signed_url", lambda path: "https://example.test/x")
        logs = [{"date": "2026-08-01", "photo_path": "u/a.jpg", "photo_thumb_path": "u/a_thumb.jpg"}]

        result = main._attach_photo_urls(logs)

        assert "photo_path" not in result[0]
        assert "photo_thumb_path" not in result[0]
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `python -m pytest tests/test_photo_routes.py -q`
Expected: FAIL — `AttributeError: module 'main' has no attribute '_attach_photo_urls'`

- [ ] **Step 3: 実装**

`main.py` の `get_logs_api` の直前に追加:

```python
def _attach_photo_urls(logs):
    """写真パスを署名付きURLに変換して返す。

    URLは期限付きのためDBに保存せず、読み出しのたびに発行する。
    内部のStorageパスはクライアントに渡さない。
    """
    from modules.photos import signed_url

    result = []
    for log in logs:
        entry = {k: v for k, v in log.items() if k not in ("photo_path", "photo_thumb_path")}
        entry["photo_url"] = signed_url(log.get("photo_path"))
        entry["photo_thumb_url"] = signed_url(log.get("photo_thumb_path"))
        result.append(entry)
    return result
```

`get_logs_api` を変更:

```python
@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs_api():
    logs = load_logs(g.user_id)
    return jsonify(_attach_photo_urls(logs))
```

- [ ] **Step 4: テストが通ることを確認**

Run: `python -m pytest tests/ -q`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

```bash
git add Lantern/main.py Lantern/tests/test_photo_routes.py
git commit -m "feat: /api/logs に写真の署名付きURLを付与する"
```

---

## Task 8: 縮小寸法の計算（Web）

**Files:**
- Create: `frontend/src/lib/image.js`
- Test: `frontend/src/lib/image.test.js`

- [ ] **Step 1: 失敗するテストを書く**

Create `frontend/src/lib/image.test.js`:

```javascript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { fitWithin, PHOTO_MAX_EDGE, THUMB_MAX_EDGE } from './image'

describe('fitWithin', () => {
  it('横長は幅が上限になる', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('縦長は高さが上限になる', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('正方形は両辺が上限になる', () => {
    expect(fitWithin(2000, 2000, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('上限より小さい画像は拡大しない', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('ちょうど上限ならそのまま', () => {
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('整数に丸める', () => {
    const { width, height } = fitWithin(1000, 333, 500)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('丸めても0にならない', () => {
    // 極端な縦横比でも 0px にすると canvas が例外を投げる
    expect(fitWithin(10000, 5, 1600).height).toBeGreaterThanOrEqual(1)
  })

  it('上限の定数', () => {
    expect(PHOTO_MAX_EDGE).toBe(1600)
    expect(THUMB_MAX_EDGE).toBe(400)
  })
})

describe('frontend と mobile の image.js', () => {
  it('寸法計算の部分が一致している', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const read = (p) => readFileSync(resolve(here, p), 'utf8').replace(/\r\n/g, '\n')
    const extract = (src) => src.slice(src.indexOf('// --- 寸法計算 ---'), src.indexOf('// --- ここまで ---'))
    expect(extract(read('./image.js'))).toBe(extract(read('../../../mobile/lib/image.js')))
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npx vitest run src/lib/image.test.js`
Expected: FAIL — `Failed to resolve import "./image"`

- [ ] **Step 3: 実装**

Create `frontend/src/lib/image.js`:

```javascript
// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。

// --- 寸法計算 ---
// この区間は frontend/src/lib/image.js と mobile/lib/image.js で同一に保つこと。
// image.test.js が一致を検証している。

export const PHOTO_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 400
export const PHOTO_QUALITY = 0.8
export const THUMB_QUALITY = 0.7

// 縦横比を保ったまま長辺を maxEdge に収める。元が小さければ拡大しない。
export function fitWithin(width, height, maxEdge) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
// --- ここまで ---

// File を指定サイズのJPEG Blobに変換する。
async function toJpegBlob(file, maxEdge, quality) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の変換に失敗しました'))),
      'image/jpeg',
      quality
    )
  })
}

// 本体とサムネイルの2つを作る。
export async function compressPhoto(file) {
  const [photo, thumb] = await Promise.all([
    toJpegBlob(file, PHOTO_MAX_EDGE, PHOTO_QUALITY),
    toJpegBlob(file, THUMB_MAX_EDGE, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
```

- [ ] **Step 4: mobile 側を作って一致させる**

Create `mobile/lib/image.js`（寸法計算区間は上と完全に同一。圧縮のみ expo のAPIを使う）:

```javascript
// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

// --- 寸法計算 ---
// この区間は frontend/src/lib/image.js と mobile/lib/image.js で同一に保つこと。
// image.test.js が一致を検証している。

export const PHOTO_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 400
export const PHOTO_QUALITY = 0.8
export const THUMB_QUALITY = 0.7

// 縦横比を保ったまま長辺を maxEdge に収める。元が小さければ拡大しない。
export function fitWithin(width, height, maxEdge) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
// --- ここまで ---

// SDK 57 では manipulateAsync() が非推奨。
// manipulate() → resize() → renderAsync() → saveAsync() のビルダー型APIを使う。
async function toJpeg(uri, width, height, quality) {
  const context = ImageManipulator.manipulate(uri)
  context.resize({ width, height })
  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality })
  return result.uri
}

export async function compressPhoto(uri, originalWidth, originalHeight) {
  const p = fitWithin(originalWidth, originalHeight, PHOTO_MAX_EDGE)
  const t = fitWithin(originalWidth, originalHeight, THUMB_MAX_EDGE)
  const [photo, thumb] = await Promise.all([
    toJpeg(uri, p.width, p.height, PHOTO_QUALITY),
    toJpeg(uri, t.width, t.height, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `cd frontend && npx vitest run`
Expected: PASS（62件）

- [ ] **Step 6: コミット**

```bash
git add Lantern/frontend/src/lib/image.js Lantern/frontend/src/lib/image.test.js Lantern/mobile/lib/image.js
git commit -m "feat: 写真圧縮の寸法計算を追加する（frontend/mobile 共通）"
```

---

## Task 9: mobile に画像パッケージを追加

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: SDK 57 に対応したバージョンで導入する**

```bash
cd Lantern/mobile && npx expo install expo-image-picker expo-image-manipulator
```

`expo install` を使うこと。`npm install` だと SDK 57 と非互換のバージョンが入る。

- [ ] **Step 2: バンドルできることを確認**

Run: `cd Lantern/mobile && npx expo export --platform web --clear`
Expected: `Exported: dist`（エラーなし）

- [ ] **Step 3: コミット**

```bash
git add Lantern/mobile/package.json Lantern/mobile/package-lock.json
git commit -m "chore: mobile に expo-image-picker と expo-image-manipulator を追加する"
```

---

## Task 10: PhotoPicker（Web）

**Files:**
- Create: `frontend/src/components/PhotoPicker.jsx`

- [ ] **Step 1: 実装**

```jsx
import { useRef, useState } from 'react'
import { compressPhoto } from '../lib/image'

// 記録に添える写真の選択・プレビュー・削除。
// 1記録1枚。選び直しは同じ枠を置き換える。
export default function PhotoPicker({ photoUrl, onSelect, onRemove, disabled }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setBusy(true)
    setError('')
    try {
      const { photo, thumb } = await compressPhoto(file)
      await onSelect(photo, thumb)
    } catch (err) {
      console.warn('[Photo] 写真の処理に失敗', err)
      setError('写真を読み込めませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {photoUrl ? (
        <div className="relative">
          <img src={photoUrl} alt="" className="w-full rounded-lg object-cover max-h-64" />
          <div className="flex justify-end gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
              className="text-xs text-ink-faint hover:text-forest transition-colors disabled:opacity-50"
            >
              選び直す
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled || busy}
              className="text-xs text-ink-faint hover:text-red-500 transition-colors disabled:opacity-50"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className="w-full border border-border border-dashed rounded-lg py-4 text-xs text-ink-faint hover:text-forest hover:border-sage/40 transition-colors disabled:opacity-50"
        >
          {busy ? '読み込み中...' : '写真を追加'}
        </button>
      )}

      {error && <p className="text-xs text-ink-faint">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: lint が通ることを確認**

Run: `cd frontend && npx eslint src/components/PhotoPicker.jsx`
Expected: エラー0・警告0

- [ ] **Step 3: コミット**

```bash
git add Lantern/frontend/src/components/PhotoPicker.jsx
git commit -m "feat: Web の写真ピッカーを追加する"
```

---

## Task 11: PhotoPicker（mobile）

**Files:**
- Create: `mobile/components/PhotoPicker.jsx`

- [ ] **Step 1: 実装**

```jsx
import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { compressPhoto } from '../lib/image'

// Web版 components/PhotoPicker.jsx と同じ役割。
// SDK 57 では MediaTypeOptions が非推奨のため mediaTypes に配列を渡す。
export default function PhotoPicker({ photoUrl, onSelect, onRemove, disabled }) {
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handlePick() {
    setError('')
    if (!status?.granted) {
      const next = await requestPermission()
      if (!next.granted) {
        setError('写真へのアクセスが許可されていません。')
        return
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
    })
    if (result.canceled) return

    const asset = result.assets[0]
    setBusy(true)
    try {
      const { photo, thumb } = await compressPhoto(asset.uri, asset.width, asset.height)
      await onSelect(photo, thumb)
    } catch (e) {
      console.warn('[Photo] 写真の処理に失敗', e)
      setError('写真を読み込めませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="gap-2">
      {photoUrl ? (
        <View>
          <Image
            source={{ uri: photoUrl }}
            className="w-full rounded-lg"
            style={{ height: 200 }}
            resizeMode="cover"
          />
          <View className="flex-row justify-end gap-4 mt-1.5">
            <Pressable onPress={handlePick} disabled={disabled || busy}>
              <Text className="text-xs text-ink-faint">選び直す</Text>
            </Pressable>
            <Pressable onPress={onRemove} disabled={disabled || busy}>
              <Text className="text-xs text-ink-faint">削除</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePick}
          disabled={disabled || busy}
          className="border border-border border-dashed rounded-lg py-4 items-center"
        >
          <Text className="text-xs text-ink-faint">{busy ? '読み込み中...' : '写真を追加'}</Text>
        </Pressable>
      )}

      {error ? <Text className="text-xs text-ink-faint">{error}</Text> : null}
    </View>
  )
}
```

- [ ] **Step 2: バンドルできることを確認**

Run: `cd Lantern/mobile && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 3: コミット**

```bash
git add Lantern/mobile/components/PhotoPicker.jsx
git commit -m "feat: mobile の写真ピッカーを追加する"
```

---

## Task 12: アップロード用の共通処理

**Files:**
- Modify: `frontend/src/lib/supabase.js`
- Modify: `mobile/lib/supabase.js`

- [ ] **Step 1: Web に追加**

`frontend/src/lib/supabase.js` の末尾に追加:

```javascript
// FormData を送るとき Content-Type を自前で付けてはいけない。
// 境界文字列はブラウザが付けるため、authFetch の既定ヘッダを打ち消す。
export async function uploadPhoto(date, photoBlob, thumbBlob) {
  const body = new FormData()
  body.append('photo', photoBlob, 'photo.jpg')
  body.append('thumb', thumbBlob, 'thumb.jpg')

  const res = await authFetch(`/api/logs/${date}/photo`, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': undefined },
  })
  if (!res.ok) throw new Error(`upload failed: ${res.status}`)
  return res.json()
}

export async function removePhoto(date) {
  const res = await authFetch(`/api/logs/${date}/photo`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete failed: ${res.status}`)
  return res.json()
}
```

`authFetch` のヘッダ組み立てを、`undefined` を渡したら外れるように変更:

```javascript
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  // Content-Type: undefined が渡されたらヘッダごと落とす（FormData用）
  Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k])
```

- [ ] **Step 2: mobile に追加**

`mobile/lib/supabase.js` に同じ2関数を追加する。
ただし React Native の FormData はファイルを `{ uri, name, type }` の形で受け取る:

```javascript
export async function uploadPhoto(date, photoUri, thumbUri) {
  const body = new FormData()
  body.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' })
  body.append('thumb', { uri: thumbUri, name: 'thumb.jpg', type: 'image/jpeg' })

  const res = await authFetch(`/api/logs/${date}/photo`, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': undefined },
  })
  if (!res.ok) throw new Error(`upload failed: ${res.status}`)
  return res.json()
}

export async function removePhoto(date) {
  const res = await authFetch(`/api/logs/${date}/photo`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete failed: ${res.status}`)
  return res.json()
}
```

`authFetch` にも同じ `undefined` 除去を入れる。

- [ ] **Step 3: ビルドを確認**

Run: `cd frontend && npm run build`
Expected: 成功

Run: `cd Lantern/mobile && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 4: コミット**

```bash
git add Lantern/frontend/src/lib/supabase.js Lantern/mobile/lib/supabase.js
git commit -m "feat: 写真のアップロード・削除ヘルパーを追加する"
```

---

## Task 13: 記録モーダルに写真を組み込む（Web）

**Files:**
- Modify: `frontend/src/pages/Journal.jsx`

- [ ] **Step 1: 保存条件を変更する**

`handleModalSave` の先頭と保存ボタンの `disabled` を変更:

```javascript
  // テキストか写真のどちらかがあれば保存できる。
  // 「写真だけで残せる」ことが本機能の目的のため、created 必須をやめる。
  const canSaveModal = Boolean(modalForm.created.trim() || modalPhotoUrl)
```

`handleModalSave` の `if (!modalForm.created.trim()) return` を
`if (!canSaveModal) return` に置き換える。

保存ボタン: `disabled={modalSaving || !canSaveModal}`

- [ ] **Step 2: 写真の状態とハンドラを追加**

```javascript
  const [modalPhotoUrl, setModalPhotoUrl] = useState(null)

  async function handleModalPhotoSelect(photo, thumb) {
    const data = await uploadPhoto(modalDate, photo, thumb)
    setModalPhotoUrl(data.photo_url)
    setLogs(prev => {
      const found = prev.find(l => l.date === modalDate)
      if (found) {
        return prev.map(l => (l.date === modalDate ? { ...l, ...data } : l))
      }
      return [...prev, { date: modalDate, created: '', enjoyable: '', struggled: '', next: '', ...data }]
    })
  }

  async function handleModalPhotoRemove() {
    await removePhoto(modalDate)
    setModalPhotoUrl(null)
    setLogs(prev => prev.map(l =>
      l.date === modalDate ? { ...l, photo_url: null, photo_thumb_url: null } : l
    ))
  }
```

モーダルを開くとき（`handleDateClick`）と閉じるときに `setModalPhotoUrl(null)` する。

- [ ] **Step 3: ピッカーを設置**

モーダルの入力欄の下に追加:

```jsx
<PhotoPicker
  photoUrl={modalPhotoUrl}
  onSelect={handleModalPhotoSelect}
  onRemove={handleModalPhotoRemove}
  disabled={modalSaving}
/>
```

import を追加:

```javascript
import PhotoPicker from '../components/PhotoPicker'
import { uploadPhoto, removePhoto } from '../lib/supabase'
```

- [ ] **Step 4: lint とビルドを確認**

Run: `cd frontend && npx eslint src && npm run build`
Expected: エラー0、ビルド成功

- [ ] **Step 5: コミット**

```bash
git add Lantern/frontend/src/pages/Journal.jsx
git commit -m "feat: Web の記録モーダルで写真を扱えるようにする"
```

---

## Task 14: 残りの表示箇所（Web）

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/components/LogDetail.jsx`
- Modify: `frontend/src/components/LogItem.jsx`
- Modify: `frontend/src/components/LogSnapshot.jsx`

- [ ] **Step 1: LogItem にサムネイルを出す**

`LogItem` の見出し行に追加:

```jsx
{log.photo_thumb_url && (
  <img src={log.photo_thumb_url} alt="" className="w-8 h-8 rounded object-cover shrink-0 mr-2" />
)}
```

- [ ] **Step 2: LogDetail に写真と操作を出す**

`displayFields` の表示の後、AIの観察の前に `PhotoPicker` を置く。
`onSelect` / `onRemove` は `uploadPhoto(log.date, ...)` / `removePhoto(log.date)` を呼び、
成功したら `onUpdate({ ...log, ...data })` で親に反映する。

- [ ] **Step 3: LogSnapshot が空でも崩れないようにする**

```jsx
const hasText = SNAPSHOT_FIELDS.some(({ key }) => log?.[key])

// log があるのにテキストが無い＝写真だけの記録
{log && !hasText && (
  log.photo_thumb_url
    ? <img src={log.photo_thumb_url} alt="" className="w-full rounded-lg object-cover max-h-32" />
    : <p className="text-sm text-ink-faint">この日の記録があります。</p>
)}
```

- [ ] **Step 4: Home の今日の記録にピッカーを置く**

`Journal.jsx` と同じ形で `PhotoPicker` を設置する。日付は `targetDate` を使う。

- [ ] **Step 5: lint とビルドを確認**

Run: `cd frontend && npx eslint src && npm run build && npm test`
Expected: すべて成功

- [ ] **Step 6: コミット**

```bash
git add Lantern/frontend/src
git commit -m "feat: Web の記録一覧・詳細・過去比較に写真を表示する"
```

---

## Task 15: mobile の各画面に組み込む

**Files:**
- Modify: `mobile/app/(tabs)/journal.jsx`
- Modify: `mobile/components/RecordForm.jsx`
- Modify: `mobile/components/LogDetail.jsx`
- Modify: `mobile/components/LogItem.jsx`
- Modify: `mobile/components/LogSnapshot.jsx`

- [ ] **Step 1: Web と同じ変更を mobile に適用する**

Task 13・14 と同じ内容を、React Native のコンポーネント（`View` / `Text` / `Image` / `Pressable`）で行う。
`<img>` は `<Image source={{ uri }} />` に、`className="hidden"` の input は不要
（mobile は `ImagePicker` がダイアログを出すため）。

保存条件も同様に「テキストか写真のどちらかがあれば保存可」に変更する。

- [ ] **Step 2: バンドルを確認**

Run: `cd Lantern/mobile && npx expo export --platform web --clear`
Expected: `Exported: dist`

- [ ] **Step 3: バンドルの内容を照合**

```bash
cd Lantern/mobile && python - <<'PY'
import io, re, glob
f = glob.glob("dist/_expo/static/js/web/*.js")[0]
s = io.open(f, encoding="utf-8").read()
d = re.compile(r'\\u([0-9a-fA-F]{4})').sub(lambda m: chr(int(m.group(1),16)), s)
for n in ["写真を追加", "選び直す", "この日の記録があります。"]:
    print(("OK " if n in d else "NG "), n)
PY
```

Expected: すべて OK

- [ ] **Step 4: コミット**

```bash
git add Lantern/mobile
git commit -m "feat: mobile の各画面に写真を組み込む"
```

---

## Task 16: 統合確認とドキュメント更新

**Files:**
- Modify: `PROGRESS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 全テストを流す**

```bash
cd Lantern && python -m pytest -q
cd frontend && npm test && npx eslint src && npm run build
```

Expected: pytest 全件パス / vitest 全件パス / eslint エラー0 / ビルド成功

- [ ] **Step 2: ローカルで手動確認**

サーバーを起動して以下を確認する。

1. 写真だけで保存できる
2. **テキストだけを編集しても写真が消えない**（最重要）
3. 記録を削除すると Storage のファイルも消える
4. 選び直しで同じ日付のファイルが上書きされる

Storage の中身は以下で確認する:

```bash
cd Lantern && python -c "
import sys, os; sys.path.insert(0, os.getcwd())
from dotenv import load_dotenv; load_dotenv(os.path.join(os.getcwd(), '.env'))
from modules.logs import supabase
print(supabase.storage.from_('lantern-photos').list())
"
```

- [ ] **Step 3: ドキュメントを更新**

`PROGRESS.md` に実装内容・検証結果・未確認事項を追記する。
`CLAUDE.md` の画面設計「記録タブ」に、写真1枚を添えられることを追記する。

- [ ] **Step 4: コミット**

```bash
git add Lantern/PROGRESS.md Lantern/CLAUDE.md
git commit -m "docs: 写真記録の実装内容を記録する"
```
