"""modules/metrics.py の検査。

計測は「機能を残すか畳むか」の根拠になる。数え方がずれると
判断そのものがずれるため、境界を具体的な値で固定する。

日付は必ず引数で渡し、実行日に依存させない。
過去に「ハードコードした日付がたまたま実行日と一致して、
壊れているのに通るテスト」を作ったことがある。
"""

from datetime import date, timedelta

import pytest

from modules import metrics


def log(d, created="", enjoyable="", struggled="", next_="", photo=""):
    return {
        "date": d,
        "created": created,
        "enjoyable": enjoyable,
        "struggled": struggled,
        "next": next_,
        "photo_path": photo,
    }


class TestHasContent:
    def test_テキストがあれば成立する(self):
        assert metrics.has_content(log("2026-08-06", created="曲を作った"))

    def test_やったこと以外の項目だけでも成立する(self):
        assert metrics.has_content(log("2026-08-06", struggled="詰まった"))

    def test_写真だけの日は数えられない(self):
        # 2026-08-06 に写真を端末の中だけに置く方針へ変えた。
        # サーバーはその日の存在を知らないので、ここで数えるのは
        # 「文章を残した日数」になる。この制約を明示的に固定する
        assert not metrics.has_content(log("2026-08-06", photo="u/2026-08-06.jpg"))

    def test_空なら成立しない(self):
        assert not metrics.has_content(log("2026-08-06"))

    def test_空白だけなら成立しない(self):
        assert not metrics.has_content(log("2026-08-06", created="   \n "))


class TestFieldUsage:
    # 4件中3件・1件・0件と散らして、母数の取り違えが出るようにする
    logs = [
        log("2026-08-01", created="あああ", next_="い"),
        log("2026-08-02", created="ううううう"),
        log("2026-08-03", created="えええええええ"),
        log("2026-08-04", enjoyable="お"),
    ]

    def test_記入率は全記録を母数にする(self):
        u = metrics.field_usage(self.logs)
        assert u["created"]["count"] == 3
        assert u["created"]["total"] == 4
        assert u["created"]["rate"] == pytest.approx(0.75)
        assert u["next"]["count"] == 1
        assert u["next"]["rate"] == pytest.approx(0.25)

    def test_平均文字数は書かれた記録だけを母数にする(self):
        # 3+5+7=15 を 3 で割る。4 で割ると記入率と同じことを二重に言う
        assert metrics.field_usage(self.logs)["created"]["avg_chars"] == pytest.approx(5.0)

    def test_一度も書かれていない項目は0になる(self):
        u = metrics.field_usage(self.logs)["struggled"]
        assert u["count"] == 0
        assert u["rate"] == 0.0
        assert u["avg_chars"] == 0.0

    def test_記録が無くてもゼロ除算しない(self):
        u = metrics.field_usage([])
        assert u["created"]["rate"] == 0.0
        assert u["created"]["avg_chars"] == 0.0

    def test_ラベルは画面の文言と結びつく(self):
        assert metrics.field_usage(self.logs)["next"]["label"] == "次にやること"

    def test_四項目すべてを返す(self):
        # 欄を消さない方針の担保。項目が減ったらここで気づく
        assert set(metrics.field_usage([]).keys()) == set(metrics.FIELDS)
        assert len(metrics.FIELDS) == 4


class TestAvgTotalChars:
    def test_四項目を合算する(self):
        logs = [
            log("2026-08-01", created="ああ", next_="いい"),  # 4
            log("2026-08-02", created="うう"),                # 2
        ]
        assert metrics.avg_total_chars(logs) == pytest.approx(3.0)

    def test_空なら0(self):
        assert metrics.avg_total_chars([]) == 0.0


class TestWeekKey:
    def test_ISO週のラベルを返す(self):
        assert metrics.week_key("2026-08-06") == "2026-W32"

    def test_月曜と日曜は同じ週になる(self):
        assert metrics.week_key("2026-08-03") == metrics.week_key("2026-08-09") == "2026-W32"

    def test_翌月曜は次の週になる(self):
        assert metrics.week_key("2026-08-10") == "2026-W33"

    def test_年をまたぐ週はISOの年に従う(self):
        # 2025-12-29 は ISO では 2026年の第1週。暦の年で切ると分断される
        assert metrics.week_key("2025-12-29") == "2026-W01"

    def test_読めない日付はNone(self):
        assert metrics.week_key("") is None
        assert metrics.week_key("いつか") is None
        assert metrics.week_key(None) is None


class TestWeeklySummary:
    def test_古い順に並び記録の無い週は現れない(self):
        logs = [
            log("2026-08-10", created="あ"),
            log("2026-07-27", created="いい"),
            log("2026-08-06", created="ううう"),
        ]
        rows = metrics.weekly_summary(logs)
        assert [r["week"] for r in rows] == ["2026-W31", "2026-W32", "2026-W33"]
        assert [r["days"] for r in rows] == [1, 1, 1]

    def test_同じ週はまとまる(self):
        logs = [
            log("2026-08-03", created="あ"),
            log("2026-08-06", created="いいい"),
        ]
        rows = metrics.weekly_summary(logs)
        assert len(rows) == 1
        assert rows[0]["days"] == 2
        assert rows[0]["avg_chars"] == pytest.approx(2.0)

    def test_写真は集計しない(self):
        # 写真は端末の中にしか無いため、サーバーからは数えられない。
        # 数えられないものを 0 として出すと「写真を使っていない」と誤読する
        logs = [log("2026-08-03", created="あ", photo="p.jpg")]
        assert "photos" not in metrics.weekly_summary(logs)[0]


class TestStreaks:
    def test_連続した日を数える(self):
        logs = [log(d, created="あ") for d in ("2026-08-04", "2026-08-05", "2026-08-06")]
        assert metrics.streaks(logs, date(2026, 8, 6)) == {"current": 3, "longest": 3}

    def test_昨日までなら継続とみなす(self):
        # 今日まだ書いていないだけで0になると、日中に見たとき途切れて見える
        logs = [log(d, created="あ") for d in ("2026-08-04", "2026-08-05", "2026-08-06")]
        assert metrics.streaks(logs, date(2026, 8, 7))["current"] == 3

    def test_二日空くと現在の連続は途切れる(self):
        logs = [log(d, created="あ") for d in ("2026-08-04", "2026-08-05", "2026-08-06")]
        assert metrics.streaks(logs, date(2026, 8, 8))["current"] == 0

    def test_途切れても最長は残る(self):
        logs = [log(d, created="あ") for d in
                ("2026-08-01", "2026-08-02", "2026-08-03", "2026-08-06")]
        assert metrics.streaks(logs, date(2026, 8, 6)) == {"current": 1, "longest": 3}

    def test_一日だけなら1(self):
        assert metrics.streaks([log("2026-08-06", created="あ")], date(2026, 8, 6)) == \
            {"current": 1, "longest": 1}

    def test_記録が無ければ0(self):
        assert metrics.streaks([], date(2026, 8, 6)) == {"current": 0, "longest": 0}

    def test_空の記録は数えない(self):
        # 写真もテキストも無い行は日を埋めない
        logs = [
            log("2026-08-04", created="あ"),
            log("2026-08-05"),
            log("2026-08-06", created="い"),
        ]
        assert metrics.streaks(logs, date(2026, 8, 6))["longest"] == 1

    def test_順不同でも同じ結果になる(self):
        logs = [log(d, created="あ") for d in ("2026-08-06", "2026-08-04", "2026-08-05")]
        assert metrics.streaks(logs, date(2026, 8, 6))["longest"] == 3


class TestSpan:
    def test_期間と書いた日の割合(self):
        # 8/1 と 8/5 の2日。期間は5日
        logs = [log("2026-08-01", created="あ"), log("2026-08-05", created="い")]
        s = metrics.span(logs)
        assert s["first"] == date(2026, 8, 1)
        assert s["last"] == date(2026, 8, 5)
        assert s["span_days"] == 5
        assert s["recorded_days"] == 2
        assert s["rate"] == pytest.approx(0.4)

    def test_今日を渡すと沈黙した日も期間に入る(self):
        # 最後の記録以降に書いていない日を、期間から外して率を上げない
        logs = [log("2026-08-01", created="あ"), log("2026-08-05", created="い")]
        assert metrics.span(logs, date(2026, 8, 10))["span_days"] == 10

    def test_同じ日の記録は重複して数えない(self):
        logs = [log("2026-08-01", created="あ"), log("2026-08-01", created="い")]
        assert metrics.span(logs)["recorded_days"] == 1

    def test_記録が無ければゼロ除算しない(self):
        assert metrics.span([])["rate"] == 0.0


class TestSplitAt:
    logs = [
        log("2026-08-05", created="前"),
        log("2026-08-06", created="境界"),
        log("2026-08-07", created="後"),
    ]

    def test_境界日は後に入る(self):
        # 機能を入れた日から効果が出うる。前に入れると変化を1日分薄める
        before, after = metrics.split_at(self.logs, date(2026, 8, 6))
        assert [l["created"] for l in before] == ["前"]
        assert [l["created"] for l in after] == ["境界", "後"]

    def test_文字列の日付でも分けられる(self):
        before, after = metrics.split_at(self.logs, "2026-08-06")
        assert len(before) == 1 and len(after) == 2

    def test_読めない日付の記録は落とす(self):
        before, after = metrics.split_at(self.logs + [log("", created="不明")], "2026-08-06")
        assert len(before) + len(after) == 3


class TestCompare:
    def test_前後の件数と平均を返す(self):
        logs = [
            log("2026-08-01", created="ああ"),      # 2
            log("2026-08-02", created="いいいい"),  # 4
            log("2026-08-07", created="うううううう"),  # 6
        ]
        c = metrics.compare(logs, "2026-08-06")
        assert c["before_n"] == 2
        assert c["after_n"] == 1
        assert c["before_avg_chars"] == pytest.approx(3.0)
        assert c["after_avg_chars"] == pytest.approx(6.0)

    def test_母数が小さければ信頼しない(self):
        logs = [log("2026-08-01", created="あ"), log("2026-08-07", created="い")]
        assert metrics.compare(logs, "2026-08-06")["reliable"] is False

    def test_両側が閾値に達して初めて信頼する(self):
        n = metrics.SMALL_SAMPLE
        # 月をまたいで日付を作る。f"2026-08-{d:02d}" だと 08-32 のような
        # 存在しない日ができ、_parse に落とされて件数が静かに減る
        def days_from(start, count):
            return [log(str(start + timedelta(days=i)), created="あ") for i in range(count)]

        before = days_from(date(2026, 6, 1), n)
        after = days_from(date(2026, 8, 6), n)
        assert metrics.compare(before + after, "2026-08-06")["reliable"] is True
        # 片側だけ足りない場合は信頼しない
        assert metrics.compare(before + after[:1], "2026-08-06")["reliable"] is False

    def test_項目ごとの前後を返す(self):
        rows = metrics.compare([
            log("2026-08-01", created="あ"),
            log("2026-08-07", created="い", struggled="う"),
        ], "2026-08-06")["fields"]
        struggled = next(r for r in rows if r["label"] == "困ったこと")
        assert struggled["before_rate"] == 0.0
        assert struggled["after_rate"] == pytest.approx(1.0)


class TestIdeaSummary:
    def test_拾った数を数える(self):
        ideas = [
            {"picked_at": "2026-08-06T00:00:00Z"},
            {"picked_at": None},
            {},
        ]
        assert metrics.idea_summary(ideas) == {"total": 3, "picked": 1}

    def test_未処理という数え方をしない(self):
        # 「残り〇件」を作らないための担保。
        # 溜まっているものは負債ではないので、その名前のキーを持たせない
        keys = metrics.idea_summary([]).keys()
        assert "pending" not in keys
        assert "remaining" not in keys
        assert "undone" not in keys
