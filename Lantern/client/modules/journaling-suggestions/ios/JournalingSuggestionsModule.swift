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
// **文字だけ。** 選ばれた提案には写真・運動・心拍・場所の座標・
// State of Mind まで入ってくるが、**受け取らない。**
//
// - 写真は端末の中だけに置くと決めてある。新しい経路を開けない
// - State of Mind は気分の分類そのもので、Insights AI憲法が禁じている
// - 運動や心拍は、記録アプリが持つ理由がない
// - 場所は**名前だけ。**座標は取らない
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

  /// 提案から**書きはじめの1行**を組む。
  ///
  /// 上から順に見て、最初に取れたものを返す。
  /// **写真・動画・運動・気分・連絡先には触れない。**
  static func text(from s: JournalingSuggestion) async -> String {
    // 1. 振り返りの問い。**これが本命**
    if let r = await s.content(forType: JournalingSuggestion.Reflection.self).first {
      return r.prompt
    }
    // 2. 聴いた曲
    if let m = await s.content(forType: JournalingSuggestion.Song.self).first {
      return join([m.song, m.artist])
    }
    // 3. 聴いた番組
    if let p = await s.content(forType: JournalingSuggestion.Podcast.self).first {
      return join([p.episode, p.show])
    }
    // 4. その他のメディア
    if let g = await s.content(forType: JournalingSuggestion.GenericMedia.self).first {
      return join([g.title, g.artist])
    }
    // 5. 行った場所。**名前だけ。座標は取らない**
    if let l = await s.content(forType: JournalingSuggestion.Location.self).first {
      return join([l.place, l.city])
    }
    // 何も取れなければ分類の名前。**空を返すよりはいい**
    return s.title
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
