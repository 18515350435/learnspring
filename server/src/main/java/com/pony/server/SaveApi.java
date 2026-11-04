package com.pony.server;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 存档 API：与前端 cloud.js 使用的 Supabase saves 表结构保持一致
 *   saves(code text primary key, data jsonb not null, updated_at timestamptz default now())
 * 后端直连 Postgres（用主账号，绕过 RLS），权限边界就是这几个接口本身。
 */
@Configuration
public class SaveApi {

    /* ---------- 启动时确保表存在（幂等） ---------- */

    @Bean
    ApplicationRunner initSchema(JdbcTemplate jdbc) {
        return args -> {
            try {
                jdbc.execute("""
                    create table if not exists saves (
                      code text primary key,
                      data jsonb not null,
                      updated_at timestamptz not null default now()
                    )""");
            } catch (Exception e) {
                // 数据库暂不可达时不阻塞启动（免费实例冷启动常见），首次读写时仍会再触发连接
                System.getLogger("init").log(System.Logger.Level.WARNING,
                    "建表未完成（数据库可能还没就绪）: " + e.getMessage());
            }
        };
    }

    /* ---------- 允许 GitHub Pages / 本地前端跨域调用 ---------- */

    @Bean
    WebMvcConfigurer cors() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOriginPatterns("*")
                        .allowedMethods("GET", "PUT", "POST", "DELETE", "OPTIONS");
            }
        };
    }

    /** 健康检查：免费实例被唤醒后先打这个 */
    @RestController
    public static class HealthController {
        @GetMapping("/api/health")
        public Map<String, Object> health() {
            return Map.of("status", "ok", "time", String.valueOf(OffsetDateTime.now()));
        }
    }

    /* ---------- REST ---------- */

    @RestController
    @RequestMapping("/api/saves")
    public static class SaveController {

        private final JdbcTemplate jdbc;
        private final com.fasterxml.jackson.databind.ObjectMapper mapper =
            new com.fasterxml.jackson.databind.ObjectMapper();

        SaveController(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        /** 读取存档：GET /api/saves/{code} */
        @GetMapping("/{code}")
        public ResponseEntity<Map<String, Object>> get(@PathVariable String code) {
            // data::text 取出为 JSON 字符串，再解析回对象，避免 PGobject 被 Jackson 序列化成 {type,value}
            List<Map<String, Object>> rows = jdbc.queryForList(
                "select data::text as data, updated_at from saves where code = ?", code);
            if (rows.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Map<String, Object> row = rows.get(0);
            try {
                row.put("data", mapper.readValue((String) row.get("data"), Map.class));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(
                    Map.of("error", "存档数据解析失败: " + e.getMessage()));
            }
            return ResponseEntity.ok(row);
        }

        /** 保存存档：PUT /api/saves/{code}，body 即 data（jsonb） */
        @PutMapping("/{code}")
        public ResponseEntity<Map<String, Object>> put(@PathVariable String code,
                                                       @RequestBody Map<String, Object> data) {
            // 必须先序列化成 JSON 字符串：直接传 Map 会被 JDBC 驱动当 hstore 处理（Supabase 无该扩展）
            String json;
            try {
                json = mapper.writeValueAsString(data);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "无法序列化存档: " + e.getMessage()));
            }
            jdbc.update("""
                insert into saves (code, data, updated_at)
                values (?::text, ?::jsonb, now())
                on conflict (code) do update
                  set data = excluded.data, updated_at = now()
                """, code, json);
            OffsetDateTime at = jdbc.queryForObject(
                "select updated_at from saves where code = ?", OffsetDateTime.class, code);
            return ResponseEntity.ok(Map.of("code", code, "updated_at", String.valueOf(at)));
        }
    }
}
