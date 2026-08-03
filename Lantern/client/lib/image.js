// 記録に添える写真の圧縮。
// アーカイブが目的ではないため、画質より軽さを優先する。
// 寸法の計算は imageMath.js にある（純粋関数として単体でテストしている）。

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import {
  fitWithin,
  PHOTO_MAX_EDGE,
  THUMB_MAX_EDGE,
  PHOTO_QUALITY,
  THUMB_QUALITY,
} from './imageMath'

// 呼び出し側が image.js から寸法の定数も取れるようにしておく。
export { fitWithin, PHOTO_MAX_EDGE, THUMB_MAX_EDGE, PHOTO_QUALITY, THUMB_QUALITY }

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
// ImagePicker が asset として uri と元寸法を返すため、それを受け取る。
export async function compressPhoto(uri, originalWidth, originalHeight) {
  const p = fitWithin(originalWidth, originalHeight, PHOTO_MAX_EDGE)
  const t = fitWithin(originalWidth, originalHeight, THUMB_MAX_EDGE)
  const [photo, thumb] = await Promise.all([
    toJpeg(uri, p.width, p.height, PHOTO_QUALITY),
    toJpeg(uri, t.width, t.height, THUMB_QUALITY),
  ])
  return { photo, thumb }
}
