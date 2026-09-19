import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BottomNav from './components/BottomNav';
import CategoryFilter from './components/CategoryFilter';

export default function App() {
  const [view, setView] = useState('HOME'); // HOME, DETAILS, CART, PROFILE, NOTIFICATIONS, AUTH, ADMIN
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  
  // Usuario y Auth
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('LOGIN');
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Notificaciones
  const [notifications, setNotifications] = useState([]);
  const [showToast, setShowToast] = useState(null);

  // Panel de Admin (Tabs: 'item', 'vendor')
  const [adminTab, setAdminTab] = useState('item'); 
  const [newItem, setNewItem] = useState({ title: '', target: '', bounty: '', category: 'Reliquias', description: '', stock: 1, vendor_id: '' });
  const [imageFile, setImageFile] = useState(null);

  // Crear Dueño / Vendedor
  const [newVendor, setNewVendor] = useState({ name: '', universe: '' });
  const [vendorAvatarFile, setVendorAvatarFile] = useState(null);

  // Estadísticas (Top 5)
  const [topSearched, setTopSearched] = useState([]);
  const [topBought, setTopBought] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchVendors();
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*, vendors(name, avatar_url, universe)');
    if (data) {
      setItems(data);
      setTopSearched([...data].sort((a, b) => b.rating - a.rating).slice(0, 5));
      setTopBought([...data].sort((a, b) => a.stock - b.stock).slice(0, 5));
    }
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors').select('*');
    if (data) setVendors(data);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.dbId).order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setNotifications(data);
      const unread = data.find(n => !n.read);
      if (unread) {
        setShowToast(unread);
        setTimeout(() => setShowToast(null), 5000);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_code', codeInput.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      alert('Código de acceso no encontrado.');
      return;
    }

    setUser({ dbId: data.id, name: data.name, code: data.user_code, credits: data.credits, role: data.role || 'buyer' });
    setView('HOME');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const generatedCode = 'U-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data, error } = await supabase.from('users').insert([{
      user_code: generatedCode,
      name: nameInput.trim(),
      credits: 100000,
      role: 'buyer'
    }]).select().single();

    if (!error && data) {
      setUser({ dbId: data.id, name: data.name, code: data.user_code, credits: data.credits, role: 'buyer' });
      alert(`¡Cuenta creada! Tu código personal es: ${generatedCode}`);
      setView('HOME');
    }
  };

  // SUBIR DUEÑO / VENDEDOR CON FOTO DE PERFIL A SUPABASE STORAGE
  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!vendorAvatarFile) {
      alert('Sube una foto de perfil para el dueño.');
      return;
    }

    try {
      const fileExt = vendorAvatarFile.name.split('.').pop();
      const fileName = `vendor-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('item-images').upload(fileName, vendorAvatarFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('vendors').insert([{
        name: newVendor.name,
        universe: newVendor.universe,
        avatar_url: publicUrl
      }]);

      if (insertError) throw insertError;

      alert(`¡Dueño "${newVendor.name}" registrado con éxito!`);
      setNewVendor({ name: '', universe: '' });
      setVendorAvatarFile(null);
      fetchVendors();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // SUBIR ARTÍCULO VINCULADO AL DUEÑO Y FOTO A SUPABASE STORAGE
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Selecciona una imagen para el artículo (Recomendado 800x800 PNG).');
      return;
    }
    if (!newItem.vendor_id) {
      alert('Selecciona un dueño/vendedor de la lista.');
      return;
    }

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `item-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('item-images').upload(fileName, imageFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(fileName);

      // Buscamos el nombre del vendedor seleccionado para asignarlo como owner
      const chosenVendor = vendors.find(v => v.id === newItem.vendor_id);

      const { error: insertError } = await supabase.from('items').insert([{
        title: newItem.title,
        target: newItem.target,
        bounty: parseInt(newItem.bounty),
        category: newItem.category,
        description: newItem.description,
        stock: parseInt(newItem.stock),
        vendor_id: newItem.vendor_id,
        owner_name: chosenVendor ? chosenVendor.name : 'Desconocido',
        current_owner: chosenVendor ? chosenVendor.name : 'Desconocido',
        image_url: publicUrl,
        rating: 5.0
      }]);

      if (insertError) throw insertError;

      alert('¡Artículo publicado automáticamente en Supabase Storage!');
      setNewItem({ title: '', target: '', bounty: '', category: 'Reliquias', description: '', stock: 1, vendor_id: '' });
      setImageFile(null);
      fetchItems();
      setView('HOME');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleBuyItem = async (item) => {
    if (!user) {
      alert('Inicia sesión para comprar.');
      setView('AUTH');
      return;
    }

    const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('user_id', user.dbId);
    
    let finalPrice = item.bounty;
    let isFirstPurchaseDiscount = false;
    if (count === 0) {
      finalPrice = Math.floor(item.bounty * 0.5); // 50% descuento primera compra
      isFirstPurchaseDiscount = true;
    }

    if (user.credits < finalPrice) {
      alert(`Fondos insuficientes. Necesitas ${finalPrice.toLocaleString()} $`);
      return;
    }

    if (item.stock <= 0) {
      alert('Artículo agotado.');
      return;
    }

    const newCredits = user.credits - finalPrice;
    const newStock = item.stock - 1;

    await supabase.from('users').update({ credits: newCredits }).eq('id', user.dbId);
    await supabase.from('items').update({ stock: newStock, current_owner: user.name }).eq('id', item.id);
    await supabase.from('inventory').insert([{ user_id: user.dbId, item_id: item.id, acquired_price: finalPrice }]);

    setUser(prev => ({ ...prev, credits: newCredits }));
    
    if (isFirstPurchaseDiscount) {
      alert(`🎉 ¡50% de descuento aplicado! Compraste ${item.title} por ${finalPrice.toLocaleString()} $`);
    } else {
      alert(`¡Compra exitosa! Ahora eres el único dueño de ${item.title}.`);
    }

    fetchItems();
    setView('HOME');
  };

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'Todos' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.target.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center pb-24 select-none">
      
      {/* NOTIFICACIÓN FLOTANTE */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-sm w-full mx-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <div className="flex-1">
            <h5 className="font-bold text-xs text-blue-400">{showToast.title}</h5>
            <p className="text-[11px] text-slate-300">{showToast.message}</p>
          </div>
          <button onClick={() => setShowToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="w-full max-w-md p-5 flex flex-col gap-6 relative">

        {/* VISTA AUTH */}
        {view === 'AUTH' && (
          <div className="mt-10 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Autenticación</h2>
              <button onClick={() => setView('HOME')} className="text-xs text-slate-400">Volver</button>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'LOGIN' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Ingresar</button>
              <button onClick={() => setAuthMode('REGISTER')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${authMode === 'REGISTER' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Registrarse</button>
            </div>
            {authMode === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="text" placeholder="Código de acceso (Ej: U-1234)" value={codeInput} onChange={e => setCodeInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs uppercase" required />
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs">Entrar</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <input type="text" placeholder="Tu Nombre" value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs" required />
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs">Crear Cuenta</button>
              </form>
            )}
          </div>
        )}

        {/* VISTA ADMIN / VENDEDOR */}
        {view === 'ADMIN' && (user?.role === 'admin' || user?.role === 'vendor') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setView('HOME')} className="p-2 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm">&larr;</button>
              <h2 className="font-bold text-base text-slate-800">{user.role === 'admin' ? 'Panel Administrador' : 'Panel de Vendedor'}</h2>
              <div />
            </div>

            {user?.role === 'admin' && (
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setAdminTab('item')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${adminTab === 'item' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Publicar Artículo</button>
                <button onClick={() => setAdminTab('vendor')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${adminTab === 'vendor' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Crear Dueño / Vendedor</button>
              </div>
            )}

            {(adminTab === 'item' || user?.role === 'vendor') ? (
              <form onSubmit={handleCreateItem} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800">Publicar Objeto (Automático a Supabase)</h3>
                <input type="text" placeholder="Título" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                <input type="text" placeholder="Universo (Ej: Marvel - Earth-616)" value={newItem.target} onChange={e => setNewItem({...newItem, target: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                <input type="number" placeholder="Precio ($)" value={newItem.bounty} onChange={e => setNewItem({...newItem, bounty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                <input type="number" placeholder="Stock" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                
                {/* SELECTOR DE DUEÑOS REGISTRADOS */}
                <select value={newItem.vendor_id} onChange={e => setNewItem({...newItem, vendor_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required>
                  <option value="">-- Selecciona el Dueño / Vendedor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.universe})</option>
                  ))}
                </select>

                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                  <option value="Reliquias">Reliquias</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Oscuro">Oscuro</option>
                  <option value="Armas">Armas</option>
                </select>
                <textarea placeholder="Descripción..." value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" rows="3" required />
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Foto del Artículo (Recomendado 800x800 PNG):</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white" required />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md">Publicar en el Multiverso</button>
              </form>
            ) : (
              <form onSubmit={handleCreateVendor} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800">Registrar Dueño con Avatar</h3>
                <input type="text" placeholder="Nombre del Dueño (Ej: Tony Stark)" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                <input type="text" placeholder="Universo (Ej: Marvel - Tierra-616)" value={newVendor.universe} onChange={e => setNewVendor({...newVendor, universe: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs" required />
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Foto de Perfil del Dueño (Avatar PNG):</label>
                  <input type="file" accept="image/*" onChange={e => setVendorAvatarFile(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white" required />
                </div>
                <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md">Guardar Dueño</button>
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
                  <h2 className="font-bold text-sm text-slate-800">{user ? user.name : 'Visitante'}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(user?.role === 'admin' || user?.role === 'vendor') && (
                  <button onClick={() => setView('ADMIN')} className="px-3 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-xl shadow-md">Panel</button>
                )}
                <div onClick={() => !user && setView('AUTH')} className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl text-slate-800 font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5">
                  <span className="text-blue-600">💎</span> {user ? `${user.credits.toLocaleString()} $` : 'Iniciar Sesión'}
                </div>
              </div>
            </div>

            {/* BANNER 50% DESCUENTO */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 flex justify-between items-center shadow-xl relative overflow-hidden">
              <div className="z-10 space-y-2 max-w-[65%]">
                <span className="bg-blue-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">PROMOCIÓN ACTIVA</span>
                <h3 className="font-bold text-xs leading-snug">50% de descuento automático en tu primera compra en la tienda.</h3>
              </div>
              <div className="text-3xl">🎁</div>
            </div>

            {/* BUSCADOR */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar objetos del multiverso..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-xs outline-none shadow-sm focus:border-slate-400"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <CategoryFilter selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            </div>

            {/* GRID DE PRODUCTOS (TARJETAS UNIFORMES Y ESTÉTICAS) */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Catálogo Global</h3>
              {filteredItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-400 shadow-sm">
                  No hay artículos publicados todavía. Sube uno desde el panel de administración.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-[#18181b] text-white border border-slate-800 rounded-3xl p-3 flex flex-col justify-between shadow-lg group"
                    >
                      <div>
                        {/* Contenedor de imagen uniforme estricto */}
                        <div className="relative bg-slate-900 rounded-2xl p-2 mb-3 h-32 flex items-center justify-center overflow-hidden">
                          <img src={item.image_url} alt={item.title} className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition duration-300" />
                          <button className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 backdrop-blur rounded-full text-white shadow-sm transition">
                            🤍
                          </button>
                        </div>
                        <h4 className="font-bold text-xs truncate">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{item.target}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">{item.bounty.toLocaleString()}$</span>
                        <button 
                          onClick={() => { setSelectedItem(item); setView('DETAILS'); }}
                          className="p-2 bg-white text-black hover:bg-slate-200 rounded-xl transition shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOP 5 MÁS BUSCADOS */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-slate-800">🔥 Top 5 Más Buscados</h3>
              {topSearched.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">Sin datos de búsqueda.</div>
              ) : (
                <div className="space-y-2">
                  {topSearched.map((item, index) => (
                    <div key={item.id} onClick={() => { setSelectedItem(item); setView('DETAILS'); }} className="bg-white border border-slate-200 p-2.5 rounded-2xl flex items-center gap-3 shadow-sm cursor-pointer hover:border-slate-400 transition">
                      <span className="font-bold text-xs text-blue-600 w-4">#{index + 1}</span>
                      <img src={item.image_url} alt={item.title} className="w-10 h-10 object-contain bg-slate-50 rounded-xl p-1" />
                      <div className="flex-1 truncate">
                        <h5 className="font-bold text-xs text-slate-800 truncate">{item.title}</h5>
                        <p className="text-[10px] text-slate-400">{item.bounty.toLocaleString()} $</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOP 5 MÁS COMPRADOS */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-slate-800">💎 Top 5 Más Comprados</h3>
              {topBought.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">Aún no hay compras.</div>
              ) : (
                <div className="space-y-2">
                  {topBought.map((item, index) => (
                    <div key={item.id} onClick={() => { setSelectedItem(item); setView('DETAILS'); }} className="bg-white border border-slate-200 p-2.5 rounded-2xl flex items-center gap-3 shadow-sm cursor-pointer hover:border-slate-400 transition">
                      <span className="font-bold text-xs text-emerald-600 w-4">#{index + 1}</span>
                      <img src={item.image_url} alt={item.title} className="w-10 h-10 object-contain bg-slate-50 rounded-xl p-1" />
                      <div className="flex-1 truncate">
                        <h5 className="font-bold text-xs text-slate-800 truncate">{item.title}</h5>
                        <p className="text-[10px] text-slate-400">Stock: {item.stock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* VISTA DETAILS */}
        {view === 'DETAILS' && selectedItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setView('HOME')} className="p-2 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm">&larr;</button>
              <h3 className="font-bold text-sm text-slate-800">Detalles</h3>
              <button className="p-2 bg-white border border-slate-200 rounded-2xl text-red-500 shadow-sm">🤍</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-4 flex justify-center items-center h-64 shadow-sm">
              <img src={selectedItem.image_url} alt={selectedItem.title} className="max-h-full max-w-full object-contain rounded-2xl" />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Propietario actual: {selectedItem.current_owner}</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedItem.title}</h2>
                <p className="text-xs text-slate-400">Stock: <span className="font-bold text-slate-700">{selectedItem.stock} unidades</span></p>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-slate-900">{selectedItem.bounty.toLocaleString()} $</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('description')} className={`pb-1 text-xs font-bold transition ${activeTab === 'description' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Descripción</button>
                <button onClick={() => setActiveTab('vendor')} className={`pb-1 text-xs font-bold transition ${activeTab === 'vendor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Dueño Original</button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeTab === 'description' ? selectedItem.description : `Este artículo fue puesto en venta por el coleccionista: ${selectedItem.owner_name}.`}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => handleBuyItem(selectedItem)}
                disabled={selectedItem.stock <= 0}
                className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl transition text-xs"
              >
                {selectedItem.stock > 0 ? 'Buy Now (Comprar con 50% si es 1ra vez)' : 'Agotado'}
              </button>
            </div>
          </div>
        )}

        {/* VISTA PROFILE */}
        {view === 'PROFILE' && (
          <div className="space-y-6 text-center">
            <h2 className="text-base font-bold text-slate-800">Mi Perfil</h2>
            {!user ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-4 mt-10">
                <div className="text-4xl">🔒</div>
                <h3 className="font-bold text-sm text-slate-800">No has iniciado sesión</h3>
                <p className="text-xs text-slate-500">Inicia sesión para ver tu balance.</p>
                <button onClick={() => setView('AUTH')} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-lg">Iniciar Sesión</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                  <p className="text-xs text-slate-400">Código: {user.code} | Rol: {user.role}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 text-left shadow-sm">
                  <div className="flex justify-between text-xs py-2 border-b border-slate-100">
                    <span className="text-slate-400">Balance</span>
                    <span className="font-bold text-blue-600">{user.credits.toLocaleString()} $</span>
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