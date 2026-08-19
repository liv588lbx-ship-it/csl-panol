'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function PanolApp() {
  const [seccion, setSeccion] = useState('maestro');
  const [materiales, setMateriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el formulario de nuevo material
  const [codigoSap, setCodigoSap] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('m');
  const [requiereCert, setRequiereCert] = useState(true);

  // Nuevos estados para Recepción
  const [rec, setRec] = useState({ remito: '', sap: '' });
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // Estados para Vales de Salida
  const [vale, setVale] = useState({ nro: 'V-001', frente: 'Campo', sap: '', cantidad: '', spool: '', retira: '' });
  const [guardandoVale, setGuardandoVale] = useState(false);

  const [inventario, setInventario] = useState([]);
  const [trazabilidad, setTrazabilidad] = useState({ fecha: '', linea: '', spool: '', junta: '', material: '', colada: '', aporte: '', cert: 'SÍ' });
  const [guardandoTraz, setGuardandoTraz] = useState(false);




  // Cargar datos de materiales
  useEffect(() => {
    fetchMateriales();
  }, []);

  async function fetchMateriales() {
    setCargando(true);
    const { data, error } = await supabase
      .from('maestro_materiales')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error al cargar materiales:', error.message);
    } else {
      setMateriales(data || []);
    }
    setCargando(false);
  }

  async function handleGuardarRecepcion(e) {
    e.preventDefault();
    setSubiendo(true);
    try {
      let urlFoto = null;
      if (archivo) {
        const fileName = `${Date.now()}_${archivo.name}`;
        const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, archivo);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
        urlFoto = data.publicUrl;
      }
      const { error } = await supabase.from('recepciones').insert([{ nro_remito: rec.remito, codigo_sap: rec.sap, foto_url: urlFoto }]);
      if (error) throw error;
      alert("¡Recepción guardada con éxito!");
      setRec({ remito: '', sap: '' });
      setArchivo(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubiendo(false);
    }
  }
  
  async function handleCrearMaterial(e) {
    e.preventDefault();
    const { error } = await supabase
      .from('maestro_materiales')
      .insert([
        {
          codigo_sap: codigoSap,
          descripcion: descripcion,
          unidad_medida: unidad,
          requiere_certificado: requiereCert
        }
      ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('¡Material agregado con éxito!');
      setCodigoSap('');
      setDescripcion('');
      fetchMateriales();
    }
  }

  async function handleGuardarVale(e) {
    e.preventDefault();
    setGuardandoVale(true);
    try {
      const { error } = await supabase.from('vales_salida').insert([{
        nro_vale: vale.nro,
        frente: vale.frente,
        codigo_sap: vale.sap,
        cantidad: Number(vale.cantidad),
        spool_destino: vale.spool,
        retira: vale.retira
      }]);
      if (error) throw error;
      alert("¡Vale de salida registrado con éxito!");
      setVale({ ...vale, nro: '', sap: '', cantidad: '', spool: '', retira: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoVale(false);
    }
  }

  async function fetchInventarioRealTime() {
    // Traemos materiales, recepciones y vales para calcular el stock actual
    const { data: mats } = await supabase.from('maestro_materiales').select('*');
    const { data: recs } = await supabase.from('recepciones').select('*');
    const { data: vales } = await supabase.from('vales_salida').select('*');

    // Cruzamos los datos por código SAP tipando explícitamente el objeto
    const stockCalculado = (mats || []).map((m: any) => {
      const ingresado = (recs || []).filter((r: any) => r.codigo_sap === m.codigo_sap).length;
      const entregado = (vales || []).filter((v: any) => v.codigo_sap === m.codigo_sap).reduce((acc: number, v: any) => acc + (Number(v.cantidad) || 0), 0);
      return {
        ...m,
        ingresado,
        entregado,
        disponible: ingresado - entregado
      };
    });
    setInventario(stockCalculado);
  }
  async function handleGuardarTrazabilidad(e) {
    e.preventDefault();
    setGuardandoTraz(true);
    try {
      const { error } = await supabase.from('trazabilidad').insert([{
        fecha: trazabilidad.fecha,
        linea: trazabilidad.linea,
        nro_spool: trazabilidad.spool,
        nro_junta: trazabilidad.junta,
        material: trazabilidad.material,
        nro_colada: trazabilidad.colada,
        colada_aporte: trazabilidad.aporte,
        cert_archivado: trazabilidad.cert
      }]);
      if (error) throw error;
      alert("¡Trazabilidad de junta registrada con éxito!");
      setTrazabilidad({ ...trazabilidad, spool: '', junta: '', material: '', colada: '', aporte: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoTraz(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-5 border-b border-slate-800">
          <h2 className="font-bold text-white text-lg tracking-wide flex items-center gap-2">
            <span className="text-amber-400">🛡️</span> CSL PAÑOL
          </h2>
          <span className="text-xs text-slate-500 uppercase tracking-wider">GC-CARB-006-2026</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setSeccion('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            📊 Tablero Principal
          </button>
          <button 
            onClick={() => setSeccion('maestro')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'maestro' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            📦 Catálogo Maestro
          </button>
          <button 
            onClick={() => setSeccion('recepcion')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'recepcion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            🚚 Recepción & Fotos
          </button>
          <button 
            onClick={() => setSeccion('vales')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'vales' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            📄 Vales de Salida
          </button>
          <button 
            onClick={() => setSeccion('inventario')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'inventario' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            🏭 Inventario Real-Time
          </button>
          <button 
            onClick={() => setSeccion('trazabilidad')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${seccion === 'trazabilidad' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            🔗 Trazabilidad de Juntas
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          Salar de Cauchari — 3.900 msnm
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Cabecera Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 capitalize">
            {seccion === 'maestro' && 'Catálogo Maestro de Materiales'}
            {seccion === 'dashboard' && 'Tablero de Control Operativo'}
            {seccion === 'recepcion' && 'Recepción de Materiales y Certificados'}
            {seccion === 'vales' && 'Vales de Salida al Frente'}
            {seccion === 'inventario' && 'Inventario Permanente y Stock'}
            {seccion === 'trazabilidad' && 'Trazabilidad de Juntas y Spools'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              ● Base Online Conectada
            </span>
          </div>
        </header>

        {/* Cuerpo dinámico según la sección elegida */}
        <div className="p-8">
          
          {seccion === 'maestro' && (
            <div className="space-y-6">
              
              {/* Formulario de Alta */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-md font-bold text-slate-800 mb-4">➕ Dar de alta nuevo ítem en el Catálogo</h3>
                <form onSubmit={handleCrearMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Código SAP</label>
                    <input 
                      type="text" 
                      placeholder="Ej: 8000422" 
                      value={codigoSap} 
                      onChange={(e) => setCodigoSap(e.target.value)} 
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción del Material</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Caño 6in A312 TP316L" 
                      value={descripcion} 
                      onChange={(e) => setDescripcion(e.target.value)} 
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unidad</label>
                    <select 
                      value={unidad} 
                      onChange={(e) => setUnidad(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="m">Metros (m)</option>
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="pza">Piezas (pza)</option>
                      <option value="gl">Galones / Unidades (gl)</option>
                    </select>
                  </div>
                  <div>
                    <button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">
                      Guardar Ítem
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabla de Materiales */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Listado Maestro Actual ({materiales.length})</h3>
                  <button onClick={fetchMateriales} className="text-xs text-blue-600 hover:underline font-semibold">🔄 Actualizar Lista</button>
                </div>
                
                {cargando ? (
                  <p className="p-6 text-slate-500 text-center">Cargando materiales...</p>
                ) : materiales.length === 0 ? (
                  <p className="p-6 text-slate-500 text-center">No hay materiales cargados todavía. Usá el formulario de arriba para agregar el primero.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                          <th className="py-3 px-6 font-semibold">Código SAP</th>
                          <th className="py-3 px-6 font-semibold">Descripción</th>
                          <th className="py-3 px-6 font-semibold">Unidad</th>
                          <th className="py-3 px-6 font-semibold">Requiere Certificado 3.1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {materiales.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-6 font-mono font-bold text-slate-900">{m.codigo_sap}</td>
                            <td className="py-3 px-6 text-slate-800">{m.descripcion}</td>
                            <td className="py-3 px-6 text-slate-600">{m.unidad_medida}</td>
                            <td className="py-3 px-6">
                              {m.requiere_certificado ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Sí (Crítico)</span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {seccion === 'recepcion' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-lg">
              <h3 className="font-bold text-slate-800 mb-4">🚚 Registrar Nueva Recepción</h3>
              <form onSubmit={handleGuardarRecepcion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nro Remito</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" 
                    placeholder="Ej: REM-5521" 
                    value={rec.remito} 
                    onChange={(e) => setRec({...rec, remito: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código SAP / Material</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" 
                    placeholder="Buscar código..." 
                    value={rec.sap} 
                    onChange={(e) => setRec({...rec, sap: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Adjuntar Evidencia (Fotos/PDF)</label>
                  <input 
                    type="file" 
                    onChange={(e) => setArchivo(e.target.files[0])} 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={subiendo} 
                  className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  {subiendo ? 'Guardando en la nube...' : 'Guardar Recepción'}
                </button>
              </form>
            </div>
          )}

          {seccion === 'vales' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-lg">
              <h3 className="font-bold text-slate-800 mb-4">📄 Registrar Vale de Salida al Frente</h3>
              <form onSubmit={handleGuardarVale} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nro de Vale</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: V-001" value={vale.nro} onChange={(e) => setVale({...vale, nro: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Frente de Trabajo</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Campo / Taller" value={vale.frente} onChange={(e) => setVale({...vale, frente: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código SAP / Material</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: 1021880" value={vale.sap} onChange={(e) => setVale({...vale, sap: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad</label>
                  <input type="number" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: 5" value={vale.cantidad} onChange={(e) => setVale({...vale, cantidad: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Spool / Destino Asociado</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: P1-SP-001" value={vale.spool} onChange={(e) => setVale({...vale, spool: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Responsable que Retira</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: M. Gómez" value={vale.retira} onChange={(e) => setVale({...vale, retira: e.target.value})} />
                </div>
                <button type="submit" disabled={guardandoVale} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">
                  {guardandoVale ? 'Registrando salida...' : 'Emitir Vale de Salida'}
                </button>
              </form>
            </div>
          )}

          {seccion !== 'maestro' && seccion !== 'recepcion' && seccion !== 'vales' && seccion !== 'inventario' && seccion !== 'trazabilidad' && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
              <h3 className="text-lg font-bold text-slate-700 mb-2">Módulo en construcción</h3>
              <p className="text-slate-500 text-sm">Estamos activando este módulo...</p>
            </div>
          )}
          {seccion === 'inventario' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">🏭 Inventario Permanente en Tiempo Real</h3>
                <button onClick={fetchInventarioRealTime} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                  🔄 Actualizar Stock
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                      <th className="py-3 px-6 font-semibold">Código SAP</th>
                      <th className="py-3 px-6 font-semibold">Descripción</th>
                      <th className="py-3 px-6 font-semibold">Unidad</th>
                      <th className="py-3 px-6 font-semibold">Ingresado</th>
                      <th className="py-3 px-6 font-semibold">Entregado</th>
                      <th className="py-3 px-6 font-semibold">Disponible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {inventario.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-slate-500">
                          Hacé clic en "Actualizar Stock" para calcular las existencias.
                        </td>
                      </tr>
                    ) : (
                      inventario.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-6 font-mono font-bold text-slate-900">{item.codigo_sap}</td>
                          <td className="py-3 px-6 text-slate-800">{item.descripcion}</td>
                          <td className="py-3 px-6 text-slate-600">{item.unidad_medida}</td>
                          <td className="py-3 px-6 text-slate-700 font-semibold">{item.ingresado}</td>
                          <td className="py-3 px-6 text-slate-700 font-semibold">{item.entregado}</td>
                          <td className="py-3 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.disponible > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {item.disponible} {item.unidad_medida}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {seccion === 'trazabilidad' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl">
              <h3 className="font-bold text-slate-800 mb-2">🔗 Registro de Trazabilidad (Junta / Spool / Colada)</h3>
              <p className="text-xs text-slate-500 mb-4">Obligatorio para el dossier de calidad. Cada junta debe vincularse con su certificado.</p>
              
              <form onSubmit={handleGuardarTrazabilidad} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha</label>
                    <input type="date" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.fecha} onChange={(e) => setTrazabilidad({...trazabilidad, fecha: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Línea</label>
                    <input type="text" required placeholder="Ej: P1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.linea} onChange={(e) => setTrazabilidad({...trazabilidad, linea: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nro de Spool</label>
                    <input type="text" required placeholder="Ej: P1-SP-001" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.spool} onChange={(e) => setTrazabilidad({...trazabilidad, spool: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nro de Junta</label>
                    <input type="text" required placeholder="Ej: P1-J-001" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.junta} onChange={(e) => setTrazabilidad({...trazabilidad, junta: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Material Empleado (Descripción)</label>
                  <input type="text" required placeholder="Ej: Caño 4in A312 TP316L" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.material} onChange={(e) => setTrazabilidad({...trazabilidad, material: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nro de Colada (Material)</label>
                    <input type="text" required placeholder="Ej: H-55107" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.colada} onChange={(e) => setTrazabilidad({...trazabilidad, colada: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Colada de Aporte / Gas</label>
                    <input type="text" required placeholder="Ej: C-88214" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={trazabilidad.aporte} onChange={(e) => setTrazabilidad({...trazabilidad, aporte: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">¿Certificado Archivado?</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" value={trazabilidad.cert} onChange={(e) => setTrazabilidad({...trazabilidad, cert: e.target.value})}>
                    <option value="SÍ">SÍ</option>
                    <option value="NO">NO (Pendiente QA/QC)</option>
                  </select>
                </div>

                <button type="submit" disabled={guardandoTraz} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">
                  {guardandoTraz ? 'Registrando trazabilidad...' : 'Guardar Trazabilidad de Junta'}
                </button>
              </form>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}