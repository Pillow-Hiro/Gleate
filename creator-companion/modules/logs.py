import json
import os
from datetime import datetime, timedelta

DATA_FILE = "data/logs.json"
GOALS_FILE = "data/goals.json"


def load_logs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_logs(logs):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


def load_goals():
    if not os.path.exists(GOALS_FILE):
        return {"vision": "", "monthly_goals": [], "weekly_goals": []}
    with open(GOALS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_goals_data(goals):
    os.makedirs("data", exist_ok=True)
    with open(GOALS_FILE, "w", encoding="utf-8") as f:
        json.dump(goals, f, ensure_ascii=False, indent=2)


def get_week_str():
    return datetime.now().strftime("%Y-W%W")


def get_month_str():
    return datetime.now().strftime("%Y-%m")


def get_month_display_str():
    today = datetime.now()
    return f"{today.year}年{today.month}月"


def get_week_display_str():
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    pad = lambda n: str(n).zfill(2)
    return f"{monday.year}/{pad(monday.month)}/{pad(monday.day)}〜{pad(sunday.month)}/{pad(sunday.day)}"


def get_current_weekly_goal(goals):
    week = get_week_str()
    for wg in reversed(goals.get("weekly_goals", [])):
        if wg.get("week") == week:
            return wg.get("goal", "")
    return ""


def get_current_monthly_goal(goals):
    month = get_month_str()
    for mg in reversed(goals.get("monthly_goals", [])):
        if mg.get("month") == month:
            return mg.get("goal", "")
    return ""
