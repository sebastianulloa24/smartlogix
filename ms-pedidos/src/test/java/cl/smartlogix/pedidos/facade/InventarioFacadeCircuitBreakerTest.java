package cl.smartlogix.pedidos.facade;

import cl.smartlogix.pedidos.dto.PedidoResponseDTO;
import cl.smartlogix.pedidos.dto.inventario.ProductoInventarioDTO;
import cl.smartlogix.pedidos.exception.BusinessException;
import cl.smartlogix.pedidos.repository.PedidoRepository;
import cl.smartlogix.pedidos.service.PedidoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Verifica que ms-pedidos sigue respondiendo cuando ms-inventario no está disponible,
 * gracias al Circuit Breaker y los métodos fallback de InventarioFacade.
 */
@SpringBootTest
@ActiveProfiles("test")
class InventarioFacadeCircuitBreakerTest {

    @Autowired
    private InventarioFacade inventarioFacade;

    @Autowired
    private PedidoService pedidoService;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private PedidoRepository pedidoRepository;

    @Test
    void cuandoInventarioCaido_obtenerProducto_debeRetornarRespuestaControlada() {
        when(restTemplate.getForEntity(anyString(), eq(ProductoInventarioDTO.class)))
                .thenThrow(new RestClientException("Connection refused: ms-inventario apagado"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> inventarioFacade.obtenerProducto(1L));

        assertTrue(ex.getMessage().contains("inventario no disponible"));
    }

    @Test
    void cuandoInventarioCaido_validarStock_debeRetornarRespuestaControlada() {
        when(restTemplate.getForEntity(anyString(), eq(Boolean.class)))
                .thenThrow(new RestClientException("Connection refused: ms-inventario apagado"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> inventarioFacade.validarStock(1L, 2));

        assertTrue(ex.getMessage().contains("inventario no disponible"));
    }

    @Test
    void cuandoInventarioCaido_listarPedidos_msPedidosDebeSeguirRespondiendo() {
        when(pedidoRepository.findAll()).thenReturn(List.of());

        List<PedidoResponseDTO> resultado = assertDoesNotThrow(() -> pedidoService.listar());

        assertEquals(0, resultado.size());
    }

    @Test
    void cuandoInventarioCaido_descontarStock_debeRetornarRespuestaControlada() {
        when(restTemplate.postForEntity(anyString(), any(), eq(ProductoInventarioDTO.class)))
                .thenThrow(new RestClientException("Connection refused: ms-inventario apagado"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> inventarioFacade.descontarStock(1L, 1));

        assertTrue(ex.getMessage().contains("inventario no disponible"));
    }
}
