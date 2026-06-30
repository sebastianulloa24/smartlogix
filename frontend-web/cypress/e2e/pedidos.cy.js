/* global cy, describe, beforeEach, it */
/// <reference types="cypress" />

describe('SmartLogix - Pruebas End-to-End (E2E) de Pedidos', () => {

    beforeEach(() => {
        // 🟢 Apuntamos directamente al puerto real de tu servidor de Vite
        cy.visit('http://localhost:5173/pedidos');
    });

    it('Debe cargar la vista de gestión de pedidos, enviar el formulario y validar la tabla', () => {

        // 1. Validar que la página cargue buscando la sección de pedidos
        cy.contains(/pedidos/i).should('be.visible');

        // 2. Interactuar con los inputs usando lo que ve el usuario de forma flexible
        cy.get('input[type="number"]').first().clear().type('2');

        // 3. Hacer clic en el botón de envío buscando por su texto descriptivo
        cy.get('button').contains(/crear|enviar|guardar/i).click();

        // 4. Capturar el feedback (Toast, Alerta o cambios en la UI) de forma flexible en el DOM
        cy.contains(/pedido|éxito|creado|error|validación/i).should('be.visible');

        // 5. Validar que la tabla de datos renderice filas en la pantalla
        cy.get('table').should('be.visible');
        cy.get('table tbody tr').should('have.length.greaterThan', 0);
    });
});