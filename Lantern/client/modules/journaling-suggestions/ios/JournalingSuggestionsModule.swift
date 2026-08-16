import ExpoModulesCore
import SwiftUI

// **シミュレータには JournalingSuggestions が無い**（Apple の仕様）。
// `canImport` だけでは足りず、2026-08-17 のビルド #16 は
// 「cannot find 'JournalingSuggestionsPicker' in scope」で落ちた。
// module は見えるのに型が見えない、という状態になる。
//
// 出せる条件をここで1つに決めて、以下すべてこの名前で分岐する。
// **条件を3か所に書くと、1つ直し忘れて同じ落ち方をする。**
#if canImport(JournalingSuggestions) && !targetEnvironment(simulator)
import JournalingSuggestions
#endif

// Apple の Journaling Suggestions（iOS 17.2+）を Lantern から出す。
//
// **渡すのは `title` だけ。**
//
// 選ばれた提案には写真・運動・心拍・場所の座標・State of Mind まで
// 入ってくるが、**受け取らない。**
//
// - 写真は端末の中だけに置くと決めてある。新しい経路を開けない
// - State of Mind は気分の分類そのもので、Insights AI憲法が禁じている
// - 運動や心拍は、記録アプリが持つ理由がない
//
// `title` は「渋谷」「8月12日の写真」のような短い事実の label で、
// **利用者が自分で選んだものだけが渡ってくる**（選ぶまでアプリからは見えない）。
// それを書きはじめの1行として入力欄に置き、あとは利用者が書き換える。
//
// ピッカーはボタンそのものが SwiftUI のビューなので、
// プログラムから開くのではなく**ビューとして埋め込む。**
// Apple の作法どおり、押すのは利用者。
public class JournalingSuggestionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("JournalingSuggestions")

    // iOS 17.2 未満・iPad の一部・シミュレータでは出せない。
    // **出せない端末で入口を描かない**ため、JS 側から先に聞く。
    Function("isAvailable") { () -> Bool in
      // **シミュレータでは false。** framework が無いので、
      // 版だけ見て true を返すと入口だけ描かれて何も起きない
      #if canImport(JournalingSuggestions) && !targetEnvironment(simulator)
      if #available(iOS 17.2, *) {
        return true
      }
      #endif
      return false
    }

    View(JournalingPickerView.self) {
      Events("onSelect")

      Prop("title") { (view: JournalingPickerView, title: String) in
        view.setTitle(title)
      }
    }
  }
}

public class JournalingPickerView: ExpoView {
  let onSelect = EventDispatcher()
  private var host: UIViewController?
  private var title: String = ""

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    render()
  }

  func setTitle(_ next: String) {
    guard next != title else { return }
    title = next
    render()
  }

  private func render() {
    host?.view.removeFromSuperview()
    host = nil

    #if canImport(JournalingSuggestions) && !targetEnvironment(simulator)
    guard #available(iOS 17.2, *) else { return }
    let root = LanternSuggestionsPicker(title: title) { [weak self] payload in
      self?.onSelect(payload)
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

#if canImport(JournalingSuggestions) && !targetEnvironment(simulator)
@available(iOS 17.2, *)
private struct LanternSuggestionsPicker: View {
  let title: String
  let onSelect: ([String: Any]) -> Void

  var body: some View {
    JournalingSuggestionsPicker {
      Text(title)
    } onCompletion: { suggestion in
      // **`items` には触らない。** 見出しだけを受け取る
      onSelect(["title": suggestion.title])
    }
  }
}
#endif
