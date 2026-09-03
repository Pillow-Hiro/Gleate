import { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useFocusEffect } from 'expo-router'

// 動きの小物。**ここに集める。**
//
// ## なぜ集めるか
//
// 同じ動きを画面ごとに書くと、速さと跳ね方が少しずつ違ってくる。
// 使う人から見ると「同じアプリの中で物の重さが違う」ことになる。
// **重さは1か所で決める。**
//
// ## どこに付けないか（2026-08-23 に決めた）
//
// - **文字そのもの**。読んでいる最中に動くと読めない
// - **記録の一覧**。並びが動くと、目で追っていた行を見失う
// - **保存の結果**。書いたものが確かに残ったことは、
//   演出ではなく**すぐに**伝わるべき
// - **WebView を抱えた欄**。位置を動かすとちらつく（2026-08-19）
// - **読み込み中の表示**。待ちを飾ると、待ちが長く感じる
//
// 付けるのは「利用者が押した結果、何かが移った・現れた」ときだけ。
// **動きは装飾ではなく、因果の説明**として置く。

/** 生えるときに、下から薄く現れる。**畳むときは動かさない**（消えるものを見せない） */
export function Appear({ children, delay = 0, style }) {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 220,
      delay,
      useNativeDriver: true,
    }).start()
  }, [t, delay])

  return (
    <Animated.View
      style={[
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * 押している間だけ少し縮む。**指の下で物が沈む。**
 *
 * `active:opacity-70` だけだと、色が薄くなるのが分かるだけで
 * 押した手応えが無い。縮みは触覚に近い。
 *
 * `Pressable` を包むのではなく**中身を包む。**当たり判定は変えない
 * （縮んだ状態で指を滑らせても、押した扱いのままにする）。
 */
export function PressBounce({ children, pressed, scale = 0.94, style }) {
  const s = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(s, {
      toValue: pressed ? scale : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 220,
    }).start()
  }, [pressed, s, scale])

  return <Animated.View style={[{ transform: [{ scale: s }] }, style]}>{children}</Animated.View>
}

/**
 * タブを移ったとき、中身が**わずかに明るくなりながら**現れる。
 *
 * タブの棒そのものは `NativeTabs`（iOS 本体）なので、選んだ印の動きは
 * OS が持っている。こちらで足せるのは中身の側だけ。
 *
 * **位置は動かさない。濃さだけ。** 文字が動くと、移った先で
 * 読みはじめる位置を目が探し直すことになる。0.85 から 1 へ、
 * 180ms。「切り替わった」ことだけが伝わればいい。
 *
 * 消えるほうは演出しない。**去る画面を見せる理由がない。**
 */
export function ScreenFade({ children }) {
  const t = useRef(new Animated.Value(1)).current

  useFocusEffect(
    useCallback(() => {
      t.setValue(0.85)
      Animated.timing(t, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    }, [t]),
  )

  return <Animated.View style={{ flex: 1, opacity: t }}>{children}</Animated.View>
}

/**
 * **入り込む。**（2026-09-04・作者の指示「タップしたら入り込む演出」）
 *
 * 全画面の記録（`app/write.jsx`）が開くときの動き。
 * 少し小さいところから、面ごと広がって画面を埋める。
 *
 * 押した紙が**そのまま大きくなった**ように見せるための動きで、
 * 「別の画面へ移った」ではなく「いま見ていたものの中へ入った」と伝える。
 * 紙から入っても右下のボタンから入っても同じ動きにする——
 * 行き先が同じなら、入り方も同じでなければ2つの場所に見える。
 *
 * `0.92` から。これ以上小さくすると、縁から後ろの画面が見えて
 * **小さな窓が開いた**ように読める。入り込む向きが逆になる。
 *
 * `Easing.out` … 出足が速く、着地で緩む。物が手元から離れて
 * 止まるときの減り方で、等速だと機械が動いたように見える。
 *
 * **去るときは動かさない**（`ScreenFade` と同じ判断）。
 * 閉じるのは OS の動きに任せる。
 */
export function ZoomIn({ children, style }) {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [t])

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: t,
          transform: [
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
