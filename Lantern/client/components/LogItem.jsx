import { useRef, useState } from 'react'
import { Animated, Easing, Image, LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native'
import Text from './Text'
import LogDetail from './LogDetail'
import { relativeDayLabel } from '../lib/format'
import { stripMarkdown } from '../lib/markdown'
import { useThemeContext } from '../lib/theme'
import { accentColor } from '../lib/accent'

// 一覧の1行。**日付が見出しで、本文の抜粋2行が中身。**
//
// 2026-08-12 に作り直した。それまでは1行に日付と本文を横並びにし、
// 本文を20文字で切っていた。**20文字では何の日か分からない。**
//
// デザイン案（Stitch）は「日時 → 見出し → 抜粋2行」の形をとる。
// Gleate は記録にタイトルを持たせないと決めたので、
// **日付が見出しの役をする。** その下に本文を2行まで出す。
//
// 2行にしているのは案のとおり。1行だと文が途中で切れて意味が取れず、
// 3行だと一覧が縦に伸びて「探す」ための一覧でなくなる。
const SNAPSHOT_ORDER = ['created', 'enjoyable', 'struggled', 'next']

// Android では明示的に許可しないと `LayoutAnimation` が効かない。
// **一度だけ。** 描画のたびに呼ぶと警告が出る。
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// 開くときの動き。**高さは OS に補間させ、中身は自分で薄く出す。**
// 高さを自分で測ると、記録の長さごとに測り直すことになる。
const EXPAND = {
  duration: 220,
  update: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
}

export default function LogItem({ log, onDelete, onUpdate, onToggleFavorite, isLast }) {
  const [open, setOpen] = useState(false)
  const { accent, isDark } = useThemeContext()
  // 中身の濃さ
  const fade = useRef(new Animated.Value(0)).current

  function toggle() {
    const next = !open
    LayoutAnimation.configureNext(EXPAND)
    setOpen(next)
    Animated.timing(fade, {
      toValue: next ? 1 : 0,
      // **開くときは少し待つ**（2026-08-15）。
      // 高さが伸びるより先に文字が出ると、動きと中身が別々に見えた。
      // 閉じるときは待たない。中身が残ったまま畳むとちらつく
      delay: next ? 120 : 0,
      duration: next ? 260 : 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }
  // **抜粋では記法を外す。** `**` が残ると、装飾ではなく文字として読まれる。
  // 抜粋は2行しか出ないので、太字にしても区別が付かない
  const body = stripMarkdown(SNAPSHOT_ORDER.map((k) => log[k]).find(Boolean) || '')

  return (
    // 区切り線は行の下に置き、カードの左右の余白の分だけ内側に入る。
    // DESIGN.md の「Dividers should have horizontal insets」。
    // **最後の行には引かない。** カードの縁と二重になる。
    //
    // ## 開いた行は持ち上げる（2026-09-11・作者の指示）
    //
    // 作者から「**開いてるときにどの記録と連結しているかが判別しにくい**」。
    // 原因は間隔ではなく**重さ**だった——開いた行が閉じた行と同じ姿で、
    // 返事が上下どちらの記録のものか形から読めない。
    //
    // 開いている間だけ、区切り線をやめて**自分の輪郭と影を持つ。**
    // 上下に間を空け、月のカードから抜け出て見えるようにする。
    //
    // `-mx-4` と `px-4` が対になっているのは、**開いても字が横へ
    // ずれないようにする**ため。月のカードの余白ぶん外へ出て、
    // 同じだけ内へ戻す。
    //
    // ## 影は `shadow-bloom` のまま
    //
    // 案ではもっと深い影を当てていたが、`CLAUDE.md` が
    // **`shadow-bloom` を上限**と決めている。持ち上げているのは
    // 灯り色の輪郭と、上下の間。
    //
    // 灯り色を使うが「1画面に灯り色を2箇所以上置かない」には触れない
    // ——**開く行は同時にひとつだけ**で、この画面に他の琥珀は無い。
    <View
      className={
        open
          ? '-mx-4 my-2.5 px-4 py-0.5 bg-surface-lowest rounded-lg shadow-bloom'
          : isLast
            ? ''
            : 'border-b border-border'
      }
      style={open ? { borderWidth: 1.5, borderColor: accentColor(accent, isDark) } : null}
    >
      <Pressable onPress={toggle} className="py-3.5 gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-label text-label-md text-outline">
            {relativeDayLabel(log.date)}
          </Text>
          {/* ## 山形をやめた（2026-09-11・作者の指示「開閉マークいらないね」）

              その前に、**星の当たりが山形を食っている**のを直したところ
              （星は 44px ＋ `hitSlop={12}` で、間の `gap-3` 12px を
              丸ごと越えていた）、記号そのものが要らないと判断された。

              **開いているかどうかは、もう形で分かる。**開いた行は月の
              カードから抜け出し、灯り色の輪郭を持つ（下の註釈）。
              **同じことを二度言う記号は置かない。**

              行ぜんたいが押せるので、開く道も無くならない。

              なお、この直しで見つかった「隣り合う `hitSlop` の重なり」は
              `LogDetail` の編集・削除でも起きていた。**そちらは直してある。** */}
          {onToggleFavorite ? (
            // お気に入り。**数を出さない。**
            // 多い/少ないを評価しないため（CLAUDE.md）。
            // 押せる範囲は 44px 以上（HIG）。**隣はもう居ない**ので
            // 左右に分ける必要は無い
            <Pressable
              onPress={() => onToggleFavorite(log)}
              accessibilityLabel={log.favorite ? 'お気に入りを外す' : 'お気に入りに入れる'}
              hitSlop={12}
              className="min-w-touch min-h-touch items-end justify-center"
            >
              <Text className={log.favorite ? 'text-lantern-glow' : 'text-outline'}>
                {log.favorite ? '★' : '☆'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row items-start gap-2.5">
          {/* 写真だけの記録は本文が空になる。
              サムネイルがあれば、何を残した日かが一覧のまま分かる。 */}
          {log.photo_thumb_url ? (
            <Image
              source={{ uri: log.photo_thumb_url }}
              className="rounded"
              style={{ width: 44, height: 44 }}
              resizeMode="cover"
            />
          ) : null}
          {body ? (
            <Text className="text-body-md text-on-surface flex-1" numberOfLines={2}>
              {body}
            </Text>
          ) : (
            <Text className="text-body-md text-outline flex-1">この日の記録があります。</Text>
          )}
        </View>
      </Pressable>

      {open ? (
        <Animated.View className="pb-1" style={{ opacity: fade }}>
          <LogDetail log={log} onDelete={onDelete} onUpdate={onUpdate} />
        </Animated.View>
      ) : null}
    </View>
  )
}
