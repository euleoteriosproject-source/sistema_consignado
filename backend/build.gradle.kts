import org.springframework.boot.gradle.tasks.bundling.BootJar

plugins {
    java
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}

// No Windows (dev local com OneDrive), move build dir para fora do OneDrive
if (System.getProperty("os.name").lowercase().contains("windows")) {
    layout.buildDirectory.set(file("C:/tmp/consignado-backend-build"))
}

group = "com.consignado"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("--enable-preview")
}

tasks.withType<Test> {
    jvmArgs("--enable-preview")
}

tasks.withType<JavaExec> {
    jvmArgs("--enable-preview")
}

repositories {
    mavenCentral()
}

val mapstructVersion = "1.6.3"
val jjwtVersion = "0.12.6"
val okhttpVersion = "4.12.0"
val poiVersion = "5.3.0"
val testcontainersVersion = "1.20.4"
val stripeVersion = "26.3.0"

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-aop")

    // Database
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")

    // MapStruct
    implementation("org.mapstruct:mapstruct:$mapstructVersion")
    annotationProcessor("org.mapstruct:mapstruct-processor:$mapstructVersion")

    // Lombok (apenas @Slf4j)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok-mapstruct-binding:0.2.0")

    // OkHttp para Supabase Storage
    implementation("com.squareup.okhttp3:okhttp:$okhttpVersion")

    // Apache POI para XLSX
    implementation("org.apache.poi:poi-ooxml:$poiVersion")

    // Stripe billing
    implementation("com.stripe:stripe-java:$stripeVersion")

    // Jackson
    implementation("com.fasterxml.jackson.module:jackson-module-parameter-names")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter:$testcontainersVersion")
    testImplementation("org.testcontainers:postgresql:$testcontainersVersion")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.getByName<BootJar>("bootJar") {
    archiveFileName.set("app.jar")
}

// Carrega .env e ativa perfil dev ao rodar localmente
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    val envFile = file("${projectDir}/.env")
    if (envFile.exists()) {
        envFile.readLines().forEach { line ->
            val trimmed = line.trim()
            if (trimmed.isNotBlank() && !trimmed.startsWith("#")) {
                val eqIdx = trimmed.indexOf('=')
                if (eqIdx > 0) {
                    val key = trimmed.substring(0, eqIdx).trim()
                    val value = trimmed.substring(eqIdx + 1).trim()
                    environment(key, value)
                }
            }
        }
    }
    systemProperty("spring.profiles.active", "dev")
}
