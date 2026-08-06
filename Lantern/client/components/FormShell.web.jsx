// フォームの外枠（Web）。ネイティブ版は FormShell.jsx にある。
//
// React Native Web は View を div にするため、そのままでは <form> が生まれない。
// パスワードマネージャは <form> を手がかりに動くので、無いと
// メールだけ自動入力されてパスワードが入らない（autocomplete を付けても同じ）。
// Enter での送信もブラウザの既定動作なので、<form> が無いと効かない。
//
// 見えない submit ボタンを1つ置いているのは、input が1つのときでも
// Enter で送信されるようにするため（ブラウザによって挙動が違う）。

export default function FormShell({ children, onSubmit, ...props }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
    >
      {children}
      <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
    </form>
  )
}
