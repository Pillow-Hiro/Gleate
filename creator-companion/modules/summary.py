from datetime import datetime, timedelta


def get_weekly_summary(logs):
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent = [l for l in logs if l.get("date", "") >= week_ago]
    if not recent:
        return None

    return {
        "days": len(recent),
        "enjoyed": [l.get("enjoyable", "") for l in recent if l.get("enjoyable")],
        "struggled": [l.get("struggled", "") for l in recent if l.get("struggled")],
        "logs": recent,
    }


def get_streak(logs):
    if not logs:
        return 0
    logged_dates = set(l.get("date", "") for l in logs if l.get("date"))
    if not logged_dates:
        return 0
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    start = today if today_str in logged_dates else today - timedelta(days=1)
    if start.strftime("%Y-%m-%d") not in logged_dates:
        return 0
    streak = 0
    check = start
    while check.strftime("%Y-%m-%d") in logged_dates:
        streak += 1
        check -= timedelta(days=1)
    return streak


def get_recent_activity(logs, days=7):
    logged_dates = set(l.get("date", "") for l in logs if l.get("date"))
    activity = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        activity.append({"date": d, "logged": d in logged_dates, "is_today": i == 0})
    return activity
