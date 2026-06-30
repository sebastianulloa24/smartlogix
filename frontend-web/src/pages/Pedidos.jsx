import { useCallback, useEffect, useState } from 'react';
import {
  aprobarPedido,
  crearPedido,
  getPedidos,
  getProductos,
  rechazarPedido,
} from '../api/bffClient';
import FormularioPedido from '../components/FormularioPedido';
import TablaPedidos from '../components/TablaPedidos';
import { useToast } from '../hooks/useToast';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, Toast } = useToast();

  // Carga paralela eficiente de datos
  const cargarDatos = useCallback(async () => {
    try {
      const [resPedidos, resProductos] = await Promise.all([
        getPedidos(),
        getProductos()
      ]);
      setPedidos(resPedidos.data || []);
      setProductos(resProductos.data || []);
    } catch (err) {
      showToast('Error al cargar la información del servidor', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Manejador genérico de acciones (Crear, ... )
  const ejecutarAccion = async (promesa, msgExito, msgError) => {
    try {
      await promesa;
      showToast(msgExito, 'success');
      await cargarDatos();
    } catch (err) {
      const errorMsg = err.response?.data?.message || msgError;
      showToast(errorMsg, 'error');
    }
  };

  const crear = (data) =>
      ejecutarAccion(crearPedido(data), 'Pedido creado con éxito', 'Error al crear pedido');

  const aprobar = (id) =>
      ejecutarAccion(aprobarPedido(id), 'Pedido aprobado con éxito', 'No se pudo aprobar el pedido');

  const rechazar = (id) =>
      ejecutarAccion(rechazarPedido(id), 'Pedido rechazado', 'No se pudo rechazar el pedido');

  // 🚀 LA SOLUCIÓN RE REAL: Formateamos al vuelo solo para la vista de la tabla
  // Mantenemos las IDs y los datos originales intactos, pero cambiamos la presentación de la fecha
  const pedidosFormateados = pedidos.map((pedido) => {
    let fechaLimpia = '---';
    if (pedido.fecha) {
      try {
        fechaLimpia = new Date(pedido.fecha).toLocaleString('es-CL', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
      } catch (e) {
        fechaLimpia = pedido.fecha;
      }
    }
    return {
      ...pedido,
      fecha: fechaLimpia,
    };
  });

  return (
      <div className="container py-4">
        <Toast />
        <h1 className="mb-4">Pedidos</h1>

        <FormularioPedido productos={productos} onCrear={crear} />

        <div className="card mt-4 shadow-sm">
          {loading ? (
              <div className="p-4 text-center">Cargando pedidos...</div>
          ) : (
              <TablaPedidos
                  pedidos={pedidosFormateados} /* 🎯 Pasamos la data con las fechas ya arregladas aquí mismo */
                  onAprobar={aprobar}
                  onRechazar={rechazar}
              />
          )}
        </div>
      </div>
  );
}