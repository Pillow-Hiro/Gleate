import { useState } from 'react'
import { Linking, Modal, Pressable, TextInput, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import Text from './Text'
import { add as addMusic, list as listMusic, remove as removeMusic } from '../lib/musicStore'

// 記録に添えるものの入口。**ひとつにまとめた**（2026-09-05・作者の指示
// 「写真を追加だけでなく、ファイルも同じ点から選べるようにしたい」）。
//
// それまでは写真が「写真を追加」の面を持ち、ファイルは別の字だった。
// 添えるものが3つになったので、**入口も3つに増える**ところだった。
//
// 「写真を追加」という字もやめた（作者の指示）。**添えるのは写真だけ
// ではない。**「＋ 添える」なら、増えても字を変えなくていい。
//
// ## 音楽はリンクを貼る
//
// Spotify と Apple Music の共有リンクを受ける（`lib/musicLink.js`）。
// **曲名を取りに行かない。**このアプリは記録の中身を外へ出さない設計で、
// 「いま何を聴いていたか」を外部へ知らせる通信を黙って足さない。
// 読めるのは URL に書いてあることだけ。押せば本物のアプリが開く。

function Photo({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

function Note({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l11-2v13" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.8" />
      <Circle cx="17" cy="16" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  )
}

const INK = '#847563'

function Choice({ Icon, label, onPress, isLast }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`flex-row items-center gap-3 py-4 min-h-touch active:opacity-70 ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      <Icon color={INK} />
      <Text className="text-body-md text-on-surface">{label}</Text>
    </Pressable>
  )
}

/**
 * `onPhoto` / `onFile` … それぞれの選び方は呼ぶ側が持つ。
 * 音楽だけはここで受ける（貼るだけなので、外に出す手続きが無い）。
 */
export default function AttachRow({ id, onPhoto, onFile, onChange }) {
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [url, setUrl] = useState('')
  const [bad, setBad] = useState(false)

  function pick(run) {
    setOpen(false)
    // 面が閉じてから開く。重ねると、選ぶ画面の下に残る
    setTimeout(run, 250)
  }

  function submit() {
    if (!addMusic(id, url)) {
      setBad(true)
      return
    }
    setUrl('')
    setBad(false)
    setAsking(false)
    onChange?.()
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="この記録に添える"
        hitSlop={8}
        className="flex-row items-center gap-1.5 self-start border border-outline-variant rounded-full px-3 py-1.5 active:opacity-70"
      >
        <Text className="text-label-md text-primary">＋</Text>
        <Text className="text-label-md text-on-surface-variant">添える</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-t-2xl px-5 pt-5 pb-8" onPress={() => {}}>
            <View className="self-center w-10 h-1 rounded-full bg-outline-variant mb-4" />
            <Choice Icon={Photo} label="写真" onPress={() => pick(onPhoto)} />
            <Choice Icon={Clip} label="ファイル" onPress={() => pick(onFile)} />
            <Choice
              Icon={Note}
              label="音楽"
              isLast
              onPress={() => pick(() => { setAsking(true); setBad(false) })}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 音楽。**リンクを貼るだけ。** Spotify と Apple Music の
          共有リンクを受ける（`lib/musicLink.js`）。
          題名や説明が前後に付いていても、中から URL を拾う */}
      <Modal
        visible={asking}
        animationType="fade"
        transparent
        onRequestClose={() => setAsking(false)}
      >
        <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={() => setAsking(false)}>
          <Pressable className="bg-surface rounded-2xl px-5 py-5 gap-4" onPress={() => {}}>
            <Text className="font-strong text-body-md text-on-surface">音楽を添える</Text>
            <Text className="text-label-md text-outline leading-relaxed">
              Spotify か Apple Music の共有リンクを貼ってください。
            </Text>
            <TextInput
              value={url}
              onChangeText={(v) => { setUrl(v); setBad(false) }}
              placeholder="https://open.spotify.com/..."
              placeholderTextColor="#8E8478"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              className="bg-surface-low rounded px-3 py-3 min-h-touch font-body text-body-md text-on-surface"
            />
            {bad ? (
              <Text className="text-label-md text-error">
                Spotify か Apple Music のリンクが見つかりませんでした。
              </Text>
            ) : null}
            <View className="flex-row justify-end items-center gap-4">
              <Pressable onPress={() => setAsking(false)} hitSlop={8} className="py-1">
                <Text className="text-label-md text-outline">やめる</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={!url.trim()}
                hitSlop={8}
                className="bg-lantern-glow rounded-full px-4 py-2 disabled:opacity-50"
              >
                <Text className="font-strong text-label-md text-on-lantern">添える</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

/** 添えた音楽の一覧。**押すと本物のアプリが開く** */
export function MusicList({ id, onChange }) {
  const items = listMusic(id)
  if (items.length === 0) return null

  async function open(url) {
    try {
      await Linking.openURL(url)
    } catch (e) {
      console.warn('[音楽] 開けなかった', e)
    }
  }

  return (
    <View className="bg-surface-lowest border border-border rounded-lg overflow-hidden">
      {items.map((item, i) => (
        <View
          key={item.url}
          className={`flex-row items-center gap-3 px-4 py-3 ${
            i === items.length - 1 ? '' : 'border-b border-border'
          }`}
        >
          <Note color={INK} />
          <Pressable onPress={() => open(item.url)} className="flex-1 min-h-touch justify-center">
            <Text className="text-body-md text-on-surface" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-label-sm text-outline mt-0.5">{item.serviceLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => { removeMusic(id, item.url); onChange?.() }}
            accessibilityLabel={`${item.label} を外す`}
            hitSlop={8}
            className="min-h-touch justify-center px-1"
          >
            <Text className="text-label-md text-outline">✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}
