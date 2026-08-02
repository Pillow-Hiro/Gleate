// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

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

// SDK 57 では manipulateAsync() が非推奨。
// manipulate() -> resize() -> renderAsync() -> saveAsync() のビルダー型APIを使う。
async function toJpeg(uri, width, height, quality) {
  const context = ImageManipulator.manipulate(uri)
  context.resize({ width, height })
  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality })
  return result.uri
}

// 本体とサムネイルの2つを作る。
// Web版は File を受け取るが、ネイティブでは uri と元寸法を受け取る
// （ImagePicker が asset として返すため）。
export async function compressPhoto(uri, originalWidth, originalHeight) {
  const p = fitWithin(originalWidth, originalHeight, PHOTO_MAX_EDGE)
  const t = fitWithin(originalWidth, originalHeight, THUMB_MAX_EDGE)
  const [photo, thumb] = await Promise.all([
    toJpeg(uri, p.width, p.height, PHOTO_QUALITY),
    toJpeg(uri, t.width, t.height, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
