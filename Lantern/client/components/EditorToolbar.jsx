import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Keyboard, Platform, Pressable, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import Text from './Text'
import { toggleBullet, wrapSelection } from '../lib/markdown'

// キーボードに貼り付く装飾の列。**Apple の「メモ」と同じ置き場所。**
//
// ## なぜ `InputAccessoryView` を使わないか
//
// 2026-08-14 に `InputAccessoryView` で作ったが、**実機で出なかった。**
// RN 0.86（New Architecture）では iOS のこの部品の扱いが変わっており、
// 当てにできない。代わりに**キーボードの高さを測って自分で置く。**
//
// キーボードの出入りは `keyboardWillShow` / `keyboardWillHide` で分かる。
// その高さのぶんだけ下から浮かせれば、キーボードの上に並ぶ。
// 仕組みが RN の標準機能だけなので、指紋も変わらない。
//
// ## なぜ画面の一番外に置くか
//
// 記録フォームの中に置くと `ScrollView` の子になり、**一緒に流れてしまう。**
// 画面の外側（`_layout.jsx`）に1つ置き、
// **いま書いている欄が自分を登録する**形にした。
//
// ## 欄の下には置かない
//
// 2026-08-15 に作者が「入力フィールドの下にある装飾ボタンはいらない」と決めた。
// 書いているあいだキーボードの上にあれば足りる。

const ToolbarContext = createContext({ register: () => {}, release: () => {} })
// いま書いている欄。**別に持つ。**
// `Modal` の中にもう1つ列を置けるようにするため（`RN` の Modal は
// 画面の一番外より上に出るので、根元に置いた列は隠れる）。
const FieldContext = createContext(null)

export function useEditorToolbar() {
  return useContext(ToolbarContext)
}

function Bold({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4h6.5a4 4 0 010 8H7zM7 12h7.5a4 4 0 010 8H7z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Italic({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 4h-5M14 20H9M14 4l-4 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function Bullet({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="7" r="1.6" fill={color} />
      <Circle cx="5" cy="12" r="1.6" fill={color} />
      <Circle cx="5" cy="17" r="1.6" fill={color} />
      <Path d="M10 7h10M10 12h10M10 17h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

function Photo({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4.5" width="18" height="15" rx="2.5" stroke={color} strokeWidth="1.8" />
      <Circle cx="8.5" cy="9.5" r="1.6" fill={color} />
      <Path
        d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Clip({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.4 3.4 0 014.8 4.8L9.7 17.4a1.8 1.8 0 01-2.5-2.5l7.8-7.8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const INK = '#514535'

export function EditorToolbarProvider({ children }) {
  // いま書いている欄。**1つだけ。** 欄を移ると上書きされる
  const [field, setField] = useState(null)
  const fieldRef = useRef(null)

  const register = useCallback((next) => {
    fieldRef.current = next
    setField(next)
  }, [])

  const release = useCallback((owner) => {
    // 別の欄がすでに登録していたら消さない。
    // 欄から欄へ移るとき、離れた方の後始末が後に来ることがある
    if (fieldRef.current?.owner !== owner) return
    fieldRef.current = null
    setField(null)
  }, [])

  const value = useMemo(() => ({ register, release }), [register, release])

  return (
    <ToolbarContext.Provider value={value}>
      <FieldContext.Provider value={field}>
        {children}
        <ToolbarBar field={field} />
      </FieldContext.Provider>
    </ToolbarContext.Provider>
  )
}

// `Modal` の中に置く用。中身は同じ列
export function EditorToolbarBar() {
  return <ToolbarBar field={useContext(FieldContext)} />
}

function ToolbarBar({ field }) {
  const [height, setHeight] = useState(0)
  const slide = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0)
      Animated.timing(slide, {
        toValue: 1,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start()
    })
    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(slide, {
        toValue: 0,
        duration: e?.duration || 200,
        useNativeDriver: true,
      }).start(() => setHeight(0))
    })

    return () => {
      show.remove()
      hide.remove()
    }
  }, [slide])

  // 書いている欄が無いか、キーボードが出ていないときは何も置かない
  if (!field || height === 0) return null

  // **欄が自分で効かせられるならそちらに任せる。**
  // WebView の編集画面は中の選択範囲を持っており、
  // こちらから文字列を組み直すと、その選択が失われる。
  function apply(kind) {
    if (field.exec) {
      field.exec(kind)
      return
    }
    const { value, selection, onChange } = field
    const start = selection?.start ?? value.length
    const end = selection?.end ?? start
    const next =
      kind === 'bullet'
        ? toggleBullet(value, start, end)
        : wrapSelection(value, start, end, kind === 'bold' ? '**' : '*')
    onChange(next.text, next.cursor)
  }

  function dismiss() {
    // WebView の中の欄は `Keyboard.dismiss()` では下りない。
    // 中へ「焦点を外せ」と伝える
    if (field.exec) field.exec('blur')
    Keyboard.dismiss()
  }

  const buttons = [
    { id: 'bold', label: '太字', Icon: Bold, onPress: () => apply('bold') },
    { id: 'italic', label: '斜体', Icon: Italic, onPress: () => apply('italic') },
    { id: 'bullet', label: '箇条書き', Icon: Bullet, onPress: () => apply('bullet') },
  ]
  if (field.onPhoto) {
    buttons.push({ id: 'photo', label: '写真を追加', Icon: Photo, onPress: field.onPhoto })
  }
  if (field.onFile) {
    buttons.push({ id: 'file', label: 'ファイルを追加', Icon: Clip, onPress: field.onFile })
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: height,
        opacity: slide,
      }}
      className="bg-surface-low border-t border-border"
    >
      <View className="flex-row items-center px-3 py-1">
        {buttons.map(({ id, label, Icon, onPress }) => (
          <Pressable
            key={id}
            onPress={onPress}
            accessibilityLabel={label}
            className="min-w-touch min-h-touch items-center justify-center rounded active:bg-surface-high"
          >
            <Icon color={INK} />
          </Pressable>
        ))}

        <View className="flex-1" />

        <Pressable
          onPress={dismiss}
          accessibilityLabel="キーボードを閉じる"
          className="min-h-touch px-3 justify-center active:opacity-70"
        >
          <Text className="font-strong text-label-md text-primary">完了</Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}
