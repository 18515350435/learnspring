---
title: Pony Save Server
emoji: 🐴
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 8080
pinned: false
---

小马存档服务（Spring Boot 3 + Supabase Postgres），部署在 Hugging Face Spaces 免费档。

部署到你自己 Space 的步骤见 learnspring 仓库 README 的「部署到 Hugging Face Spaces」章节。

- 接口：`GET /api/health`、`GET/PUT /api/saves/{code}`
- `DATABASE_URL` 在 Space → Settings → Variables and secrets 里配置，不进代码
- 免费档 48 小时无访问会休眠，下次访问约 30 秒唤醒
