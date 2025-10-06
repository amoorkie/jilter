FROM maven:3.9.4-openjdk-17-slim AS builder

WORKDIR /app

# Копируем pom.xml
COPY pom.xml .

# Скачиваем зависимости
RUN mvn dependency:go-offline -B

# Копируем исходный код
COPY src ./src

# Собираем приложение
RUN mvn clean package -DskipTests

# Финальный образ
FROM openjdk:17-jre-slim

WORKDIR /app

# Копируем JAR файл
COPY --from=builder /app/target/*.jar app.jar

# Открываем порт
EXPOSE 8081

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]







