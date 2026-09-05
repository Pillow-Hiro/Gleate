import ExpoModulesCore
import SwiftUI
import UIKit

// **ここで読むのは Apple のフレームワーク。**
// Pod 名を LanternJournalingSuggestions に変えてあるので、
// この行は自分自身ではなく iOS 17.2+ の framework を指す
// （経緯は podspec の冒頭）。
#if canImport(JournalingSuggestions)
import JournalingSuggestions
#endif

// Apple の Journaling Suggestions（iOS 17.2+）を Lantern から出す。
//
// ## 何を受け取るか
//
// **文字だけ。** 中身は「ジャーナル」アプリと同じだけ拾うが、
// 写真・動画は取らない（2026-09-05・作者の指示
// 「写真は Lantern 独自の仕様があるので追加しなくていい。それ以外は入れて」）。
//
// - **写真・動画・Live Photo** … 取らない。写真は端末の中だけに置くと
//   決めてある（`REQUIREMENTS.md` F1）。**新しい経路を開けない**
// - **State of Mind** … 取らない。気分の分類そのもので、
//   Insights AI憲法が禁じている。**作者に確認するまで開けない**
// - 場所は**名前だけ。**座標は取らない——一行の文に座標は足さないし、
//   記録はサーバーへ送られる（`modules/logs.py`）
//
// ## 1つではなく、あるものを全部（2026-09-05）
//
// それまでは**最初に取れた1つだけ**を返していた。「ジャーナル」は
// 選んだ候補を丸ごと1件として入れるので、**同じ候補から曲も場所も
// 出ているのに、片方しか入らなかった。**
//
// 順に見て、取れたものを行として積む。並びは
// **問い → 聴いたもの → 行った場所**。問いが先頭なのは、
// それが書きはじめの手がかりとしていちばん強いため。
//
// ## なぜ title で足りないか（2026-08-21）
//
// 最初は `suggestion.title` だけを渡していた。実機で試すと
// 「聴いたミュージック」「クリエイティビティの振り返り」のような
// **分類の名前しか入らなかった。**書きはじめの手がかりにならない。
//
// title は分類で、中身は `content(forType:)` の側にある。
//
//     func content<Content>(forType: Content.Type) async -> [Content]
//
// **Reflection.prompt が本命。** これは Apple が出す振り返りの問いで、
// Lantern が問いを置いている場所とまっすぐ噛み合う。
//
// 取れなければ title に戻す（何も入らないよりはいい）。
public class JournalingSuggestionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("JournalingSuggestions")

    // **出せない端末で入口を描かない**ため、JS 側から先に聞く。
    // できないことをボタンにして置くと、押した人が自分を疑う。
    //
    // 出せないのは3つ。**iPad を含む**（2026-08-19 に
    // supportsTablet を立てたので、ここは実際に効く）。
    Function("isAvailable") { () -> Bool in
      #if targetEnvironment(simulator)
      return false
      #elseif canImport(JournalingSuggestions)
      guard #available(iOS 17.2, *) else { return false }
      return UIDevice.current.userInterfaceIdiom == .phone
      #else
      return false
      #endif
    }

    View(JournalingPickerView.self) {
      Events("onSelect")

      Prop("title") { (view: JournalingPickerView, title: String) in
        view.setTitle(title)
      }
      // SF Symbol の名前。入れると字ではなく記号で描く
      // （装飾ボタンの列に並べるため）
      Prop("icon") { (view: JournalingPickerView, icon: String) in
        view.setIcon(icon)
      }
      // #RRGGBB。列の他のボタンと同じ色にする
      Prop("tint") { (view: JournalingPickerView, tint: String) in
        view.setTint(tint)
      }
    }
  }
}

public class JournalingPickerView: ExpoView {
  let onSelect = EventDispatcher()
  private var host: UIViewController?
  private var title: String = ""
  private var icon: String = ""
  private var tint: String = ""

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    render()
  }

  func setTitle(_ next: String) {
    guard next != title else { return }
    title = next
    render()
  }

  func setIcon(_ next: String) {
    guard next != icon else { return }
    icon = next
    render()
  }

  func setTint(_ next: String) {
    guard next != tint else { return }
    tint = next
    render()
  }

  private func render() {
    host?.view.removeFromSuperview()
    host = nil

    #if canImport(JournalingSuggestions)
    guard #available(iOS 17.2, *) else { return }
    let root = LanternSuggestionsPicker(
      title: title,
      icon: icon,
      tint: LanternSuggestionsPicker.color(fromHex: tint)
    ) { [weak self] text in
      self?.onSelect(["title": text])
    }
    let controller = UIHostingController(rootView: root)
    controller.view.backgroundColor = .clear
    controller.view.frame = bounds
    addSubview(controller.view)
    host = controller
    #endif
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    host?.view.frame = bounds
  }
}

#if canImport(JournalingSuggestions)
@available(iOS 17.2, *)
private struct LanternSuggestionsPicker: View {
  let title: String
  let icon: String
  let tint: Color?
  let onSelect: (String) -> Void

  var body: some View {
    JournalingSuggestionsPicker {
      if icon.isEmpty {
        Text(title)
      } else {
        Image(systemName: icon)
          .font(.system(size: 21, weight: .regular))
          .foregroundStyle(tint ?? .primary)
      }
    } onCompletion: { suggestion in
      let text = await Self.text(from: suggestion)
      guard !text.isEmpty else { return }
      await MainActor.run { onSelect(text) }
    }
    .accessibilityLabel(Text(title))
  }

  /// 提案から**書きはじめの行**を組む。
  ///
  /// あるものを全部積む。**写真・動画・気分には触れない**（冒頭の節）。
  static func text(from s: JournalingSuggestion) async -> String {
    var lines: [String] = []

    // 1. 振り返りの問い。**これが本命**——書きはじめの手がかりとして
    //    いちばん強いので先頭に置く
    for r in await s.content(forType: JournalingSuggestion.Reflection.self) {
      lines.append(r.prompt)
    }
    // 2. 聴いた曲。**同じ候補に何曲も入ることがある**
    for m in await s.content(forType: JournalingSuggestion.Song.self) {
      lines.append(join([m.song, m.artist]))
    }
    // 3. 聴いた番組
    for p in await s.content(forType: JournalingSuggestion.Podcast.self) {
      lines.append(join([p.episode, p.show]))
    }
    // 4. その他のメディア
    for g in await s.content(forType: JournalingSuggestion.GenericMedia.self) {
      lines.append(join([g.title, g.artist]))
    }
    // 5. 行った場所。**名前だけ。座標は取らない**
    for l in await s.content(forType: JournalingSuggestion.Location.self) {
      lines.append(join([l.place, l.city]))
    }

    let kept = lines
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }

    // 何も取れなければ分類の名前。**空を返すよりはいい**
    guard !kept.isEmpty else { return s.title }
    return kept.joined(separator: "\n")
  }

  /// 空でないものだけを繋ぐ。「曲名 — アーティスト」の形
  private static func join(_ parts: [String?]) -> String {
    let kept = parts
      .compactMap { $0 }
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    return kept.joined(separator: " — ")
  }

  /// #RRGGBB を読む。読めなければ nil
  static func color(fromHex hex: String) -> Color? {
    var s = hex.trimmingCharacters(in: .whitespaces)
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
    return Color(
      red: Double((v >> 16) & 0xFF) / 255,
      green: Double((v >> 8) & 0xFF) / 255,
      blue: Double(v & 0xFF) / 255
    )
  }
}
#endif
