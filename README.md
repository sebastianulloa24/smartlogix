# SMARTLOGIX

Plataforma logística académica basada en **microservicios**, arquitectura **MVC** en cada backend, **BFF** y frontend **React**.

## Estructura del monorepo

```
smartlogix/
├── eureka-server/     # Puerto 8761 - Service Discovery
├── ms-inventario/     # Puerto 8081 - inventario_db
├── ms-pedidos/        # Puerto 8082 - pedidos_db
├── ms-envios/         # Puerto 8083 - envios_db
├── bff-gateway/       # Puerto 8080
├── frontend-web/      # Puerto 5173
└── docs/
```

## Requisitos

- Java 17, Maven 3.9+
- PostgreSQL 14+
- Node.js 18+ (frontend)

## Bases de datos

Ejecutar `docs/init-databases.sql` en PostgreSQL o crear manualmente:

- `inventario_db`
- `pedidos_db`
- `envios_db`

Credenciales por defecto: usuario `postgres`, contraseña `postgres` (ajustar en cada `application.properties`).

## Orden de ejecución

1. `eureka-server` → `./mvnw spring-boot:run` (puerto **8761**)
2. `ms-inventario` → `./mvnw spring-boot:run`
3. `ms-pedidos` → `./mvnw spring-boot:run`
4. `ms-envios` → `./mvnw spring-boot:run`
5. `bff-gateway` → `./mvnw spring-boot:run`
6. `frontend-web` → `npm install && npm run dev`

Panel Eureka: http://localhost:8761

## Service Discovery (Eureka)

Los microservicios se registran automáticamente en Eureka Server. Las comunicaciones internas usan nombres lógicos en lugar de `localhost`:

| Antes | Después |
|-------|---------|
| `http://localhost:8081/api/productos` | `http://MS-INVENTARIO/api/productos` |
| `http://localhost:8082/api/pedidos` | `http://MS-PEDIDOS/api/pedidos` |
| `http://localhost:8083/api/envios` | `http://MS-ENVIOS/api/envios` |

`RestTemplate` está configurado con `@LoadBalanced` para balanceo vía Eureka.

## Circuit Breaker (Resilience4j)

Implementado en `InventarioFacade` (`ms-pedidos`) para proteger las llamadas a inventario.

**Probar manualmente:**

1. Levantar Eureka, `ms-inventario` y `ms-pedidos`.
2. Apagar `ms-inventario` (Ctrl+C).
3. Intentar crear/aprobar un pedido → respuesta controlada con mensaje de error.
4. `GET /api/pedidos` sigue respondiendo (ms-pedidos no cae).

**Prueba automatizada:**

```bash
cd ms-pedidos && ./mvnw test -Dtest=InventarioFacadeCircuitBreakerTest
```

**¿Qué pasa si un microservicio se apaga?**

| Servicio caído | Comportamiento |
|----------------|----------------|
| `ms-inventario` | `ms-pedidos` usa fallback; listar pedidos funciona; crear/aprobar devuelve error controlado |
| `ms-pedidos` | BFF no puede crear pedidos; dashboard muestra pedidos vacíos |
| `ms-envios` | BFF no puede gestionar envíos; dashboard muestra envíos vacíos |
| `eureka-server` | Los servicios ya registrados siguen funcionando temporalmente; reinicios fallan al registrarse |

## Dependencias Spring Cloud

- Spring Boot: `3.4.5`
- Spring Cloud BOM: `2024.0.2` (Moorgate)
- `spring-cloud-starter-netflix-eureka-server` (eureka-server)
- `spring-cloud-starter-netflix-eureka-client` (microservicios + BFF)
- `spring-cloud-starter-circuitbreaker-resilience4j` (ms-pedidos)

## Patrones implementados

| Patrón | Ubicación |
|--------|-----------|
| Repository | Repositorios JPA en cada MS |
| Builder | `ProductoBuilder` (ms-inventario) |
| Factory Method | `PedidoFactory` (ms-pedidos) |
| Facade | `InventarioFacade`, `LogisticaFacade` |
| Service Discovery | Eureka Server + Eureka Client |
| Circuit Breaker | `InventarioFacade` (ms-pedidos) |

## Pruebas unitarias

```bash
cd ms-inventario && ./mvnw test
cd ms-pedidos && ./mvnw test
cd ms-envios && ./mvnw test
```

JaCoCo genera reporte de cobertura en `target/site/jacoco/`.

## Swagger

- Eureka: http://localhost:8761
- Inventario: http://localhost:8081/swagger-ui.html
- Pedidos: http://localhost:8082/swagger-ui.html
- Envíos: http://localhost:8083/swagger-ui.html
- BFF: http://localhost:8080/swagger-ui.html

## GitFlow

Ver `docs/GITFLOW.md` y `docs/plan-branching.pdf`.

## Documentación académica

- `docs/CAMBIOS_MICROSERVICIOS.md` — Eureka y Circuit Breaker
- `docs/analisis-patrones.pdf` — justificación de patrones y microservicios
- `docs/plan-branching.pdf` — estrategia de ramas

Generar PDFs: `python docs/generar-pdfs.py` (requiere `fpdf2`: `pip install fpdf2`).
