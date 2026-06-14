package cl.smartlogix.pedidos.facade;

import cl.smartlogix.pedidos.dto.inventario.DescontarStockDTO;
import cl.smartlogix.pedidos.dto.inventario.ProductoInventarioDTO;
import cl.smartlogix.pedidos.exception.BusinessException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Patrón Facade: simplifica la interacción con ms-inventario ocultando múltiples
 * llamadas REST (consulta, validación y descuento de stock) tras una API unificada.
 * Protegido con Circuit Breaker (Resilience4j) para evitar caídas en cascada.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InventarioFacade {

    private final RestTemplate restTemplate;

    @Value("${smartlogix.inventario.base-url}")
    private String inventarioBaseUrl;

    @CircuitBreaker(name = "inventario", fallbackMethod = "inventarioFallback")
    public ProductoInventarioDTO obtenerProducto(Long productoId) {
        try {
            String url = inventarioBaseUrl + "/api/productos/" + productoId;
            ResponseEntity<ProductoInventarioDTO> response =
                    restTemplate.getForEntity(url, ProductoInventarioDTO.class);
            if (response.getBody() == null) {
                throw new BusinessException("Producto no encontrado en inventario: " + productoId);
            }
            return response.getBody();
        } catch (RestClientException ex) {
            throw new BusinessException("Error al consultar inventario: " + ex.getMessage());
        }
    }

    @CircuitBreaker(name = "inventario", fallbackMethod = "inventarioFallbackValidar")
    public boolean validarStock(Long productoId, Integer cantidad) {
        try {
            String url = inventarioBaseUrl + "/api/productos/" + productoId + "/stock-suficiente/" + cantidad;
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            return Boolean.TRUE.equals(response.getBody());
        } catch (RestClientException ex) {
            throw new BusinessException("Error al validar stock: " + ex.getMessage());
        }
    }

    @CircuitBreaker(name = "inventario", fallbackMethod = "inventarioFallbackDescontar")
    public void descontarStock(Long productoId, Integer cantidad) {
        try {
            String url = inventarioBaseUrl + "/api/productos/" + productoId + "/descontar-stock";
            DescontarStockDTO body = new DescontarStockDTO(cantidad);
            restTemplate.postForEntity(url, body, ProductoInventarioDTO.class);
        } catch (RestClientException ex) {
            throw new BusinessException("Error al descontar stock: " + ex.getMessage());
        }
    }

    public List<ProductoInventarioDTO> listarProductos() {
        try {
            String url = inventarioBaseUrl + "/api/productos";
            ResponseEntity<List<ProductoInventarioDTO>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<ProductoInventarioDTO>>() {});
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (RestClientException ex) {
            throw new BusinessException("Error al listar productos: " + ex.getMessage());
        }
    }

    @SuppressWarnings("unused")
    private ProductoInventarioDTO inventarioFallback(Long productoId, Throwable ex) {
        log.error("Circuit Breaker activo: ms-inventario no disponible al obtener producto {}", productoId, ex);
        throw new BusinessException("Servicio de inventario no disponible temporalmente. Intente más tarde.");
    }

    @SuppressWarnings("unused")
    private boolean inventarioFallbackValidar(Long productoId, Integer cantidad, Throwable ex) {
        log.error("Circuit Breaker activo: ms-inventario no disponible al validar stock producto {}", productoId, ex);
        throw new BusinessException("No se pudo validar stock: servicio de inventario no disponible.");
    }

    @SuppressWarnings("unused")
    private void inventarioFallbackDescontar(Long productoId, Integer cantidad, Throwable ex) {
        log.error("Circuit Breaker activo: ms-inventario no disponible al descontar stock producto {}", productoId, ex);
        throw new BusinessException("No se pudo descontar stock: servicio de inventario no disponible.");
    }
}
