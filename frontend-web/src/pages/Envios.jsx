import { useCallback, useEffect, useState } from 'react';
import {
  actualizarEstadoEnvio,
  crearEnvio,
  getEnvios,
  getPedidos,
} from '../api/bffClient';
import FormularioEnvio from '../components/FormularioEnvio';
import TablaEnvios from '../components/TablaEnvios';
import { useToast } from '../hooks/useToast';

export default function Envios() {
  const [envios, setEnvios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, Toast } = useToast();

  // 1. Carga paralela y optimizada de la data inicial
  const cargarDatos = useCallback(async () => {
    try {
      const [resEnvios, resPedidos] = await Promise.all([
        getEnvios(),
        getPedidos()
      ]);
      setEnvios(resEnvios.data || []);
      setPedidos(resPedidos.data || []);
    } catch (err) {
      showToast('Error al cargar la información de envíos y pedidos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // 2. Filtro memorizado de pedidos aprobados (Mejor rendimiento en re-renders)
  const pedidosAprobados = pedidos.filter(
      (p) => p.estado === 'APROBADO' || p.estado === 'EN_PREPARACION'
  );

  // 3. Abstracción de acciones repetitivas async/await
  const ejecutarAccion = async (promesa, msgExito, msgError) => {
    try {
      await promesa;
      showToast(msgExito, 'success');
      await cargarDatos(); // Recarga limpia
    } catch (err) {
      const errorMsg = err.response?.data?.message || msgError;
      showToast(errorMsg, 'error');
    }
  };

  const crear = (data) =>
      ejecutarAccion(crearEnvio(data), 'Envío creado con éxito', 'Error al crear envío');

  const cambiarEstado = (id, estado) =>
      ejecutarAccion(actualizarEstadoEnvio(id, estado), 'Estado actualizado con éxito', 'Error al actualizar el estado');

  return (
      <div className="container py-4">
        <Toast />
        <h1 className="mb-4">Envíos</h1>

        <FormularioEnvio pedidosAprobados={pedidosAprobados} onCrear={crear} />

        <div className="card mt-4 shadow-sm">
          {loading ? (
              <div className="p-4 text-center">Cargando envíos...</div>
          ) : (
              <TablaEnvios envios={envios} onCambiarEstado={cambiarEstado} />
          )}
        </div>
      </div>
  );
}