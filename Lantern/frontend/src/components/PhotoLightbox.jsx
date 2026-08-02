import { useEffect } from 'react'

// 添付した写真を全画面で見る。
// サムネイルではなく本体（photo_url）を渡すこと。縮小版を拡大しても意味がない。
// 記録モーダルが z-50 のため、その上に出るよう z-60 を使う。
export default function PhotoLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return undefined

    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    // 背面がスクロールすると、閉じたときに別の位置に戻ってしまう
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [src, onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="写真"
    >
      {/* 画像自体のクリックでは閉じない。誤操作で閉じると見返すたびに開き直しになる */}
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={e => e.stopPropagation()}
      />
      {/* 背景の onClick に伝播させない。伝播すると onClose が2回呼ばれる */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="閉じる"
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-2"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" viewBox="0 0 18 18">
          <line x1="3" y1="3" x2="15" y2="15" />
          <line x1="15" y1="3" x2="3" y2="15" />
        </svg>
      </button>
    </div>
  )
}
