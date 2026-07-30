// AIの観察と問いを1組で見せるカード。
// 観察（事実）と問い（余白）を上下に置くだけで、評価や結論は載せない。
export default function PatternCard({ observation, question }) {
  return (
    <div className="bg-sage-light/60 border border-sage/20 rounded-xl px-5 py-4 space-y-2.5">
      <p className="text-sm text-ink leading-relaxed">{observation}</p>
      <p className="text-sm text-ink-soft italic leading-relaxed">{question}</p>
    </div>
  )
}
