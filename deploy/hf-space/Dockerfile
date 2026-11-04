# Hugging Face Spaces 部署文件（由 deploy/push-hf.sh 组装上下文后推送）
# Space 创建时选 SDK=Docker、硬件 Free CPU Basic；app_port 在本目录 README.md 元数据里声明为 8080
# 本文件被复制到 Space 仓库根，pom.xml 与 src/ 也在根，因此路径不带 server/ 前缀

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# 预拉依赖做层缓存，失败不阻塞
RUN mvn -q dependency:go-offline || true
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/pony-server-1.0.0.jar app.jar
# HF Spaces 要求监听 0.0.0.0（Spring Boot 默认即是）；端口由 Space README 元数据 app_port=8080 声明
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
