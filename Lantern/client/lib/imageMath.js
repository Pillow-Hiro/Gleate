// 記録に添える写真の縮小寸法の計算。
//
// このファイルは import を持たない。
// expo-image-manipulator を読み込む image.js から切り離すことで、
// テストがプラットフォームAPIの mock なしで書ける。

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
