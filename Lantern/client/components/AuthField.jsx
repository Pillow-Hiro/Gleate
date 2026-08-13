import { TextInput, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'

// 認証まわりの入力欄。**ログイン・新規登録・再設定で共有する。**
//
// デザイン案（`0_login`）に合わせて、
// **アイコン＋下線**にした。四角い枠を持たない。
//
// カードの上に置くので、枠で囲うと**箱の中に箱**になる
// （CLAUDE.md「やらないこと」）。下線なら面の中に線が1本増えるだけで済む。
//
// ラベルを外して placeholder に寄せている。ラベルと placeholder の
// 両方に同じ言葉を出すと、同じことを2回言うことになるため。
// 読み上げには `accessibilityLabel` で渡す。
function MailIcon({ color }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke={color} strokeWidth="1.8" />
      <Path d="M3 7l9 6 9-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

function LockIcon({ color }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="10.5" width="16" height="10.5" rx="2.5" stroke={color} strokeWidth="1.8" />
      <Path d="M8 10.5V7.5a4 4 0 018 0v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

const ICONS = { mail: MailIcon, lock: LockIcon }
const ICON_COLOR = '#847563'
const PLACEHOLDER = '#8E8478'

export default function AuthField({ icon, label, isLast, ...props }) {
  const Icon = ICONS[icon]
  return (
    <View
      className={`flex-row items-center gap-3 py-3 min-h-touch ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      {Icon ? <Icon color={ICON_COLOR} /> : null}
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={PLACEHOLDER}
        className="flex-1 font-body text-body-md text-on-surface"
        {...props}
      />
    </View>
  )
}
