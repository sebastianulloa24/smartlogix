# Implementación Eureka Server y Circuit Breaker en Smartlogix

## 1. Estado anterior

Antes de estos cambios, Smartlogix operaba con **comunicación directa** entre microservicios usando URLs fijas (`http://localhost:8081`, `http://localhost:8082`, etc.). Cada servicio conocía de antemano el host y puerto de sus dependencias.

Esto generaba dos problemas principales:

- **Acoplamiento a localhost**: si un servicio cambiaba de puerto o se desplegaba en otro host, había que modificar configuración manualmente.
- **Riesgo de caída en cascada**: si `ms-inventario` fallaba, `ms-pedidos` propagaba errores sin control, pudiendo afectar toda la cadena de operaciones (crear/aprobar pedidos).

## 2. Eureka (Service Discovery)

### Qué problema resuelve

Eureka elimina la necesidad de hardcodear direcciones IP/puerto. Los microservicios se **registran** automáticamente y los consumidores los **descubren** por nombre lógico.

### Cómo funciona Service Discovery

1. **Eureka Server** (puerto `8761`) mantiene un registro de instancias activas.
2. Cada microservicio, al iniciar, se registra con su `spring.application.name`.
3. Los clientes usan `RestTemplate` con `@LoadBalanced` y URLs como `http://MS-INVENTARIO/api/productos`.
4. Spring Cloud LoadBalancer consulta Eureka y enruta la petición a una instancia disponible.

### Servicios registrados


| Servicio Eureka | Puerto | Descripción           |
| --------------- | ------ | --------------------- |
| `MS-INVENTARIO` | 8081   | Gestión de productos  |
| `MS-PEDIDOS`    | 8082   | Gestión de pedidos    |
| `MS-ENVIOS`     | 8083   | Gestión de envíos     |
| `BFF-GATEWAY`   | 8080   | Backend for Frontend  |
| `eureka-server` | 8761   | Registro de servicios |


## 3. Circuit Breaker (Resilience4j)

### Qué problema resuelve

Evita que un microservicio caído arrastre a los demás. Cuando `ms-inventario` falla repetidamente, el circuito se **abre** y deja de enviar peticiones hasta que se recupere.

### Qué ocurre cuando un servicio falla

1. `InventarioFacade` en `ms-pedidos` intenta llamar a inventario.
2. Si hay errores consecutivos, Resilience4j abre el circuito `inventario`.
3. Las llamadas posteriores activan el **fallback** sin esperar timeout de red.
4. `ms-pedidos` **no cae**: devuelve un `BusinessException` controlado y registra el error en logs.

### Cómo funciona el fallback

Métodos protegidos con `@CircuitBreaker(name = "inventario", fallbackMethod = "...")`:

- `obtenerProducto()` → `inventarioFallback()`
- `validarStock()` → `inventarioFallbackValidar()`
- `descontarStock()` → `inventarioFallbackDescontar()`

Cada fallback registra el error y lanza una excepción de negocio con mensaje claro para el cliente.

Configuración aplicada:

```properties
resilience4j.circuitbreaker.instances.inventario.slidingWindowSize=10
resilience4j.circuitbreaker.instances.inventario.failureRateThreshold=50
resilience4j.circuitbreaker.instances.inventario.waitDurationInOpenState=10s
```

## 4. Cambios realizados

### Archivos creados


| Archivo                                                                         | Descripción                          |
| ------------------------------------------------------------------------------- | ------------------------------------ |
| `eureka-server/pom.xml`                                                         | Módulo Eureka Server                 |
| `eureka-server/src/main/java/cl/smartlogix/eureka/EurekaServerApplication.java` | Aplicación con `@EnableEurekaServer` |
| `eureka-server/src/main/resources/application.properties`                       | Puerto 8761, sin auto-registro       |
| `ms-pedidos/src/test/java/.../InventarioFacadeCircuitBreakerTest.java`          | Prueba de fallback                   |
| `ms-pedidos/src/test/resources/application-test.properties`                     | Perfil de prueba sin Eureka          |
| `docs/CAMBIOS_MICROSERVICIOS.md`                                                | Este documento                       |


### Archivos modificados


| Archivo                                          | Cambio                                                   |
| ------------------------------------------------ | -------------------------------------------------------- |
| `ms-inventario/pom.xml`                          | Spring Cloud BOM + Eureka Client                         |
| `ms-pedidos/pom.xml`                             | Spring Cloud BOM + Eureka Client + Circuit Breaker + AOP |
| `ms-envios/pom.xml`                              | Spring Cloud BOM + Eureka Client                         |
| `bff-gateway/pom.xml`                            | Spring Cloud BOM + Eureka Client                         |
| `ms-inventario/.../MsInventarioApplication.java` | `@EnableDiscoveryClient`                                 |
| `ms-pedidos/.../MsPedidosApplication.java`       | `@EnableDiscoveryClient`                                 |
| `ms-envios/.../MsEnviosApplication.java`         | `@EnableDiscoveryClient`                                 |
| `bff-gateway/.../BffGatewayApplication.java`     | `@EnableDiscoveryClient`                                 |
| `ms-pedidos/.../RestTemplateConfig.java`         | `@LoadBalanced`                                          |
| `ms-envios/.../RestTemplateConfig.java`          | `@LoadBalanced`                                          |
| `bff-gateway/.../RestTemplateConfig.java`        | `@LoadBalanced`                                          |
| `ms-pedidos/.../InventarioFacade.java`           | `@CircuitBreaker` + fallbacks                            |
| `ms-inventario/.../application.properties`       | Eureka + nombre `MS-INVENTARIO`                          |
| `ms-pedidos/.../application.properties`          | Eureka + URL `MS-INVENTARIO` + Resilience4j              |
| `ms-envios/.../application.properties`           | Eureka + URL `MS-PEDIDOS`                                |
| `bff-gateway/.../application.properties`         | Eureka + URLs por nombre de servicio                     |
| `README.md`                                      | Instrucciones actualizadas                               |


### Dependencias agregadas


| Dependencia                                        | Módulos                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `spring-cloud-dependencies` (BOM `2024.0.2`)       | Todos los backends                                        |
| `spring-cloud-starter-netflix-eureka-server`       | `eureka-server`                                           |
| `spring-cloud-starter-netflix-eureka-client`       | `ms-inventario`, `ms-pedidos`, `ms-envios`, `bff-gateway` |
| `spring-cloud-starter-circuitbreaker-resilience4j` | `ms-pedidos`                                              |
| `spring-boot-starter-aop`                          | `ms-pedidos`                                              |


### Clases nuevas

- `EurekaServerApplication` — servidor de registro Eureka
- `InventarioFacadeCircuitBreakerTest` — prueba automatizada del fallback

## 5. Arquitectura final

```
Frontend (5173)
      |
      v
 BFF Gateway (8080)  ----->  Eureka Server (8761)
      |                            ^
      |                            | registro/descubrimiento
      +----------+----------+------+----------+
                 |          |                 |
                 v          v                 v
          MS-Inventario  MS-Pedidos      MS-Envios
            (8081)        (8082)           (8083)
                              |
                              +-- Circuit Breaker --> MS-Inventario
```

Flujo típico de un pedido:

1. Frontend llama al BFF.
2. BFF resuelve `MS-PEDIDOS` vía Eureka.
3. `ms-pedidos` usa `InventarioFacade` con Circuit Breaker para consultar `MS-INVENTARIO`.
4. Si inventario responde, el pedido se procesa normalmente.
5. Si inventario está caído, el fallback devuelve error controlado sin tumbar `ms-pedidos`.

## 6. Instrucciones de ejecución

**Orden obligatorio:**

1. **Eureka Server** — `cd eureka-server && ./mvnw spring-boot:run`
2. **ms-inventario** — `cd ms-inventario && ./mvnw spring-boot:run`
3. **ms-pedidos** — `cd ms-pedidos && ./mvnw spring-boot:run`
4. **ms-envios** — `cd ms-envios && ./mvnw spring-boot:run`
5. **BFF Gateway** — `cd bff-gateway && ./mvnw spring-boot:run`
6. **Frontend** — `cd frontend-web && npm install && npm run dev`

Verificar Eureka: [http://localhost:8761](http://localhost:8761)

### Probar Circuit Breaker manualmente

1. Levantar Eureka, `ms-pedidos` y `ms-inventario`.
2. Crear un pedido vía API o frontend (debe funcionar).
3. **Apagar `ms-inventario`** (Ctrl+C en su terminal).
4. Intentar crear o aprobar un pedido en `ms-pedidos`.
5. Observar respuesta controlada (error 400 con mensaje de inventario no disponible).
6. Listar pedidos (`GET /api/pedidos`) — **debe seguir funcionando**.
7. Revisar logs de `ms-pedidos`: mensajes `Circuit Breaker activo`.

### Prueba automatizada

```bash
cd ms-pedidos && ./mvnw test -Dtest=InventarioFacadeCircuitBreakerTest
```

