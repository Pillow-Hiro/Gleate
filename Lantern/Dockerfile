# Cloud Run に置くための器（2026-10-11・作者「renderのサブスクが痛いから完全無料で」）。
#
# **Render のときと同じ起動の仕方を保つ。**`Procfile` の1行と同じ——
# gunicorn・1ワーカー・8スレッド・待ち60秒（`STACK.md`「I/O 待ちが仕事のほぼ全て」）。
# Render は `Procfile` を読むので、あちらは何も変わらない。両方同時に動かせる。
#
# 版を固定する理由は `requirements.txt` の冒頭と同じ。`slim` は Debian 版の
# 入れ替えで中身が変わるので、Python の版まで書く。
FROM python:3.13-slim

# .pyc を書かない（読み取り専用の器で無駄）／出力を溜めない（ログが遅れて出る）
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# **依存を先に入れる。**コードだけ変わったときに、入れ直しを起こさない
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# どの版が動いているかを `/api/debug/version` で見るため。
# Cloud Build が `$SHORT_SHA` / `$BRANCH_NAME` を渡す（`docs/deploy-cloudrun.md`）。
# Render では `RENDER_GIT_*` が入るので、`main.py` は両方を見る
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ENV GIT_COMMIT=$GIT_COMMIT \
    GIT_BRANCH=$GIT_BRANCH

# **`$PORT` は Cloud Run が渡す。**決め打ちにすると、向こうが別の番号を渡したときに届かない。
# `exec` 形式にしないと gunicorn がシェルの子になり、停止の合図（SIGTERM）が届かない
CMD exec gunicorn main:app --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 60
