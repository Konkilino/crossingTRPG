#!/bin/bash
echo "╔═══════════════════════════════════════╗"
echo "║  穿越团 · 主神空间终端               ║"
echo "║  localStorage 模式 — 无需服务器      ║"
echo "║  直接打开 index.html 即可使用         ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "正在尝试打开 index.html ..."
start "" "index.html" 2>/dev/null || open index.html 2>/dev/null || xdg-open index.html 2>/dev/null || echo "请手动打开 index.html"
