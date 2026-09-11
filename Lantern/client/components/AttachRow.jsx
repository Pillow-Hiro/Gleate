import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import Text from './Text'
import Sheet from './Sheet'
import SwipeRow from './SwipeRow'
import { add as addLink, hideSound, list as listLinks, recentSounds, remove as removeLink } from '../lib/linkStore'
import { KINDS } from '../lib/attachLink'
import { parseSongs, searchPath, songLabel } from '../lib/musicSearch'
import { useKeyboardHeight } from '../lib/keyboard'
import { authFetch } from '../lib/supabase'

// 記録に添えるものの入口。**ひとつにまとめた**（2026-09-05・作者の指示
// 「写真を追加だけでなく、ファイルも同じ点から選べるようにしたい」）。
//
// それまでは写真が「写真を追加」の面を持ち、ファイルは別の字だった。
// 添えるものが3つになったので、**入口も3つに増える**ところだった。
//
// 「写真を追加」という字もやめた（作者の指示）。**添えるのは写真だけ
// ではない。**「＋ 添える」なら、増えても字を変えなくていい。
//
// ## リンクは貼るだけ
//
// Spotify・Apple Music・YouTube と、**知らない場所も受ける**
// （`lib/attachLink.js`）。はじめは音楽だけだったが、作者から
// 「YouTube や他のリンクも」と言われて広げた。
//
// **題名を取りに行かない。**このアプリは記録の中身を外へ出さない設計で、
// 「何を見て、何を聴いていたか」を外部へ知らせる通信を黙って足さない。
// 読めるのは URL に書いてあることだけ。押せば本物のアプリが開く。
//
// ## 探すのは別（2026-09-05）
//
// Apple Music だけ、**探して選べる。**貼るには一度あちらのアプリへ行って
// 共有して戻る必要があり、書いている最中の手間としては重い。
//
// **上の禁を破っていない。線引きは「黙って」の側にある。**
// 送るのは本人が探すために打った言葉で、記録の中身ではない
// （`lib/musicSearch.js` に理由、`modules/applemusic.py` に通信）。
//
// だから**押して初めて探す。**打つたびに送ると、消した言葉まで
// Apple に届く。自動で探す作りにしないこと。

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

function Play({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="2.5" y="5" width="19" height="14" rx="3.5" stroke={color} strokeWidth="1.8" />
      <Path d="M10.5 9.5l4.5 2.5-4.5 2.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  )
}

function Link({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13.5a4 4 0 006 .5l2.5-2.5a4 4 0 00-5.7-5.7L11.5 7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M14 10.5a4 4 0 00-6-.5L5.5 12.5a4 4 0 005.7 5.7L12.5 17"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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
 * リンクだけはここで受ける（貼るだけなので、外に出す手続きが無い）。
 */
export default function AttachRow({ id, onPhoto, onFile, onChange }) {
  // **測って自分で空ける**（`lib/keyboard.js`）
  const keyboardHeight = useKeyboardHeight()
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const [url, setUrl] = useState('')
  const [bad, setBad] = useState(false)

  // 探すほう。`done` は「一度探した」の印——**探す前に「見つかりません」と
  // 出さない**ため。空の一覧は、探していないのか無かったのか区別が要る
  const [seeking, setSeeking] = useState(false)
  const [term, setTerm] = useState('')
  const [songs, setSongs] = useState([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [offline, setOffline] = useState(false)
  const [recent, setRecent] = useState([])

  function pick(run) {
    setOpen(false)
    // 面が閉じてから開く。重ねると、選ぶ画面の下に残る
    setTimeout(run, 250)
  }

  function submit() {
    if (!addLink(id, url)) {
      setBad(true)
      return
    }
    setUrl('')
    setBad(false)
    setAsking(false)
    onChange?.()
  }

  function openSeek() {
    setTerm('')
    setSongs([])
    setDone(false)
    setOffline(false)
    // **前に添えたもの。**端末の中だけを見る（`lib/musicSearch.js`）
    setRecent(recentSounds(4))
    setSeeking(true)
  }

  // **押して初めて出る。**打つたびに送らない（冒頭の節）
  async function seek() {
    const path = searchPath(term)
    if (!path || busy) return
    setBusy(true)
    setOffline(false)
    try {
      const res = await authFetch(path)
      // 鍵が入っていなければ 503。**繋がっていないものとして扱う**
      if (!res.ok) throw new Error(String(res.status))
      setSongs(parseSongs(await res.json()))
    } catch (e) {
      console.warn('[Apple Music] 探せなかった', e)
      setSongs([])
      setOffline(true)
    } finally {
      setBusy(false)
      setDone(true)
    }
  }

  // **選んだときに見えていた字を、そのまま残す**（`lib/musicSearch.js`）
  function take(song) {
    if (!addLink(id, song.url, songLabel(song))) return
    setSeeking(false)
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

      {/* **上へ引き上げられる**（`components/Sheet.jsx`）。つまみを掴んで動かす */}
      <Sheet visible={open} onClose={() => setOpen(false)}>
            <Choice Icon={Photo} label="写真" onPress={() => pick(onPhoto)} />
            <Choice Icon={Clip} label="ファイル" onPress={() => pick(onFile)} />
            <Choice
              Icon={Link}
              label="リンク"
              onPress={() => pick(() => { setAsking(true); setBad(false) })}
            />
            {/* **貼るのと並べる。**どちらもリンクになるので隣に置く。
                探すのは Apple Music だけ——他は貼る道が残っている */}
            <Choice
              Icon={Note}
              label="Apple Music から探す"
              isLast
              onPress={() => pick(openSeek)}
            />
      </Sheet>

      {/* リンク。**貼るだけ。** Spotify・Apple Music・YouTube と、
          知らない場所も受ける（`lib/attachLink.js`）。
          題名や説明が前後に付いていても、中から URL を拾う */}
      <Modal
        visible={asking}
        animationType="fade"
        transparent
        onRequestClose={() => setAsking(false)}
      >
        {/* **キーボードに隠れない**（2026-09-05・実機で報告）。
            測って自分で空ける——`KeyboardAvoidingView` はこの構成では
            当てにできない（`lib/keyboard.js` の註釈）。
            **一度そちらで書いて、決定に反していた。** */}
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          style={{ paddingBottom: keyboardHeight }}
          onPress={() => setAsking(false)}
        >
          <Pressable className="bg-surface rounded-2xl px-5 py-5 gap-4" onPress={() => {}}>
            <Text className="font-strong text-body-md text-on-surface">リンクを添える</Text>
            <Text className="text-label-md text-outline leading-relaxed">
              曲でも動画でも記事でも。共有リンクをそのまま貼ってください。
            </Text>
            <TextInput
              value={url}
              onChangeText={(v) => { setUrl(v); setBad(false) }}
              placeholder="https://..."
              placeholderTextColor="#8E8478"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              className="bg-surface-low rounded px-3 py-3 min-h-touch font-body text-body-md text-on-surface"
            />
            {bad ? (
              <Text className="text-label-md text-error">
                リンクが見つかりませんでした。
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

      {/* Apple Music で探す。**押して初めて出る**（冒頭の節） */}
      {/* **真ん中に置く**（2026-09-09・作者の指示
          「リンクを貼る時みたいに真ん中に入力フィールドを置く」）。

          下から出す面につまみを付けて引き上げられるようにしたが、
          **効いていなかった**——つまみの `PanResponder` を親の
          `Pressable` が先に取っていた。作者から「タブの昇降ができない」。

          リンクを貼る面と同じ作りにする。**このアプリで既に動いている形**で、
          仕組みを増やさない。結果は中で流す（下の `max-h-64`）。 */}
      <Modal
        visible={seeking}
        animationType="fade"
        transparent
        onRequestClose={() => setSeeking(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          style={{ paddingBottom: keyboardHeight }}
          onPress={() => setSeeking(false)}
        >
          <Pressable className="bg-surface rounded-2xl px-5 py-5 gap-4" onPress={() => {}}>
            {/* **閉じるを上にも置く。**下は結果とキーボードで埋まるので、
                指がいちばん届きにくい所に唯一の出口があった */}
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="font-strong text-body-md text-on-surface">
                  Apple Music から探す
                </Text>
              </View>
              <Pressable
                onPress={() => setSeeking(false)}
                accessibilityLabel="閉じる"
                hitSlop={12}
                className="min-w-touch min-h-touch items-center justify-center rounded-full active:bg-surface-high"
              >
                <Text className="text-body-md text-outline">✕</Text>
              </Pressable>
            </View>
            {/* **何が外に出るかを書く。**黙って送らない、と決めてある */}
            <Text className="text-label-md text-outline leading-relaxed">
              曲名かアーティストを入れて、押すと探します。送るのは打った言葉だけで、
              記録の中身は送りません。
            </Text>

            <View className="flex-row items-center gap-2">
              <TextInput
                value={term}
                onChangeText={setTerm}
                placeholder="曲名、アーティスト"
                placeholderTextColor="#8E8478"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={seek}
                className="flex-1 bg-surface-low rounded px-3 py-3 min-h-touch font-body text-body-md text-on-surface"
              />
              <Pressable
                onPress={seek}
                disabled={!term.trim() || busy}
                hitSlop={8}
                className="bg-lantern-glow rounded-full px-4 py-2 min-h-touch justify-center disabled:opacity-50"
              >
                <Text className="font-strong text-label-md text-on-lantern">探す</Text>
              </Pressable>
            </View>

            {busy ? (
              <View className="py-6 items-center">
                <ActivityIndicator color={INK} />
              </View>
            ) : songs.length > 0 ? (
              // **面の中で流す。**真ん中の面は伸びないので、
              // 結果が多いときはここが動く
              <ScrollView className="max-h-64" keyboardShouldPersistTaps="handled">
                {songs.map((song, i) => (
                  <Pressable
                    key={song.url}
                    onPress={() => take(song)}
                    className={`py-3 min-h-touch justify-center active:opacity-70 ${
                      i === songs.length - 1 ? '' : 'border-b border-border'
                    }`}
                  >
                    <Text className="text-body-md text-on-surface" numberOfLines={1}>
                      {song.title || '題名のない曲'}
                    </Text>
                    {song.artist ? (
                      <Text className="text-label-sm text-outline mt-0.5" numberOfLines={1}>
                        {song.artist}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : offline ? (
              <Text className="text-label-md text-error py-2">
                いまは探せません。リンクを貼るほうは使えます。
              </Text>
            ) : done ? (
              // **探す前には出さない。**`done` はそのための印
              <Text className="text-label-md text-outline py-2">
                見つかりませんでした。
              </Text>
            ) : recent.length > 0 ? (
              // **打たずに選べる道**（2026-09-06・作者の求め）。
              // 名前で嘘をつかない——これは「最近聴いた曲」ではなく、
              // **この人が前に添えたもの。**端末の中だけを見ている
              <View>
                <Text className="text-label-sm text-outline mb-1">
                  前に添えた曲（横に払うと消せます）
                </Text>
                {recent.map((item, i) => (
                  // **横に払うとゴミ箱**（2026-09-11・作者の指示）。
                  // 消すのは候補から伏せるだけで、**元の記録は触らない**
                  // （`lib/linkStore.js` の `hideSound`）
                  <SwipeRow
                    key={item.url}
                    label={`${item.label || item.url} を候補から消す`}
                    rowClassName="bg-surface"
                    className={i === recent.length - 1 ? '' : 'border-b border-border'}
                    onDelete={() => {
                      hideSound(item.url)
                      setRecent(recentSounds(4))
                    }}
                  >
                    <Pressable
                      onPress={() => take({ url: item.url, title: item.label, artist: '' })}
                      className="px-1 py-3 min-h-touch justify-center active:opacity-70"
                    >
                      <Text className="text-body-md text-on-surface" numberOfLines={1}>
                        {item.label || item.url}
                      </Text>
                    </Pressable>
                  </SwipeRow>
                ))}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

/** 添えたリンクの一覧。**押すと本物のアプリが開く** */
export function LinkList({ id, onChange }) {
  const items = listLinks(id)
  if (items.length === 0) return null

  async function open(url) {
    try {
      await Linking.openURL(url)
    } catch (e) {
      console.warn('[リンク] 開けなかった', e)
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
          {/* **区分で印を変える。**音・映像・それ以外（`lib/attachLink.js`）。
              一覧に混ざるので、押す前にどれか分かる方がいい */}
          {item.family === KINDS.sound ? (
            <Note color={INK} />
          ) : item.family === KINDS.video ? (
            <Play color={INK} />
          ) : (
            <Link color={INK} />
          )}
          <Pressable onPress={() => open(item.url)} className="flex-1 min-h-touch justify-center">
            <Text className="text-body-md text-on-surface" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-label-sm text-outline mt-0.5">{item.serviceLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => { removeLink(id, item.url); onChange?.() }}
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
