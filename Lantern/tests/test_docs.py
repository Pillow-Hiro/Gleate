"""生きている文書が実装からずれていないかを機械的に検査する。

## なぜ必要か

Lantern のドキュメントは3回、静かに嘘になった。

- `PROJECT_MAP.md` は 2026-08-04 に削除した `frontend/` を
  2026-08-06 まで説明し続けていた
- `MVP_SPEC.md`（現 `REQUIREMENTS.md`）は 2026-06-12 から更新されず、
  2世代前のアプリの仕様を書き続けていた
- CLAUDE.md の記録件数は、手で数えたときの取り違えで間違っていた

どれも「更新を忘れないようにする」では防げなかった。
問いの資産と同じ考え方で、**人が守れないものは機械に守らせる。**

## 生きている文書と凍結された文書

検査するのは**生きている文書**だけ。

| 生きている（現在を語る） | 凍結（その時点を語る） |
|---|---|
| CLAUDE.md | PROGRESS.md の各日付の節 |
| REQUIREMENTS.md | DESIGN_*.md |
| PROJECT_MAP.md | REVIEW_*.md |
| HANDOFF.md | docs/superpowers/ |

凍結された文書が `frontend/` に触れているのは正しい。当時あったのだから。
生きている文書が触れていたら、それは嘘である。

**落ちたらテストではなく文書を直すこと。**
"""

import io
import os
import sys
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# DESIGN.md は 2026-08-09 に加わった。作者がデザインツールで作った
# 仕様書で、色・字・余白・かたちの定義はここが正。
LIVING_DOCS = ["CLAUDE.md", "REQUIREMENTS.md", "PROJECT_MAP.md",
               "HANDOFF.md", "STACK.md", "DESIGN.md"]


def read(*parts):
    return io.open(os.path.join(ROOT, *parts), encoding="utf-8").read()


def listdir(*parts):
    d = os.path.join(ROOT, *parts)
    return sorted(os.listdir(d)) if os.path.isdir(d) else []


@pytest.fixture(scope="module")
def project_map():
    return read("PROJECT_MAP.md")


class TestLivingDocsExist:
    @pytest.mark.parametrize("name", LIVING_DOCS)
    def test_存在する(self, name):
        assert os.path.isfile(os.path.join(ROOT, name)), f"{name} が無い"

    def test_引き継ぎ資料は1つだけ(self):
        # 日付つきの引き継ぎ資料を増やすと、どれが最新か分からなくなる。
        # 過去に feature ブランチへ置いたまま main から見えなくなったことがある。
        # 過去分は docs/archive/ に置く
        stray = [f for f in listdir() if f.startswith("SESSION_HANDOFF")]
        assert stray == [], f"ルートに日付つき引き継ぎ資料がある: {stray}"


class TestProjectMapCoversCode:
    """PROJECT_MAP.md が実在するファイルを網羅しているか。"""

    def test_modules_を全て載せている(self, project_map):
        mods = [f for f in listdir("modules")
                if f.endswith(".py") and f != "__init__.py"]
        missing = [m for m in mods if m not in project_map]
        assert missing == [], f"PROJECT_MAP.md に無い modules: {missing}"

    def test_questions_パッケージを載せている(self, project_map):
        assert "questions/" in project_map

    def test_components_を全て載せている(self, project_map):
        comps = [f for f in listdir("client", "components") if f.endswith(".jsx")]
        missing = [c for c in comps if c not in project_map]
        assert missing == [], f"PROJECT_MAP.md に無い components: {missing}"

    def test_画面を全て載せている(self, project_map):
        screens = [f for f in listdir("client", "app") if f.endswith(".jsx")]
        screens += [f for f in listdir("client", "app", "(tabs)") if f.endswith(".jsx")]
        missing = [s for s in screens if s not in project_map]
        assert missing == [], f"PROJECT_MAP.md に無い画面: {missing}"

    def test_lib_を全て載せている(self, project_map):
        libs = [f for f in listdir("client", "lib")
                if f.endswith(".js") and not f.endswith(".test.js")]
        missing = [l for l in libs if l not in project_map]
        assert missing == [], f"PROJECT_MAP.md に無い lib: {missing}"

    def test_載せているファイルが実在する(self, project_map):
        """逆方向。削除したファイルが表に残っていないか。

        バッククォートで囲まれた *.py / *.jsx を実在確認する。
        """
        known = set()
        for sub in ((), ("modules",), ("client", "components"),
                    ("client", "app"), ("client", "app", "(tabs)"),
                    ("client", "lib"), ("client",), ("scripts",), ("tests",)):
            known.update(listdir(*sub))

        cited = set(re.findall(r"`([A-Za-z_][A-Za-z0-9_.]*\.(?:py|jsx))`", project_map))
        ghosts = sorted(c for c in cited if c not in known)
        assert ghosts == [], f"PROJECT_MAP.md にあるが実在しない: {ghosts}"


class TestNoDeletedPaths:
    """生きている文書が、削除済みのディレクトリを説明していないか。"""

    # 2026-08-04 に廃止。mobile/ は client/ にリネーム済み
    DELETED = ("frontend/src", "frontend/dist", "mobile/app", "mobile/components")

    @pytest.mark.parametrize("name", LIVING_DOCS)
    def test_削除済みのパスを説明していない(self, name):
        text = read(name)
        # 「廃止した」と書いてある行は経緯の説明なので許す。
        # 説明しているのか、廃止を記録しているのかを行単位で見分ける
        bad = []
        for i, line in enumerate(text.splitlines(), 1):
            if any(d in line for d in self.DELETED) and "廃止" not in line:
                bad.append(f"{name}:{i}: {line.strip()}")
        assert bad == [], "削除済みのパスを説明している:\n" + "\n".join(bad)


class TestGuardrailsQuotedVerbatim:
    """CLAUDE.md が引用しているガードレールが ai.py に実在するか。

    CLAUDE.md 自身がこう定めている。

      文言は実物をそのまま引く。要約して書くと、後から grep したときに
      見つからず「ガードレールが消えている」と誤判定される
      （2026-08-03 のレビューで実際に起きた）。

    要約されたら落ちる。プロンプトから消えても落ちる。
    """

    QUOTED = [
        "数字（再生回数・高評価）で評価しない。タイトルや投稿時期から読み取れる事実のみ。",
        "再生回数・高評価数で動画の価値を評価しない。事実として伝えることはよい。",
        "視聴数・フォロワー数で配信の価値を評価しない。事実として伝えることはよい。",
        "配信の時間帯や長さは観察の材料にしてよい。ただし助言はしない。",
    ]

    @pytest.mark.parametrize("sentence", QUOTED)
    def test_CLAUDE_mdに引用がある(self, sentence):
        assert sentence in read("CLAUDE.md"), f"CLAUDE.md から引用が消えた: {sentence}"

    @pytest.mark.parametrize("sentence", QUOTED)
    def test_ai_pyに実物がある(self, sentence):
        assert sentence in read("modules", "ai.py"), \
            f"modules/ai.py からガードレールが消えた: {sentence}"


class TestRouteCount:
    """PROJECT_MAP.md が書いている API の本数が実装と合っているか。

    件数は増減に気づかせるための数字なので、ずれたら直す。
    """

    def test_ルール数とパス数が一致する(self, project_map):
        from main import app

        rules = [r for r in app.url_map.iter_rules() if r.endpoint != "static"]
        stated = re.search(r"(\d+)\s*ルール\s*/\s*(\d+)\s*パス", project_map)
        assert stated, "PROJECT_MAP.md に「Nルール / Mパス」の記載が無い"
        assert int(stated.group(1)) == len(rules), \
            f"ルール数が違う: 文書 {stated.group(1)} / 実装 {len(rules)}"
        assert int(stated.group(2)) == len(set(str(r) for r in rules)), \
            f"パス数が違う: 文書 {stated.group(2)} / 実装 {len(set(str(r) for r in rules))}"


class TestVersionConsistency:
    """バージョンは2つある。混ぜない。

    - **リリースの版数**（`app.json` の `version` と `constants.js` の
      `APP_VERSION`）。ストアの表示とアプリ内の表示。**必ず一致させる**
    - **アーキテクチャの世代**（文書の「v2.0」）。
      Expo + Flask API + Supabase の構成を指す。版数とは別物

    2026-08-06 に版数を 1.0.0 へ統一した（ストア初回リリース）。
    それまで `app.json` が 1.0.0、画面が v2.0 で食い違っていた。
    """

    def _release_version(self):
        m = re.search(r"APP_VERSION\s*=\s*'([^']+)'", read("client", "constants.js"))
        assert m, "constants.js に APP_VERSION が無い"
        return m.group(1)

    def test_app_jsonと画面の版数が一致する(self):
        import json

        app_json = json.loads(read("client", "app.json"))["expo"]["version"]
        assert app_json == self._release_version(), (
            f"ストアの版数 {app_json} と画面の表示 {self._release_version()} が違う。"
            "利用者はどちらが本当か分からなくなる"
        )

    def test_版数に接頭辞のvを付けない(self):
        # ストアは "1.0.0" 形式しか受け付けない。画面だけ "v1.0.0" にすると
        # 上の一致検査を通すために app.json 側を壊すことになる
        v = self._release_version()
        assert re.fullmatch(r"\d+\.\d+\.\d+", v), \
            f"版数は 1.0.0 の形にする（今: {v}）"

    def test_世代の表記が文書間で揃っている(self):
        # 文書の「v2.0」は版数ではなく世代。REQUIREMENTS と CLAUDE.md で揃える
        m = re.search(r"対象: (v[\d.]+)", read("REQUIREMENTS.md"))
        assert m, "REQUIREMENTS.md に「対象: vX.Y」が無い"
        assert f"`main` ブランチ：{m.group(1)}" in read("CLAUDE.md"), \
            f"CLAUDE.md の世代表記が REQUIREMENTS.md の {m.group(1)} と食い違う"

    def test_世代と版数を取り違えていない(self):
        # 世代は v 付き、版数は v 無し。同じ値になったら混同が始まっている
        m = re.search(r"対象: v([\d.]+)", read("REQUIREMENTS.md"))
        assert m.group(1) != self._release_version(), \
            "世代と版数が同じ値になっている。別物として扱えているか確認すること"


def _legal_module():
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import build_legal

    return build_legal


class TestPrivacyPage:
    """PRIVACY.md と、そこから作る privacy.html がずれていないか。

    同じ文面を2か所に置くと必ずずれる。原本は PRIVACY.md で、
    HTML は `scripts/build_legal.py` の生成物とする。

    掲載先は `client/public/`。expo export が出力の直下へ複製するため、
    SPAのルーティングを通らず**ログインしていなくても開ける**。
    アプリ内のルートにすると認証ガードが /login へ振り替えてしまい、
    審査担当者が読めない。
    """

    def _built(self):
        return _legal_module().render(read("PRIVACY.md"))

    def test_生成物が最新である(self):
        current = read("client", "public", "privacy.html")
        assert current == self._built(), (
            "PRIVACY.md を直して privacy.html を作り直していない。"
            "python scripts/build_legal.py を実行すること"
        )

    def test_見出しがすべて入っている(self):
        page = read("client", "public", "privacy.html")
        for line in read("PRIVACY.md").splitlines():
            if line.startswith("## "):
                assert line[3:] in page, f"見出しが落ちている: {line[3:]}"

    def test_記法が生のまま残っていない(self):
        # 変換に失敗すると ** や | が本文に出る
        page = read("client", "public", "privacy.html")
        body = re.sub(r"<[^>]+>", "", page.split("<body>")[1])
        for mark in ("**", "](", "|"):
            assert mark not in body, f"変換されていない記法が残っている: {mark}"

    def test_閲覧できる状態であることを隠していない(self):
        # 暗号化していない以上、ここを書かないのは不誠実になる。
        # 暗号化を実装したら、この検査ごと書き換える
        assert "提供者が管理者として閲覧できる状態にあります" in read("PRIVACY.md")

    def test_写真が端末から出ないと書いてある(self):
        assert "写真は端末の中だけに保存され" in read("PRIVACY.md")

    def test_アカウント削除の案内がある(self):
        # App Store 5.1.1(v) に対応した機能を、文書側でも示す
        assert "アカウントの削除" in read("PRIVACY.md")


class TestLegalPages:
    """利用規約と特定商取引法に基づく表記（2026-08-16・有料化のため）。

    プライバシーポリシーと同じ扱い。**Markdown が原本で HTML は生成物。**
    ずれたらここで落ちる。

    特商法の表記は**有料で売るなら日本では必須**。
    書き漏らすと出せない項目があるので、機械に数えさせる。
    """

    def test_生成物が最新である(self):
        mod = _legal_module()
        for source, target, title in mod.DOCS:
            current = read("client", "public", target)
            assert current == mod.render(read(source), title), (
                f"{source} を直して {target} を作り直していない。"
                "python scripts/build_legal.py を実行すること"
            )

    def test_特商法に必要な項目がそろっている(self):
        # 特定商取引法第11条（通信販売についての広告）。
        # 落とすと表示義務違反になるものだけを並べる
        page = read("TOKUSHOHO.md")
        for item in (
            "販売事業者",
            "運営統括責任者",
            "所在地",
            "電話番号",
            "メールアドレス",
            "販売価格",
            "商品代金以外に必要な費用",
            "支払方法",
            "支払時期",
            "役務の提供時期",
            "返品",
            "動作環境",
        ):
            assert item in page, f"特商法の表記に項目が無い: {item}"

    def test_自動更新と解約の場所が書いてある(self):
        # App Store のサブスクリプション審査で必ず見られる。
        # アプリ内で解約できないことを隠さない
        for path in ("TERMS.md", "TOKUSHOHO.md"):
            page = read(path)
            assert "自動更新" in page, f"{path} に自動更新の説明が無い"
            assert "サブスクリプション" in page, f"{path} に解約の場所が無い"

    def test_無料のままにするものを約束している(self):
        # **エクスポートを人質にしない。** ここが崩れたら気づけるようにする
        terms = read("TERMS.md")
        assert "これらを有料に移すことはありません" in terms
        assert "記録のエクスポート" in terms

    def test_AIの文章が助言ではないと書いてある(self):
        assert "これは助言ではありません" in read("TERMS.md")

    def test_記録の権利が利用者にあると書いてある(self):
        terms = read("TERMS.md")
        assert "記録の著作権は利用者に帰属します" in terms
        assert "AI の学習には使いません" in terms


class TestStack:
    """STACK.md の版が実ファイルと合っているか。

    技術構成の文書は、書いた瞬間から腐る。
    **版だけは機械が照合できる**ので、そこは機械に任せる。
    費用やプランのように照合できないものは人が直す。
    """

    def _stack(self):
        return read("STACK.md")

    # 表の見出しと npm / pip の名前の対応。
    # 版だけを部分一致で探すと、別の行の同じ版に当たって素通りする
    # （`57.0.10` は Expo SDK と Expo Router の両方に出る）。
    # 行ごと照合する。
    FRONT = [
        ("Expo SDK", "expo"),
        ("React Native", "react-native"),
        ("React", "react"),
        ("React Native Web", "react-native-web"),
        ("Expo Router", "expo-router"),
        ("NativeWind", "nativewind"),
        ("Tailwind CSS", "tailwindcss"),
    ]

    BACK = [
        ("Flask", "flask"),
        ("gunicorn", "gunicorn"),
        ("supabase", "supabase"),
        ("anthropic", "anthropic"),
        ("PyJWT[crypto]", "PyJWT[crypto]"),
        ("cryptography", "cryptography"),
        ("google-api-python-client", "google-api-python-client"),
    ]

    @pytest.mark.parametrize("label,package", FRONT)
    def test_フロントの版が一致する(self, label, package):
        import json

        dep = json.loads(read("client", "package.json"))["dependencies"][package]
        version = re.sub(r"^[~^]", "", dep)
        assert f"| {label} | {version} |" in self._stack(), (
            f"STACK.md の「{label}」の行が {version} と食い違う"
        )

    @pytest.mark.parametrize("label,package", BACK)
    def test_バックエンドの版が一致する(self, label, package):
        for line in read("requirements.txt").splitlines():
            if line.strip().startswith(f"{package}=="):
                version = line.split("==")[1].strip()
                assert f"| {label} | {version} |" in self._stack(),                     f"STACK.md の「{label}」の行が {version} と食い違う"
                return
        raise AssertionError(f"requirements.txt に {package} が無い")

    def test_Pythonの版が一致する(self):
        assert read(".python-version").strip() in self._stack()

    def test_APIの本数が一致する(self):
        from main import app

        rules = [r for r in app.url_map.iter_rules() if r.endpoint != "static"]
        assert f"{len(rules)}ルール" in self._stack()

    def test_構成要素の数が一致する(self):
        counts = {
            "画面": len([f for f in listdir("client", "app") if f.endswith(".jsx")])
                  + len([f for f in listdir("client", "app", "(tabs)") if f.endswith(".jsx")]),
            "コンポーネント": len([f for f in listdir("client", "components")
                                   if f.endswith(".jsx")]),
            "モジュール": len([f for f in listdir("modules")
                               if f.endswith(".py") and f != "__init__.py"]),
        }
        stack = self._stack()
        for label, n in counts.items():
            assert f"{label} {n}" in stack, f"STACK.md の「{label}」が {n} と食い違う"

    def test_gunicornの設定が一致する(self):
        # Procfile を変えたら STACK.md も直す
        import re as _re

        m = _re.search(r"--workers\s+(\d+)\s+--threads\s+(\d+)\s+--timeout\s+(\d+)",
                       read("Procfile"))
        assert m, "Procfile の gunicorn 設定を読み取れない"
        assert (f"--workers {m.group(1)} --threads {m.group(2)} "
                f"--timeout {m.group(3)}") in self._stack()

    def test_使っているモデルが一致する(self):
        """**模型の名前は `_MODEL` に1つだけ。**

        2026-08-18 に `model="claude-sonnet-4-6"` を各呼び出しに
        直書きするのをやめ、定数にまとめた。ここもそれを読む。
        直書きが戻ってきたときも拾えるよう、両方の形を見る。
        """
        import re as _re

        src = read("modules", "ai.py")
        models = set(_re.findall(r'model="([^"]+)"', src))
        models |= set(_re.findall(r'^_MODEL\s*=\s*"([^"]+)"', src, _re.M))
        assert models, "modules/ai.py にモデル指定が無い"
        for model in models:
            assert model in self._stack(), f"STACK.md のモデル名が {model} と食い違う"


class TestIcons:
    """アイコンが配布に耐える形か。

    2026-08-07 まで、**Expo の雛形のアイコンがそのまま入っていた**
    （青いシェブロンに作図ガイド線）。気づいたのは実物を開いたときで、
    ビルドもテストも通っていた。

    ここで見るのは「ちゃんとしたデザインか」ではなく、
    **機械で分かる致命傷**だけ。
    - App Store は 1024x1024 でアルファ無しを要求する
    - Android の背景色が雛形（水色）のままだと、緑の前景と噛み合わない

    PNG のヘッダだけを読む。画像ライブラリを依存に足さない。
    """

    ASSETS = os.path.join("client", "assets")

    def _png_header(self, name):
        import struct

        path = os.path.join(ROOT, self.ASSETS, name)
        assert os.path.isfile(path), f"{name} が無い"
        head = io.open(path, "rb").read(33)
        width, height = struct.unpack(">II", head[16:24])
        return width, height, head[25]  # color type

    def test_iOSのアイコンは1024四方(self):
        w, h, _ = self._png_header("icon.png")
        assert (w, h) == (1024, 1024), f"icon.png が {w}x{h}"

    def test_iOSのアイコンにアルファを含めない(self):
        # 含まれていると App Store Connect が受け付けない
        _, _, ctype = self._png_header("icon.png")
        assert ctype not in (4, 6), "icon.png にアルファがある"

    def test_Androidの前景が1024四方(self):
        """透過は要求しない。

        前景は透過を持つのが普通だが、**この絵は地の紺と発光が
        溶け合っている**。切り抜くと光の外周に硬い縁が出る。
        そのため前景を不透明にし、背景の単色を同じ紺に合わせている
        （`adaptiveIcon.backgroundColor` の検査がその一致を守る）。

        寸法だけを固定する。ここがずれると端末側で拡大されて粗くなる。
        """
        w, h, _ = self._png_header("android-icon-foreground.png")
        assert (w, h) == (1024, 1024), f"前景が {w}x{h}"

    def test_Androidの背景色が雛形のままでない(self):
        import json

        color = json.loads(read("client", "app.json"))["expo"]["android"]["adaptiveIcon"][
            "backgroundColor"]
        assert color.upper() != "#E6F4FE", "Expo の雛形の水色が残っている"
        # 2026-08-07 に作者が用意した画像に差し替えた。地は紺 #181F2F。
        # 前景の画像と背景の単色が食い違うと、マスクの縁で色が割れる
        assert color.upper() == "#181F2F", f"アイコン画像の地の色と違う: {color}"


class TestDocRoles:
    """各文書が自分の役割を書いているか。

    役割が書かれていないと、次に書く人がどこへ足せばよいか分からず、
    CLAUDE.md に何でも足されていく。
    """

    @pytest.mark.parametrize("name", ["REQUIREMENTS.md", "PROJECT_MAP.md", "HANDOFF.md"])
    def test_冒頭に役割が書いてある(self, name):
        head = read(name)[:400]
        assert "役割" in head, f"{name} の冒頭に役割の記載が無い"
