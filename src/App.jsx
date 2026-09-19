import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BottomNav from './components/BottomNav';
import CategoryFilter from './components/CategoryFilter';

export default function App() {
  const [view, setView] = useState('HOME'); // HOME, DETAILS, CART, PROFILE, NOTIFICATIONS, AUTH
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeTab, setActiveTab] = useState('description');
  
  // Usuario y Autenticación
  const [user, setUser] = useState(null); // null si es invitado o no logueado
  const [authMode, setAuthMode] = useState('LOGIN'); // LOGIN o REGISTER
  const [agentIdInput, setAgentIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Notificaciones y Negociaciones desde Supabase
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchNotifications();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*');
    if (data) setItems(data);
  };

  const fetchNotifications = async () => {
    // Simulamos o traemos negociaciones activas de la base de datos
    const { data } = await supabase.from('active_sessions').select('*, items(title)').limit(5);
    if (data && data.length > 0) {
      setNotifications(data);
    } else {
      setNotifications([
        { id: 1, title: 'El Coleccionista', message: 'Hay una contraoferta disponible para el Ojo de Agamotto.', type: 'NEGOTIATION' }
      ]);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('agent_id', agentIdInput.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      alert('ID de Agente no reconocido en el mainframe.');
      return;
    }

    setUser({ dbId: data.id, name: data.name, id: data.agent_id, credits: data.credits });
    setView('HOME');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const generatedId = Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data, error } = await supabase.from('operators').insert([{
      agent_id: generatedId,
      name: nameInput.trim(),
      pin: '0000',
      credits: 1000
    }]).select().single();

    if (!error && data) {
      setUser({ dbId: data.id, name: data.name, id: data.agent_id, credits: data.credits });
      alert(`¡Registro exitoso! Tu ID de Agente es: ${generatedId}`);
      setView('HOME');
    } else {
      alert('Error al registrar operador.');
    }
  };

  const handleActionRestricted = (callback) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar esta acción.');
      setView('AUTH');
      return;
    }
    callback();
  };

  const addToCart = (item) => {
    handleActionRestricted(() => {
      if (!cart.some(c => c.id === item.id)) {
        setCart([...cart, item]);
        alert(`¡${item.title} añadido a tu bolsa!`);
      } else {
        alert('Este artículo ya está en tu bolsa.');
      }
    });
  };

  const filteredItems = selectedCategory === 'Todos' 
    ? items 
    : items.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center pb-24 select-none">
      <div className="w-full max-w-md p-5 flex flex-col gap-6 relative">

        {/* VISTA AUTH (LOGIN / REGISTRO) */}
        {view === 'AUTH' && (
          <div className="mt-10 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Acceso a la Red</h2>
              <button onClick={() => setView('HOME')} className="text-xs text-slate-400 hover:text-slate-600">Continuar como invitado</button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'LOGIN' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Iniciar Sesión</button>
              <button onClick={() => setAuthMode('REGISTER')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'REGISTER' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Registrarse</button>
            </div>

            {authMode === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Introduce tu ID de Agente (Ej: A4F2)" 
                  value={agentIdInput} 
                  onChange={e => setAgentIdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-slate-800 outline-none focus:border-slate-400 text-sm"
                  required
                />
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition text-sm">Entrar a la Terminal</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Tu Nombre Táctico" 
                  value={nameInput} 
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-slate-800 outline-none focus:border-slate-400 text-sm"
                  required
                />
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition text-sm">Crear Cuenta</button>
              </form>
            )}
          </div>
        )}

        {/* VISTA HOME */}
        {view === 'HOME' && (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-900 shadow-sm">
                  MV
                </div>
                <div>
                  <p className="text-xs text-slate-400">Bienvenido</p>
                  <h2 className="font-bold text-sm text-slate-800">{user ? user.name : 'Visitante Anónimo'}</h2>
                </div>
              </div>
              <div 
                onClick={() => !user && setView('AUTH')}
                className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl text-slate-800 font-bold text-xs shadow-sm cursor-pointer"
              >
                {user ? `${user.credits.toLocaleString()} UCREDS` : '🔑 Iniciar Sesión'}
              </div>
            </div>

            {/* Banner de Referencia Estilo App Limpia */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 flex justify-between items-center shadow-xl relative overflow-hidden">
              <div className="z-10 space-y-2 max-w-[65%]">
                <span className="bg-slate-800 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md">OFERTA CÓSMICA</span>
                <h3 className="font-bold text-sm leading-snug">50% de descuento en tu primer artefacto del multiverso.</h3>
                <button onClick={() => setSelectedCategory('Reliquias')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md">
                  Comprar Ahora
                </button>
              </div>
              <div className="absolute right-2 -bottom-2 text-6xl opacity-30">⚡</div>
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800">Categorías</h3>
                <span className="text-xs text-blue-600 font-semibold cursor-pointer">Ver todo</span>
              </div>
              <CategoryFilter selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            </div>

            {/* Grid de Productos */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Explorar</h3>
              <div className="grid grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    className="bg-white border border-slate-200/80 rounded-3xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition group"
                  >
                    <div>
                      <div className="relative bg-slate-100 rounded-2xl p-2 mb-3 h-32 flex items-center justify-center overflow-hidden">
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-300" />
                        <button className="absolute top-2.5 right-2.5 p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-600 hover:text-red-500 shadow-sm transition">
                          🤍
                        </button>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{item.target}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{item.bounty.toLocaleString()} $</span>
                      <button 
                        onClick={() => { setSelectedItem(item); setView('DETAILS'); }}
                        className="p-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl transition shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* VISTA DETAILS */}
        {view === 'DETAILS' && selectedItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setView('HOME')} className="p-2 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm">
                &larr;
              </button>
              <h3 className="font-bold text-sm text-slate-800">Details</h3>
              <button className="p-2 bg-white border border-slate-200 rounded-2xl text-red-500 shadow-sm">🤍</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-4 flex justify-center items-center h-64 shadow-sm">
              <img src={selectedItem.image_url} alt={selectedItem.title} className="max-h-full max-w-full object-contain rounded-2xl" />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{selectedItem.category}</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedItem.title}</h2>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-slate-900">{selectedItem.bounty.toLocaleString()} $</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('description')} className={`pb-1 text-xs font-bold transition ${activeTab === 'description' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Description</button>
                <button onClick={() => setActiveTab('reviews')} className={`pb-1 text-xs font-bold transition ${activeTab === 'reviews' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Reviews</button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeTab === 'description' ? selectedItem.description : `Universo de origen: ${selectedItem.target}. Calificación de rareza del objeto valorada en 4.9 estrellas.`}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => addToCart(selectedItem)} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-800 shadow-sm hover:bg-slate-50 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </button>
              <button onClick={() => addToCart(selectedItem)} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition text-xs">
                Buy Now
              </button>
            </div>
          </div>
        )}

        {/* VISTA CART */}
        {view === 'CART' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-800">Bolsa de Compra</h2>
            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">Tu bolsa está vacía.</div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                    <img src={item.image_url} alt={item.title} className="w-14 h-14 object-cover rounded-xl border border-slate-100" />
                    <div className="flex-1 ml-3">
                      <h4 className="font-bold text-xs text-slate-800">{item.title}</h4>
                      <p className="text-xs text-blue-600 font-bold">{item.bounty.toLocaleString()} $</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-slate-400 hover:text-red-500 p-2">✕</button>
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
                  <span>Total a pagar:</span>
                  <span className="text-blue-600">{cart.reduce((acc, curr) => acc + curr.bounty, 0).toLocaleString()} $</span>
                </div>
                <button 
                  onClick={() => handleActionRestricted(() => { alert('¡Compra procesada con éxito!'); setCart([]); setView('HOME'); })}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl text-xs"
                >
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        )}

        {/* VISTA NOTIFICATIONS (MENSAJES Y NEGOCIACIONES) */}
        {view === 'NOTIFICATIONS' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">Negociaciones y Mensajes</h2>
            {notifications.map((n, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{n.title || 'Mensaje del Dueño'}</span>
                  <span className="text-[10px] text-slate-400">Hace un momento</span>
                </div>
                <p className="text-xs text-slate-600">{n.message || 'El propietario del artículo está considerando tu oferta de trueque.'}</p>
                <button onClick={() => alert('Entrando a sala de negociación activa...')} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl mt-2">Gestionar Negociación</button>
              </div>
            ))}
          </div>
        )}

        {/* VISTA PROFILE (BLOQUEADA SI NO HAY SESIÓN) */}
        {view === 'PROFILE' && (
          <div className="space-y-6 text-center">
            <h2 className="text-base font-bold text-slate-800">Profile</h2>
            {!user ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-4 mt-10">
                <div className="text-4xl">🔒</div>
                <h3 className="font-bold text-sm text-slate-800">No has iniciado sesión</h3>
                <p className="text-xs text-slate-500">Para ver tu perfil táctico, balance y datos de operador, debes ingresar a tu cuenta.</p>
                <button onClick={() => setView('AUTH')} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-lg">Iniciar Sesión / Registrarse</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                  <p className="text-xs text-slate-400">ID: {user.id}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 text-left shadow-sm">
                  <div className="flex justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-400">Créditos Disponibles</span>
                    <span className="font-bold text-blue-600">{user.credits.toLocaleString()} UCREDS</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-400">Order History</span>
                    <span>Ver compras</span>
                  </div>
                  <div className="flex justify-between text-xs py-2">
                    <span className="text-slate-400">Shipping Address</span>
                    <span>Tierra-616, Sector 4</span>
                  </div>
                </div>
                <button onClick={() => setUser(null)} className="w-full py-3 bg-red-50 text-red-600 border border-red-200 font-bold rounded-2xl text-xs">Cerrar Sesión</button>
              </div>
            )}
          </div>
        )}

        <BottomNav currentView={view} setView={setView} cartCount={cart.length} />

      </div>
    </div>
  );
}