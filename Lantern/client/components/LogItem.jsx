import { useRef, useState } from 'react'
import { Animated, Easing, Image, LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native'
import Text from './Text'
import LogDetail from './LogDetail'
import { relativeDayLabel } from '../lib/format'
import { stripMarkdown } from '../lib/markdown'

// 一覧の1行。**日付が見出しで、本文の抜粋2行が中身。**
//
// 2026-08-12 に作り直した。それまでは1行に日付と本文を横並びにし、
// 本文を20文字で切っていた。**20文字では何の日か分からない。**
//
// デザイン案（Stitch）は「日時 → 見出し → 抜粋2行」の形をとる。
// Lantern は記録にタイトルを持たせないと決めたので、
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
  // 山形の向きと、中身の濃さ
  const turn = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(0)).current

  function toggle() {
    const next = !open
    LayoutAnimation.configureNext(EXPAND)
    setOpen(next)
    Animated.parallel([
      Animated.timing(turn, {
        toValue: next ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: next ? 1 : 0,
        // **開くときは少し待つ**（2026-08-15）。
        // 高さが伸びるより先に文字が出ると、動きと中身が別々に見えた。
        // 閉じるときは待たない。中身が残ったまま畳むとちらつく
        delay: next ? 120 : 0,
        duration: next ? 260 : 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }
  // **抜粋では記法を外す。** `**` が残ると、装飾ではなく文字として読まれる。
  // 抜粋は2行しか出ないので、太字にしても区別が付かない
  const body = stripMarkdown(SNAPSHOT_ORDER.map((k) => log[k]).find(Boolean) || '')

  return (
    // 区切り線は行の下に置き、カードの左右の余白の分だけ内側に入る。
    // DESIGN.md の「Dividers should have horizontal insets」。
    // **最後の行には引かない。** カードの縁と二重になる。
    <View className={isLast ? '' : 'border-b border-border'}>
      <Pressable onPress={toggle} className="py-3.5 gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-label text-label-md text-outline">
            {relativeDayLabel(log.date)}
          </Text>
          <View className="flex-row items-center gap-3">
            {/* お気に入り。**数を出さない。**
                多い/少ないを評価しないため（CLAUDE.md）。
                押せる範囲は 44px 以上（HIG）。 */}
            {onToggleFavorite ? (
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
            {/* 山形は回す。**字を差し替えない。**
                差し替えると、開く動きと無関係に一瞬で変わる */}
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: turn.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
              }}
            >
              <Text className="text-outline text-label-md">⌄</Text>
            </Animated.View>
          </View>
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
