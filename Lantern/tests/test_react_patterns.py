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


class TestTextInputsAreControlledFromOutside:
    """入力欄を持つ部品が、値と変更を props で受け取っているか。

    内部定義を禁じただけでは足りない。切り出した先で
    親の state を直接触ると、結局同じ場所に戻る。
    """

    def test_Fieldがvalueとonchangeを受け取る(self):
        src = read(os.path.join(CLIENT, "components", "RecordForm.jsx"))
        m = re.search(r"function Field\(\{([^}]*)\}", src)
        assert m, "RecordForm.jsx に Field が無い"
        params = {p.strip().split("=")[0].strip() for p in m.group(1).split(",")}
        assert "value" in params and "onChange" in params, (
            f"Field が value / onChange を受け取っていない: {sorted(params)}"
        )
