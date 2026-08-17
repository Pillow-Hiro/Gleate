import JSZip from 'jszip'

import { logsToMarkdown } from './exportMarkdown'

// Web版。Blob と `<a download>` で落とす
// （`expo-file-system` は Web 向けの解決に失敗するため使わない）。
//
// **写真と添付は入らない。** Web には端末の中の置き場が無いためで、
// これは書き出しの都合ではなく、写真を Web で扱わないという決定の裏返し
// （`lib/photoStore.web.js`）。
//
// それでも ZIP にしているのは、**中身の形をネイティブと揃えるため。**
// 片方が JSON 1枚、片方が ZIP だと、どちらで書き出したかで
// 読み方が変わる。形は同じにして、入っているものだけが違う状態にする。
export async function exportLogs(logs) {
  const stamp = new Date().toISOString().slice(0, 10)
  const zip = new JSZip()

  zip.file('logs.json', JSON.stringify(logs, null, 2))
  zip.file('logs.md', logsToMarkdown(logs, { generatedAt: stamp }))

  // ネイティブと違い、ここは文字だけなので圧縮が効く
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lantern-${stamp}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}
