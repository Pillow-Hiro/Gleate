# Creator Companion MVP

クリエイターの創作活動を支えるAI伴走者。

## 起動方法

```bash
# 必要なライブラリをインストール
pip install flask

# 起動
python app.py
```

ブラウザで http://localhost:5000 を開く。

## Anthropic APIキーを設定する場合（オプション）

APIキーがあると、AIが実際に応答します。

```bash
# Macの場合
export ANTHROPIC_API_KEY="sk-ant-..."

# Windowsの場合
set ANTHROPIC_API_KEY=sk-ant-...

# そのあと起動
python app.py
```

APIキーがなくても動作します（シンプルな自動応答になります）。

## 機能

- 毎日の創作ログ記録（今日作ったもの・楽しかったこと・困ったこと・次回やること）
- AI伴走者からのコメント
- 今週のまとめ表示
- 過去ログ履歴
