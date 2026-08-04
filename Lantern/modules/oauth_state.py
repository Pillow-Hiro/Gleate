"""OAuth の state に user_id とクライアント種別を載せる。

外部サービスへのリダイレクトURIは Flask のままにし、コールバック側で
Web（Vercel）へ戻すかネイティブアプリ（lantern://）へ戻すかを切り替える。
これにより各サービスの管理画面でリダイレクトURIを増やさずに済む。

YouTube と Twitch で同じ仕組みを使うためここに置いている。
片方だけ直して他方が古いまま、という事故を避ける。
"""

_STATE_SEPARATOR = "|"


def build_state(user_id, platform="web"):
    return f"{user_id}{_STATE_SEPARATOR}{platform}"


def parse_state(state):
    """state を (user_id, platform) に分解する。

    platform を含まない古い形式の state もそのまま web として扱う。
    """
    if not state:
        return None, "web"
    user_id, _, platform = state.partition(_STATE_SEPARATOR)
    return user_id or None, platform or "web"
