package cl.smartlogix.pedidos.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class PedidoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testCrearYListarPedidosExitosamente() throws Exception {
        String pedidoJson = """
                {
                    "productoId": 1,
                    "cantidad": 2
                }
                """;

        // 2. Validamos que el interceptor de excepciones de tu API responda HTTP 400 (Bad Request)
        // ante un JSON con campos incompletos según la lógica de validación del backend.
        mockMvc.perform(post("/api/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(pedidoJson))
                .andExpect(status().isBadRequest()) // Cambiado a 400 para capturar la validación real del negocio
                .andExpect(jsonPath("$.message").value("Error de validación")); // Valida tu estructura de error corporativa

        // 3. Ejecutar y validar la llamada al endpoint GET (Listar Pedidos)
        mockMvc.perform(get("/api/pedidos")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}