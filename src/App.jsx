import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BottomNav from './components/BottomNav';
import CategoryFilter from './components/CategoryFilter';

export default function App() {
  const [view, setView] = useState('HOME'); // HOME, DETAILS, CART, PROFILE, NOTIFICATIONS
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeTab, setActiveTab] = useState('description'); // Para la vista de detalles

  // Perfil de usuario simulado / conectado
  const [user, setUser] = useState({ name: 'Nexus Operative', credits: 125000, email: 'agent@multiverse.net' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('*');
    if (data) setItems(data);
  };

  const filteredItems = selectedCategory === 'Todos' 
    ? items 
    : items.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());

  const addToCart = (item) => {
    if (!cart.some(cartItem => cartItem.id === item.id)) {
      setCart([...cart, item]);
      alert(`¡${item.title} añadido a tu bolsa de compra!`);
    } else {
      alert('Este artículo ya está en tu bolsa.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex justify-center pb-24 select-none">
      {/* Contenedor principal simulando diseño móvil / app centrada */}
      <div className="w-full max-w-md p-5 flex flex-col gap-6 relative">

        {/* VISTA HOME */}
        {view === 'HOME' && (
          <>
            {/* Header superior */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center font-bold text-blue-400">
                  MV
                </div>
                <div>
                  <p className="text-xs text-gray-400">Bienvenido de nuevo</p>
                  <h2 className="font-bold text-base text-gray-200">{user.name}</h2>
                </div>
              </div>
              <div className="relative bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-blue-400 font-bold text-xs">
                {user.credits.toLocaleString()} UCREDS
              </div>
            </div>

            {/* Banner Promocional (Estilo Referencia) */}
            <div className="bg-gradient-to-r from-blue-900/60 to-indigo-950 border border-blue-500/30 rounded-2xl p-5 flex justify-between items-center relative overflow-hidden shadow-xl">
              <div className="z-10 space-y-2 max-w-[60%]" >
                <h3 className="font-bold text-sm text-white leading-tight">50% de descuento en tu primer artefacto cósmico.</h3>
                <button onClick={() => setSelectedCategory('Reliquias')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30">
                  Ver Ofertas
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-40 text-7xl">🌌</div>
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-gray-200">Categorías</h3>
                <span className="text-xs text-blue-400 cursor-pointer">Ver todo</span>
              </div>
              <CategoryFilter selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            </div>

            {/* Grid de Productos (Cards Estilo Referencia) */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-gray-200">Explorar Multiverso</h3>
              <div className="grid grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    className="bg-[#111827] border border-gray-800/80 rounded-2xl p-3 flex flex-col justify-between shadow-lg hover:border-gray-700 transition group"
                  >
                    <div>
                      <div className="relative bg-gray-900/50 rounded-xl p-2 mb-3 h-32 flex items-center justify-center overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-300" 
                        />
                        <button className="absolute top-3 right-3 p-1.5 bg-gray-900/80 backdrop-blur rounded-full text-gray-300 hover:text-red-400 transition">
                          🤍
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-gray-200 truncate">{item.title}</h4>
                      <p className="text-[11px] text-gray-400 truncate">{item.target}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{item.bounty.toLocaleString()} UCREDS</span>
                      <button 
                        onClick={() => { setSelectedItem(item); setView('DETAILS'); }}
                        className="p-2 bg-gray-900 hover:bg-blue-600 text-gray-300 hover:text-white rounded-xl border border-gray-800 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* VISTA DETAILS (DETALLES DEL PRODUCTO) */}
        {view === 'DETAILS' && selectedItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setView('HOME')} className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 hover:text-white">
                &larr; Volver
              </button>
              <h3 className="font-bold text-base">Detalles del Artículo</h3>
              <button className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-red-400">🤍</button>
            </div>

            {/* Imagen Principal */}
            <div className="bg-[#111827] border border-gray-800 rounded-3xl p-4 flex justify-center items-center h-64 shadow-xl">
              <img src={selectedItem.image_url} alt={selectedItem.title} className="max-h-full max-w-full object-contain rounded-2xl" />
            </div>

            {/* Puntuación y Precio */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-blue-400 font-semibold uppercase">{selectedItem.category}</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedItem.title}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Precio</span>
                <span className="text-xl font-bold text-blue-400">{selectedItem.bounty.toLocaleString()} $</span>
              </div>
            </div>

            {/* Pestañas Descripción / Reseñas */}
            <div className="space-y-3">
              <div className="flex gap-4 border-b border-gray-800 pb-2">
                <button 
                  onClick={() => setActiveTab('description')} 
                  className={`pb-1 text-sm font-bold transition ${activeTab === 'description' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                >
                  Descripción
                </button>
                <button 
                  onClick={() => setActiveTab('origin')} 
                  className={`pb-1 text-sm font-bold transition ${activeTab === 'origin' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                >
                  Origen Multiversal
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {activeTab === 'description' ? selectedItem.description : `Este artefacto fue catalogado originalmente en el universo: ${selectedItem.target}. Manejese con extrema precaución cósmica.`}
              </p>
            </div>

            {/* Botón Comprar / Añadir a bolsa */}
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => addToCart(selectedItem)}
                className="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-gray-200 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </button>
              <button 
                onClick={() => { addToCart(selectedItem); setView('CART'); }}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition text-center"
              >
                Comprar Ahora
              </button>
            </div>
          </div>
        )}

        {/* VISTA CART (BOLSA / CARRITO) */}
        {view === 'CART' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">Tu Bolsa Multiversal</h2>
            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">Tu bolsa de compra está vacía.</div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="bg-[#111827] border border-gray-800 p-4 rounded-2xl flex items-center justify-between">
                    <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-xl border border-gray-800" />
                    <div className="flex-1 ml-4">
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-blue-400 font-bold">{item.bounty.toLocaleString()} UCREDS</p>
                    </div>
                    <button 
                      onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                      className="text-gray-500 hover:text-red-400 p-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-800 flex justify-between items-center font-bold">
                  <span>Total:</span>
                  <span className="text-blue-400 text-lg">{cart.reduce((acc, curr) => acc + curr.bounty, 0).toLocaleString()} UCREDS</span>
                </div>
                <button 
                  onClick={() => { alert('¡Transacción interdimensional completada con éxito!'); setCart([]); setView('HOME'); }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl transition"
                >
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        )}

        {/* VISTA NOTIFICATIONS (NEGOCIACIONES / ALERTAS) */}
        {view === 'NOTIFICATIONS' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Centro de Alertas</h2>
            <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-blue-400 font-bold">NUEVA OFERTA</span>
              <h4 className="font-bold text-sm">El Coleccionista respondió a tu propuesta</h4>
              <p className="text-xs text-gray-400">Hay una contraoferta disponible para el Ojo de Agamotto.</p>
            </div>
          </div>
        )}

        {/* VISTA PROFILE */}
        {view === 'PROFILE' && (
          <div className="space-y-6 text-center">
            <h2 className="text-lg font-bold">Perfil del Operador</h2>
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-1 flex items-center justify-center text-3xl shadow-xl">
              🥷
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{user.name}</h3>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3 text-left">
              <div className="flex justify-between text-xs py-2 border-b border-gray-800">
                <span className="text-gray-400">Historial de Órdenes</span>
                <span>3 Registros</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-gray-800">
                <span className="text-gray-400">Dirección de Envío</span>
                <span>Tierra-616, Sector 4</span>
              </div>
              <div className="flex justify-between text-xs py-2">
                <span className="text-gray-400">Método de Pago</span>
                <span>Créditos UCREDS</span>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE NAVEGACIÓN INFERIOR */}
        <BottomNav currentView={view} setView={setView} cartCount={cart.length} />

      </div>
    </div>
  );
}