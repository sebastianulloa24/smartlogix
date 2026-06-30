import { useEffect, useState } from 'react';
import { getDashboard } from '../api/bffClient';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const { showToast, Toast } = useToast();

    useEffect(() => {
        getDashboard()
            .then((res) => setData(res.data))
            .catch(() => showToast('Error al cargar dashboard desde BFF', 'error'));
    }, [showToast]);

    return (
        <div className="container">
            <Toast />
            <h1 style={{ marginBottom: '1.5rem', color: '#1a1a2e' }}>Dashboard logístico</h1>

            {!data ? (
                <p>Cargando métricas de la arquitectura...</p>
            ) : (
                <div className="grid-dashboard">

                    {/* ÚLTIMO PEDIDO */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Último pedido</h3>
                            <span className="toast-success" style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: '#fff' }}>
                {data.pedido?.estado || 'N/A'}
              </span>
                        </div>
                        {data.pedido && Object.keys(data.pedido).length ? (
                            <div>
                                <p><strong>ID:</strong> #{data.pedido.id}</p>
                                <p><strong>Fecha:</strong> {new Date(data.pedido.fecha).toLocaleString()}</p>
                                <p><strong>Total:</strong> ${data.pedido.total?.toLocaleString()}</p>
                                <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '0.95rem' }}>Ítems:</h4>
                                <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem' }}>
                                    {data.pedido.detalles?.map((det) => (
                                        <li key={det.id}>
                                            Prod ID: {det.productoId} — Cantidad: {det.cantidad}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="error-text">Sin órdenes registradas</p>
                        )}
                    </div>

                    {/* INVENTARIO COMPACTO */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Productos ({data.productos?.length || 0})</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {(data.productos || []).slice(0, 5).map((p) => (
                                <li key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e8ecf4', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{p.nombre}</span>
                                    <strong>Stock: {p.stock}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ÚLTIMO ENVÍO */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Último envío</h3>
                            <span className="toast-error" style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: '#fff' }}>
                {data.envio?.estado || 'N/A'}
              </span>
                        </div>
                        {data.envio && Object.keys(data.envio).length ? (
                            <div>
                                <p><strong>ID Envío:</strong> #{data.envio.id}</p>
                                <p><strong>Destino:</strong> {data.envio.direccion}</p>
                                <p><strong>Courier:</strong> {data.envio.transportista}</p>
                                <p><strong>Est. Entrega:</strong> {data.envio.fechaEstimada}</p>
                            </div>
                        ) : (
                            <p className="error-text">No hay despachos en curso</p>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}