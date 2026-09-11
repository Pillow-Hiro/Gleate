"""画面のコードに、実機でしか露見しない壊れ方が入っていないかを検査する。

## なぜソースを文字列で見るのか

`client/` の検査は vitest だが、対象は `lib/` の純粋関数だけにしている。
画面の描画をテストする仕組み（レンダラ）は入れていない。
入れれば防げるが、そのために持ち込む依存と維持の手間が大きい。

**ここで見るのは「書き方の誤り」であって、描画結果ではない。**
文字列とASTで足りる。

## 2026-08-07 に実機で見つかった壊れ方

`RecordForm` の中で `Field` を定義していた。1文字打つたびに
`setForm` で再描画され、そのたびに `Field` が別の関数になるため、
React は「別のコンポーネントに変わった」と見なして `TextInput` を
作り直していた。結果、**フォーカスが外れ、キーボードが閉じ、
1文字しか打てなかった。**

記録アプリとして致命的だが、Web では気づきにくく、
pytest も vitest も expo-doctor も通っていた。
**実機に入れるまで誰も気づけなかった。**
"""

import io
import os
import re
import shutil
import subprocess

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT = os.path.join(ROOT, "client")


def jsx_files():
    """画面と部品の .jsx を集める。"""
    out = []
    for sub in (("components",), ("app",), ("app", "(tabs)")):
        d = os.path.join(CLIENT, *sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".jsx"):
                out.append((os.path.join("client", *sub, f), os.path.join(d, f)))
    return out


def read(path):
    return io.open(path, encoding="utf-8").read()


# コンポーネントの中で定義された、大文字始まりの関数。
# JSX では大文字始まりが「コンポーネント」として扱われる。
# 字下げがあるものだけを拾う（字下げ0＝モジュール直下は正しい書き方）。
_INNER_FUNC = re.compile(r"^[ \t]+function ([A-Z][A-Za-z0-9_]*)\s*\(", re.M)
_INNER_ARROW = re.compile(
    r"^[ \t]+const ([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>", re.M)


class TestNoComponentDefinedInsideComponent:
    """描画のたびに作り直されるコンポーネントを作っていないか。

    **落ちたら、その関数をモジュールの直下へ出すこと。**
    必要な値は props で渡す。
    """

    @pytest.mark.parametrize("rel,path", jsx_files(), ids=lambda v: v if isinstance(v, str) else "")
    def test_内部でコンポーネントを定義していない(self, rel, path):
        src = read(path)
        found = _INNER_FUNC.findall(src) + _INNER_ARROW.findall(src)
        assert found == [], (
            f"{rel} がコンポーネントの中でコンポーネントを定義している: {found}。"
            "描画のたびに別物になり、入力欄なら1文字ごとにフォーカスが外れる。"
            "モジュールの直下へ出すこと"
        )


class TestDetectorWorks:
    """検査そのものが効いているか。"""

    def test_内部のfunctionを捕まえる(self):
        src = "export default function Form() {\n  function Field() { return null }\n}\n"
        assert _INNER_FUNC.findall(src) == ["Field"]

    def test_内部のアロー関数を捕まえる(self):
        src = "export default function Form() {\n  const Row = ({ a }) => null\n}\n"
        assert _INNER_ARROW.findall(src) == ["Row"]

    def test_モジュール直下は通す(self):
        src = "function Field() { return null }\nexport default function Form() { return null }\n"
        assert _INNER_FUNC.findall(src) == []

    def test_小文字の関数は対象外(self):
        # handleSave のような関数は内部にあってよい。コンポーネントではない
        src = "export default function Form() {\n  function handleSave() {}\n}\n"
        assert _INNER_FUNC.findall(src) == []


class TestDashboardKeepsPanelsMounted:
    """タブを切り替えても、開いたパネルを破棄していないか。

    2026-08-07 まで `activeTab === 'youtube' ? <A/> : <B/>` で
    出し分けていた。切り替えるたびに片方が破棄され、戻るたびに
    連携状態・チャンネル・動画一覧・推移を取り直していた。
    外部APIを経由するため数秒かかり、**タブを触るたびに待たされていた。**

    開いたものは残し、隠すだけにする。
    """

    def _src(self):
        return read(os.path.join(CLIENT, "app", "(tabs)", "dashboard.jsx"))

    def test_三項演算子でパネルを入れ替えていない(self):
        src = self._src()
        assert "? <YouTubePanel /> : <TwitchPanel />" not in src, (
            "タブ切替でパネルを破棄している。戻るたびに再取得が走る"
        )

    def test_両方のパネルを描画しうる(self):
        src = self._src()
        assert "<YouTubePanel />" in src and "<TwitchPanel />" in src

    def test_隠すだけにしている(self):
        # display:'none' なら unmount されず、取得結果と状態が残る
        assert "display: 'none'" in self._src(),             "隠す手段が display:'none' でない。unmount していないか確認すること"


class TestTabsHaveIcons:
    """ボトムタブにアイコンを渡しているか。

    2026-08-07 まで `tabBarIcon` を一度も渡していなかった。
    広い画面のサイドバーは自前で描いていたのでアイコンが出ていたが、
    **ネイティブのボトムタブには React Navigation の既定表示
    （塗りつぶした三角）が4つ並んでいた。**

    実機で「アプリ感がない」と言われた主因。
    Web の広い画面でしか確認していなかったため、気づけなかった。
    """

    def _layout(self):
        # 2026-08-09 にネイティブを NativeTabs（本物の UITabBar）へ移した。
        # 自前のアイコンを持つのは Web 版だけになった。
        return read(os.path.join(CLIENT, "app", "(tabs)", "_layout.web.jsx"))

    def test_tabBarIconを渡している(self):
        assert "tabBarIcon" in self._layout(), (
            "tabBarIcon が無い。React Navigation の既定の三角が並ぶ"
        )

    def test_アイコンを共有ファイルから取る(self):
        # 同じ絵を2か所で持つと、片方だけ直して食い違う
        assert "TAB_ICONS" in self._layout()
        assert "TAB_ICONS" in read(os.path.join(CLIENT, "components", "SidebarTabBar.jsx"))

    def test_全ルートにアイコンがある(self):
        icons = read(os.path.join(CLIENT, "components", "TabIcons.jsx"))
        m = re.search(r"export const TAB_ICONS = \{([^}]*)\}", icons)
        assert m, "TabIcons.jsx に TAB_ICONS が無い"
        defined = set(re.findall(r"(\w+):", m.group(1)))
        screens = {f[:-4] for f in os.listdir(os.path.join(CLIENT, "app", "(tabs)"))
                   if f.endswith(".jsx") and not f.startswith("_layout")}
        missing = screens - defined
        assert missing == set(), f"アイコンが無いタブ: {sorted(missing)}"


class TestTextInputsAreControlledFromOutside:
    """入力欄を持つ部品が、値と変更を props で受け取っているか。

    内部定義を禁じただけでは足りない。切り出した先で
    親の state を直接触ると、結局同じ場所に戻る。
    """

    def test_書く面がvalueとonchangeを受け取る(self):
        """`RecordForm.jsx` の書く面。

        2026-09-04 まで `Field` という名前だった。よかったこと・困ったこと・
        次にやることの欄を消し、書く面がひとつになったので `Body` にした
        （`CLAUDE.md`「入力欄は『やったこと』ひとつだけ」）。
        見ているのは名前ではなく**値と変更を外から受け取っているか。**
        """
        src = read(os.path.join(CLIENT, "components", "RecordForm.jsx"))
        m = re.search(r"function Body\(\{([^}]*)\}", src)
        assert m, "RecordForm.jsx に Body が無い"
        params = {p.strip().split("=")[0].strip() for p in m.group(1).split(",")}
        assert "value" in params and "onChange" in params, (
            f"Body が value / onChange を受け取っていない: {sorted(params)}"
        )


class TestNativeOnlyModulesAreLoadedLazily:
    """ネイティブを持たないビルドに配られても落ちないか。

    **`expo-glass-effect` は読み込んだ時点でネイティブを要求する。**

        const NativeGlassView = requireNativeViewManager('ExpoGlassEffect', 'GlassView')
        requireNativeModule('ExpoGlassEffect')   // 任意版ではない

    静的 import すると、モジュールを持たないビルドでは
    **画面を描く前に落ちる。**

    そして実際に届きうる。2026-08-09 に確かめたところ、
    `expo-glass-effect` を足したビルド #7 の指紋が、足していない #6 と
    同一だった（どちらも `4ff774b0…`）。EAS Update はこの2つを
    区別できないため、新しいJSが古いバイナリに配られる。

    落ちたらテストではなく import の書き方を直すこと。
    """

    # 読み込んだだけでネイティブを要求するパッケージ。
    # 増やすときは「トップレベルで requireNativeModule / requireNativeViewManager
    # を呼んでいるか」を確認してから足す。
    # `expo-symbols` も同じ（`requireNativeViewManager('SymbolModule')` を
    # 読み込んだ時点で呼ぶ）。2026-09-11 に足した。
    NATIVE_ON_IMPORT = ["expo-glass-effect", "expo-symbols"]

    def _jsx_files(self):
        out = []
        for sub in ("app", os.path.join("app", "(tabs)"), "components", "lib"):
            d = os.path.join(CLIENT, sub)
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                if f.endswith(".jsx") or f.endswith(".js"):
                    out.append(os.path.join(d, f))
        return out

    def test_静的importしていない(self):
        hits = []
        for path in self._jsx_files():
            src = read(path)
            for pkg in self.NATIVE_ON_IMPORT:
                if re.search(rf"^\s*import\s.*from\s+['\"]{re.escape(pkg)}['\"]",
                             src, re.M):
                    hits.append(f"{os.path.basename(path)}: {pkg}")
        assert hits == [], (
            "ネイティブを持たないビルドで落ちる静的 import:\n" + "\n".join(hits)
            + "\n関数の中で require し、try/catch で包むこと"
        )

    def test_requireを使う側が包んでいる(self):
        """遅延読み込みしている場所が try/catch を持っているか。

        コメントで名前に触れているだけの場合は対象外。
        実際に `require` している行があるときだけ見る。
        """
        for path in self._jsx_files():
            src = read(path)
            for pkg in self.NATIVE_ON_IMPORT:
                if f"require('{pkg}')" not in src:
                    continue
                assert "try {" in src and "catch" in src, (
                    f"{os.path.basename(path)} が {pkg} を包まずに require している"
                )


class TestJsxParses:
    """画面のファイルが**構文として通るか。**

    ## 2026-09-03 に配信の直前で見つかった壊れ方

    三項演算子の枝の先頭に JSX のコメントを置いた。

        {!loading && logs.length > 0 ? (
          {/* … */}
          <Text>…</Text>
        ) : null}

    枝の中に式が2つ並ぶので構文にならない。**気づいたのは
    `eas update` が82秒かけて束ね直しに失敗したとき。**

    pytest も vitest も通っていた。vitest が見ているのは `lib/` の
    純粋関数だけで、**画面のファイルは1行も読まれていない**
    （このファイルの冒頭に理由がある）。lint も入っていない。
    つまり**構文を見る場所がどこにも無かった。**

    Python では JSX を読めないので、`client/scripts/parse-check.mjs`
    （@babel/parser）に読ませる。node が無ければ飛ばす——
    検査のために node を必須にはしない。
    """

    def test_全ての画面が読める(self):
        script = os.path.join(CLIENT, "scripts", "parse-check.mjs")
        assert os.path.isfile(script), "parse-check.mjs が無い"

        node = shutil.which("node")
        if not node:
            pytest.skip("node が無い環境。構文検査は飛ばす")

        # `@babel/parser` は client/node_modules にある。入っていなければ飛ばす
        if not os.path.isdir(os.path.join(CLIENT, "node_modules", "@babel", "parser")):
            pytest.skip("client/node_modules が無い環境。構文検査は飛ばす")

        proc = subprocess.run(
            [node, script],
            cwd=CLIENT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
        )
        assert proc.returncode == 0, (
            "画面のファイルが構文として読めない:\n" + (proc.stderr or proc.stdout)
        )
