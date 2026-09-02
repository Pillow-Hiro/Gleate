# pytest を Lantern/ 以外から実行しても modules パッケージを解決できるようにする。
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(autouse=True)
def _no_encryption_key(monkeypatch):
    """**検査は既定で暗号化を切る**（2026-09-02）。

    `main.py` の冒頭が `load_dotenv()` を呼ぶので、`import main` した
    時点で手元の `.env` が環境変数に入る。鍵を入れた開発機では
    `_to_db` が暗号化を始め、**列の中身を平文で照合している検査が落ちた**
    （`test_logs_mapping.py` など9件）。

    検査の結果が**手元の設定で変わるのは事故のもと。** ここで必ず外し、
    暗号化を見たい検査だけが `monkeypatch.setenv` で自分で入れる
    （`tests/test_crypto.py`）。
    """
    monkeypatch.delenv("LANTERN_ENC_KEYS", raising=False)
