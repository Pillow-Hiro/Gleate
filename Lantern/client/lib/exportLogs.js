import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import JSZip from 'jszip'

import { logsToMarkdown } from './exportMarkdown'
import { exportEntries as photoEntries } from './photoStore'
import { exportEntries as fileEntries } from './fileStore'

// 記録を1つの ZIP にして共有シートに渡す。
// Web版は `exportLogs.web.js`（Metro がプラットフォームで選ぶ）。
//
// SDK 57 で API が変わっている。以前は `FileSystem.cacheDirectory` と
// `writeAsStringAsync` を使っていたが、SDK 57 の expo-file-system は
// 主エントリからこれらを外し、呼ぶと実行時に投げるようになった。
// **ネイティブを配布していなかったため気づけていなかった。**
// 2026-08-06 に File / Directory / Paths の API へ直した。
//
// ## なぜ ZIP にしたのか（2026-08-17）
//
// それまでは JSON 1枚だった。**本文しか入っていなかった。**
//
// 写真と添付は端末の中にしか無い（サーバーに置かないと決めたため）。
// つまり**唯一の原本が端末にあるものが、書き出しても救えなかった。**
// 逆に、すでに Supabase にある本文だけが出ていた。
// 機種変更や紛失で消えるのは写真の方なのに。
//
// ZIP の中身：
//
//     logs.json     機械が読み直すため
//     logs.md       人が読むため。Notion にも Obsidian にも入る
//     photos/       原寸のみ（縮小版は入れない）
//     files/        添えたファイル
//
// ## クラウドへは共有シートから
//
// iOS の共有シートには「"ファイル"に保存」があり、そこから
// **iCloud Drive** を選べる。Google Drive や Dropbox のアプリが
// 入っていればそれらも並ぶ。
//
// **自動で外へ送る仕組みは持たない。** 自動で出るなら、それはもう
// 「端末の中だけ」ではない。出す先を決めるのは利用者。
//
// ## 圧縮しない
//
// 写真はすでに JPEG で、これ以上ほとんど縮まない。
// 圧縮に時間をかけるぶん待たせるだけなので、`STORE`（無圧縮）で束ねる。
const ZIP_OPTIONS = { type: 'uint8array', compression: 'STORE' }

/** 端末の中の1ファイルを ZIP に入れる。**読めなければ飛ばす** */
function addFile(zip, path, uri) {
  try {
    zip.file(path, new File(uri).base64Sync(), { base64: true })
    return true
  } catch (e) {
    // 1枚読めなくても、残りは書き出す
    console.warn(`[書き出し] ${path} を読めなかった`, e)
    return false
  }
}

export async function exportLogs(logs) {
  const stamp = new Date().toISOString().slice(0, 10)
  const zip = new JSZip()

  // 写真と添付を先に集める。**日付で引けるようにしてから Markdown を作る**
  // （同梱できたものだけを Markdown から指すため）
  const photos = new Map()
  for (const entry of photoEntries()) {
    if (addFile(zip, `photos/${entry.name}`, entry.uri)) {
      photos.set(entry.date, entry.name)
    }
  }

  const files = new Map()
  for (const entry of fileEntries()) {
    if (!addFile(zip, `files/${entry.stored}`, entry.uri)) continue
    const list = files.get(entry.date) || []
    // 見せる名前と ZIP の中の名前を分ける。
    // 別の日に同じ名前を添えても、中でぶつからない
    list.push({ name: entry.name, path: entry.stored })
    files.set(entry.date, list)
  }

  zip.file('logs.json', JSON.stringify(logs, null, 2))
  zip.file('logs.md', logsToMarkdown(logs, { photos, files, generatedAt: stamp }))

  const bytes = await zip.generateAsync(ZIP_OPTIONS)

  const out = new File(new Directory(Paths.cache), `lantern-${stamp}.zip`)
  // 同じ日に2回書き出すと既存が残っているため上書きする
  out.create({ overwrite: true })
  out.write(bytes)

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing unavailable')
  }
  await Sharing.shareAsync(out.uri, { mimeType: 'application/zip', UTI: 'public.zip' })
}
