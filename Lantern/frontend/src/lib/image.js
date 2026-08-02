// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。

// --- 寸法計算 ---
// この区間は frontend/src/lib/image.js と mobile/lib/image.js で同一に保つこと。
// frontend/src/lib/image.test.js が一致を検証している。

export const PHOTO_MAX_EDGE = 1600
export const THUMB_MAX_EDGE = 400
export const PHOTO_QUALITY = 0.8
export const THUMB_QUALITY = 0.7

// 縦横比を保ったまま長辺を maxEdge に収める。元が小さければ拡大しない。
export function fitWithin(width, height, maxEdge) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
// --- ここまで ---

// File を指定サイズのJPEG Blobに変換する。
async function toJpegBlob(file, maxEdge, quality) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の変換に失敗しました'))),
      'image/jpeg',
      quality
    )
  })
}

// 本体とサムネイルの2つを作る。
export async function compressPhoto(file) {
  const [photo, thumb] = await Promise.all([
    toJpegBlob(file, PHOTO_MAX_EDGE, PHOTO_QUALITY),
    toJpegBlob(file, THUMB_MAX_EDGE, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
