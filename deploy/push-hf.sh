#!/usr/bin/env bash
# 一键把 Spring Boot 存档服务推到 Hugging Face Space（Docker 类型）
#
# 用法：
#   1. 到 huggingface.co 注册/登录（免绑卡、免审核）
#   2. New → Space：名称如 pony-server，SDK 选 Docker → Blank，硬件 Free CPU Basic，Public
#   3. 生成 write 权限 token：Settings → Access Tokens → New token（选 Write）
#   4. 本目录执行：
#      ./push-hf.sh https://huggingface.co/spaces/你的用户名/pony-server hf_xxxxxxxx
#
# Space 的 README 元数据（sdk: docker / app_port: 8080）会一起推过去，
# DATABASE_URL 不在这里——推完后去 Space → Settings → Variables and secrets 添加。
set -euo pipefail

SPACE_URL="${1:?用法: ./push-hf.sh https://huggingface.co/spaces/用户名/space名 hf_你的write token}"
HF_TOKEN="${2:?缺少 HF token（Settings → Access Tokens 生成 Write 权限）}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 组装 Space 仓库根：Dockerfile + README（含 sdk/app_port 元数据）+ server 源码
cp "$ROOT/deploy/hf-space/Dockerfile" "$TMP/"
cp "$ROOT/deploy/hf-space/README.md" "$TMP/"
cp "$ROOT/server/pom.xml" "$TMP/"
cp -r "$ROOT/server/src" "$TMP/src"

cd "$TMP"
git init -q
git add .
git commit -qm "deploy: 小马存档服务到 HF Spaces"
git branch -M main
# 密码位填 HF token
git push "https://__token__:${HF_TOKEN}@huggingface.co/spaces/$(echo "$SPACE_URL" | sed -E 's#https://huggingface.co/spaces/##')" main --force 2>&1 | sed -E "s/__token__:[^@]*/__token__:***mask***/g"

echo
echo "✅ 已推送。构建约 5-8 分钟，进度看 Space 页面的 Logs。"
echo "   构建完成后："
echo "   1. Space → Settings → Variables and secrets → New secret"
echo "      名称 DATABASE_URL，值 = Supabase Connection pooling(6543) 的 JDBC 串"
echo "   2. Space 会自动重启，访问 https://你的用户名-pony-server.hf.space/api/health"
