import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

// ネイティブ版。一時ファイルに書き出して共有シートに渡す。
// Web版は exportLogs.web.js（Metroがプラットフォームで自動選択する）。
//
// SDK 57 で API が変わっている。
// 以前は FileSystem.cacheDirectory と writeAsStringAsync を使っていたが、
// SDK 57 の expo-file-system は主エントリからこれらを外し、
// 呼ぶと実行時に投げるようになった。
// **ネイティブを配布していなかったため気づけていなかった**（Web は .web.js を使う）。
// 2026-08-06 に File / Directory / Paths のAPIへ直した。
export async function exportLogs(logs) {
  const filename = `lantern-logs-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File(new Directory(Paths.cache), filename)

  // 同じ日に2回書き出すと既存ファイルが残っているため上書きする
  file.create({ overwrite: true })
  file.write(JSON.stringify(logs, null, 2))

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing unavailable')
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' })
}
