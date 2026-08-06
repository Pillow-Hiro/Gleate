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
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LIVING_DOCS = ["CLAUDE.md", "REQUIREMENTS.md", "PROJECT_MAP.md", "HANDOFF.md"]


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
    def test_APP_VERSIONとCLAUDE_mdが一致する(self):
        m = re.search(r"APP_VERSION\s*=\s*'([^']+)'", read("client", "constants.js"))
        assert m, "constants.js に APP_VERSION が無い"
        version = m.group(1)  # 例: v2.0
        assert f"`main` ブランチ：{version}" in read("CLAUDE.md"), \
            f"CLAUDE.md のバージョン記載が {version} と食い違う"

    def test_REQUIREMENTSの対象バージョンが一致する(self):
        m = re.search(r"APP_VERSION\s*=\s*'v([^']+)'", read("client", "constants.js"))
        assert f"対象: v{m.group(1)}" in read("REQUIREMENTS.md")


class TestDocRoles:
    """各文書が自分の役割を書いているか。

    役割が書かれていないと、次に書く人がどこへ足せばよいか分からず、
    CLAUDE.md に何でも足されていく。
    """

    @pytest.mark.parametrize("name", ["REQUIREMENTS.md", "PROJECT_MAP.md", "HANDOFF.md"])
    def test_冒頭に役割が書いてある(self, name):
        head = read(name)[:400]
        assert "役割" in head, f"{name} の冒頭に役割の記載が無い"
