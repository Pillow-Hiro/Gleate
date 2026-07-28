# pytest を Lantern/ 以外から実行しても modules パッケージを解決できるようにする。
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
