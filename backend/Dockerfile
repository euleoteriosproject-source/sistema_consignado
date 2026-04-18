FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY build/libs/app.jar app.jar

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseVirtualThreads", "-jar", "app.jar"]
