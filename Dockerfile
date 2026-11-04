# Koyeb / Docker 通用部署文件
# Koyeb 免费档：GitHub 绑定本仓库 → Builder 选 Dockerfile → 环境变量填 DATABASE_URL
# 多阶段构建：第一阶段用 Maven 编译，第二阶段只带 JRE，镜像小、启动快

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY server/pom.xml .
# 预拉依赖做层缓存，失败不阻塞（联网受限环境 package 阶段会重新拉）
RUN mvn -q dependency:go-offline || true
COPY server/src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/pony-server-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
