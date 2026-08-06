import { View } from 'react-native'

// フォームの外枠（ネイティブ）。Web 版は FormShell.web.jsx にある。
// ネイティブに <form> の概念は無いので、そのまま View で包む。
// Enter での送信は TextInput の onSubmitEditing が担う。
export default function FormShell({ children, ...props }) {
  return <View {...props}>{children}</View>
}
