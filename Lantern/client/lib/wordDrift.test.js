import { describe, expect, it } from 'vitest'
import { countWords, extractWords, monthDrift, previousMonth, topWords } from './wordDrift'

describe('語の切り出し', () => {
  // 助詞と活用は平仮名に寄るので、平仮名だけの連なりを捨てると
  // **残るのはだいたい名詞**になる（`lib/wordDrift.js`）
  it('漢字とカタカナと英字を拾い、平仮名は捨てる', () => {
    expect(extractWords('配信の準備をした')).toEqual(['配信', '準備'])
    expect(extractWords('サムネイルを作り直した')).toContain('サムネイル')
    expect(extractWords('OBS の設定を直した')).toContain('OBS')
  })

  it('1文字は拾わない', () => {
    // 「日」「人」はどの月にも出るので、違いが見えない
    expect(extractWords('日を見た')).toEqual([])
  })

  it('どの月にも出る語は捨てる', () => {
    expect(extractWords('今日は自分の時間')).toEqual([])
  })

  it('空でも落ちない', () => {
    expect(extractWords('')).toEqual([])
    expect(extractWords(null)).toEqual([])
    expect(extractWords(undefined)).toEqual([])
  })

  // `g` 付きの正規表現は `lastIndex` を持ち回る。
  // **戻し忘れると2回目から拾い漏らす**
  it('続けて呼んでも同じ結果になる', () => {
    const once = extractWords('配信の準備')
    expect(extractWords('配信の準備')).toEqual(once)
    expect(extractWords('配信の準備')).toEqual(once)
  })
})

describe('countWords', () => {
  it('4項目ぜんぶから数える', () => {
    const counts = countWords([
      { created: '配信', enjoyable: '編集', struggled: '準備', next: '告知' },
    ])
    expect([...counts.keys()].sort()).toEqual(['準備', '告知', '配信', '編集'].sort())
  })

  // 作者から「**1個の記録に何度もカウントしている例もあった**」
  // （2026-09-13）。数えるのは打った回数ではなく、**出てきた記録の数**
  it('1件の記録に何度出ても1つ', () => {
    const counts = countWords([{ created: '配信 配信 配信', enjoyable: '配信' }])
    expect(counts.get('配信')).toBe(1)
  })

  it('別の記録に出たぶんは足される', () => {
    const counts = countWords([{ created: '配信 配信' }, { created: '配信' }])
    expect(counts.get('配信')).toBe(2)
  })

  it('空の記録でも落ちない', () => {
    expect(countWords([{}, { created: null }]).size).toBe(0)
    expect(countWords(null).size).toBe(0)
  })
})

describe('previousMonth', () => {
  it('1つ前の月を返す', () => {
    expect(previousMonth('2026-09')).toBe('2026-08')
  })

  it('年をまたぐ', () => {
    expect(previousMonth('2026-01')).toBe('2025-12')
  })

  it('読めない値は空', () => {
    expect(previousMonth('')).toBe('')
    expect(previousMonth('nope')).toBe('')
  })
})

describe('月の移り変わり', () => {
  const logs = [
    // 8月
    { date: '2026-08-03', created: '配信 配信 編集' },
    { date: '2026-08-10', created: '配信 編集' },
    // 9月
    { date: '2026-09-01', created: '配信 台本' },
    { date: '2026-09-02', created: '配信 台本' },
  ]

  it('今月から出てきた語', () => {
    const { appeared } = monthDrift(logs, '2026-09')
    expect(appeared.map((w) => w.word)).toEqual(['台本'])
  })

  it('先月まで出ていた語', () => {
    const { left } = monthDrift(logs, '2026-09')
    expect(left.map((w) => w.word)).toEqual(['編集'])
  })

  it('どちらの月にもある語', () => {
    const { kept } = monthDrift(logs, '2026-09')
    expect(kept.map((w) => w.word)).toEqual(['配信'])
  })

  // **1回だけの語は出さない。** 打ち間違いや固有名詞が1つ混ざるたびに
  // 「出てきた言葉」に並ぶと、移り変わりが読めなくなる
  it('1回だけの語は出さない', () => {
    const withNoise = [...logs, { date: '2026-09-03', created: '誤変換' }]
    const { appeared } = monthDrift(withNoise, '2026-09')
    expect(appeared.map((w) => w.word)).not.toContain('誤変換')
  })

  it('件数の多い順に並ぶ', () => {
    const many = [
      { date: '2026-09-01', created: '台本 収録' },
      { date: '2026-09-02', created: '台本 収録' },
      { date: '2026-09-03', created: '台本' },
    ]
    expect(monthDrift(many, '2026-09').appeared.map((w) => w.word)).toEqual(['台本', '収録'])
  })

  // **日によって並びが変わると、同じものを見ている感じがしない**
  it('同数なら語順で決まる', () => {
    const tie = [
      { date: '2026-09-01', created: '収録 台本' },
      { date: '2026-09-02', created: '収録 台本' },
    ]
    const once = monthDrift(tie, '2026-09').appeared.map((w) => w.word)
    expect(monthDrift(tie, '2026-09').appeared.map((w) => w.word)).toEqual(once)
  })

  it('先月が無ければ、今月のものは全部「出てきた」', () => {
    const only = [
      { date: '2026-09-01', created: '台本' },
      { date: '2026-09-02', created: '台本' },
    ]
    const { appeared, left } = monthDrift(only, '2026-09')
    expect(appeared.map((w) => w.word)).toEqual(['台本'])
    expect(left).toEqual([])
  })

  it('記録が無くても落ちない', () => {
    const drift = monthDrift([], '2026-09')
    expect(drift.appeared).toEqual([])
    expect(drift.left).toEqual([])
    expect(drift.kept).toEqual([])
    expect(drift.previous).toBe('2026-08')
  })

  it('出す数を絞れる', () => {
    const many = [
      { date: '2026-09-01', created: '台本 収録 編集 配信 準備' },
      { date: '2026-09-02', created: '台本 収録 編集 配信 準備' },
    ]
    expect(monthDrift(many, '2026-09', { limit: 2 }).appeared).toHaveLength(2)
  })
})

describe('よく書いている言葉（1つにまとめたもの）', () => {
  const log = (date, text) => ({ date, created: text })

  it('今月の語を件数の多い順に出す', () => {
    const logs = [
      log('2026-09-01', '配信 制作'),
      log('2026-09-02', '配信 制作'),
      log('2026-09-03', '配信'),
    ]
    const { top } = topWords(logs, '2026-09')
    expect(top.map((w) => w.word)).toEqual(['配信', '制作'])
    expect(top[0].count).toBe(3)
  })

  // **これが「まとめた」ということ。**断面の中に差分の印が乗る
  it('先月に無かった語へ印を付ける', () => {
    const logs = [
      log('2026-08-01', '制作'),
      log('2026-08-02', '制作'),
      log('2026-09-01', '配信 制作'),
      log('2026-09-02', '配信 制作'),
    ]
    const { top } = topWords(logs, '2026-09')
    const by = Object.fromEntries(top.map((w) => [w.word, w.isNew]))
    expect(by['配信']).toBe(true)
    expect(by['制作']).toBe(false)
  })

  it('先月まで出ていた語は別に出す', () => {
    const logs = [
      log('2026-08-01', '締切'),
      log('2026-08-02', '締切'),
      log('2026-09-01', '配信'),
      log('2026-09-02', '配信'),
    ]
    const { top, left } = topWords(logs, '2026-09')
    expect(top.map((w) => w.word)).toEqual(['配信'])
    expect(left.map((w) => w.word)).toEqual(['締切'])
  })

  // **数は数えた結果。**Claude に数えさせていたときは合っていなかった
  it('件数がぴったり合う', () => {
    const logs = [
      log('2026-09-01', '制作 制作 制作 配信'),
      log('2026-09-02', '制作 配信'),
      log('2026-09-03', '制作'),
    ]
    const { top } = topWords(logs, '2026-09')
    expect(top.find((w) => w.word === '制作').count).toBe(3)
    expect(top.find((w) => w.word === '配信').count).toBe(2)
  })

  // **1日に何度も書いた語が、何か月も続く語と同じ顔にならない**
  it('1件で繰り返しただけの語は、下限に届かない', () => {
    const logs = [log('2026-09-01', '衝動 衝動 衝動 衝動')]
    const { top } = topWords(logs, '2026-09')
    expect(top.map((w) => w.word)).toEqual([])
  })
})
