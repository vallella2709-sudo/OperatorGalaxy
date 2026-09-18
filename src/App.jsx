import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import CRTOverlay from './components/CRTOverlay';

export default function App() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'system', text: 'OPERATOR GALAXY // SECURE TERMINAL v4.81' },
    { type: 'system', text: 'CONEXIÓN ESTABLECIDA CON SUPABASE MAINFRAME.' },
    { type: 'info', text: 'Escribe "help" para ver los comandos disponibles o "contracts" para listar misiones.' },
    { type: 'spacer', text: '' }
  ]);
  const [theme, setTheme] = useState('emerald'); // emerald (verde) o amber (ámbar)
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al final de la terminal
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Mantener el foco en el input al hacer clic en cualquier parte de la pantalla
  const handleScreenClick = () => {
    inputRef.current?.focus();
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Agregar comando ingresado al historial
    const newHistory = [...history, { type: 'input', text: `> ${trimmedInput}` }];
    setHistory(newHistory);
    setInput('');

    const args = trimmedInput.split(' ');
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          { type: 'system', text: 'COMANDOS DISPONIBLES:' },
          { type: 'output', text: '  help              - Muestra esta lista de ayuda' },
          { type: 'output', text: '  clear             - Limpia la pantalla de la terminal' },
          { type: 'output', text: '  contracts         - Lista los contratos activos desde Supabase' },
          { type: 'output', text: '  missions          - Alias de contracts' },
          { type: 'output', text: '  accept [ID]       - Cambia el estado de un contrato a en curso' },
          { type: 'output', text: '  hack [ID]         - Completa un contrato introduciendo el código de hackeo' },
          { type: 'output', text: '  theme [emerald/amber] - Cambia el color del fósforo de la CRT' },
          { type: 'output', text: '  magicword         - Ah ah ah, you didn\'t say the magic word...' },
        ]);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'theme':
        if (args[1] === 'amber' || args[1] === 'emerald') {
          setTheme(args[1]);
          setHistory([...newHistory, { type: 'system', text: `[OK] Color de fósforo cambiado a: ${args[1]}` }]);
        } else {
          setHistory([...newHistory, { type: 'error', text: '[ERROR] Temas válidos: theme emerald | theme amber' }]);
        }
        break;

      case 'magicword':
        setHistory([
          ...newHistory,
          { type: 'error', text: 'ACCESS DENIED. AH AH AH! YOU DIDN’T SAY THE MAGIC WORD!' },
          { type: 'system', text: '🦕 [SECURITY PROTOCOL TRIGGERED: Dennis Nedry memory leak]' }
        ]);
        break;

      case 'contracts':
      case 'missions':
        try {
          setHistory([...newHistory, { type: 'system', text: 'CONSULTANDO BASE DE DATOS DE SUPABASE...' }]);
          const { data, error } = await supabase.from('contracts').select('*');

          if (error) throw error;

          if (!data || data.length === 0) {
            setHistory(prev => [...prev, { type: 'warning', text: 'No hay contratos activos en este sector.' }]);
          } else {
            const contractList = data.map(c => 
              `[ID: ${c.id.slice(0, 8)}...] | Misión: ${c.title} | Objetivo: ${c.target} | Recompensa: ${c.bounty} | Estado: [${c.status}]`
            );
            setHistory(prev => [
              ...prev, 
              { type: 'system', text: `=== REGISTROS DE CONTRATOS (${data.length}) ===` },
              ...contractList.map(item => ({ type: 'output', text: item })),
              { type: 'info', text: 'Usa "hack [ID_parcial]" para completar una misión.' }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[DB ERROR]: ${err.message}` }]);
        }
        break;

      case 'hack':
        const targetIdQuery = args[1];
        if (!targetIdQuery) {
          setHistory(prev => [...prev, { type: 'error', text: '[ERROR] Debes especificar el ID o parte del ID del contrato. Ej: hack a1b2c3' }]);
          break;
        }

        try {
          // Buscamos contratos que coincidan parcialmente con el ID proporcionado
          setHistory(prev => [...prev, { type: 'system', text: 'Buscando coincidencia de nodo y ejecutando exploit...' }]);
          const { data, error } = await supabase.from('contracts').select('*');
          
          if (error) throw error;

          const match = data.find(c => c.id.startsWith(targetIdQuery));

          if (!match) {
            setHistory(prev => [...prev, { type: 'error', text: `[ERROR] No se encontró ningún contrato con el identificador "${targetIdQuery}".` }]);
          } else {
            // Actualizamos en Supabase a COMPLETED
            const { error: updateError } = await supabase
              .from('contracts')
              .update({ status: 'COMPLETED' })
              .eq('id', match.id);

            if (updateError) throw updateError;

            setHistory(prev => [
              ...prev,
              { type: 'system', text: '>>> EXPLOIT EXITOSO. ACCESO ROOT CONCEDIDO <<<' },
              { type: 'output', text: `✔ Contrato "${match.title}" marcado como COMPLETADO en Supabase.` },
              { type: 'output', text: `💰 Transferencia de ${match.bounty} asegurada en billetera cifrada.` }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[EXPLOIT FAIL]: ${err.message}` }]);
        }
        break;

      default:
        setHistory([
          ...newHistory,
          { type: 'error', text: `[ERROR]: Comando desconocido "${trimmedInput}". Escribe "help" para asistencia.` }
        ]);
        break;
    }
  };

  // Clases dinámicas según el tema seleccionado
  const themeClasses = theme === 'amber' 
    ? 'text-amber-500 terminal-glow-amber border-amber-500/30' 
    : 'text-emerald-400 terminal-glow border-emerald-500/30';

  return (
    <div 
      onClick={handleScreenClick}
      className={`relative h-screen w-screen bg-gray-950 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none ${themeClasses}`}
    >
      <CRTOverlay />

      {/* Cabecera de la Terminal */}
      <header className="border-b border-current pb-2 mb-4 flex justify-between items-center text-xs tracking-widest opacity-80">
        <div>SYS_ID: OP-GALAXY-99 // SECURE_SOCKET</div>
        <div>THEME: {theme.toUpperCase()}</div>
        <div>STATUS: ONLINE [SUPABASE LINKED]</div>
      </header>

      {/* Ventana de Historial de Comandos */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none font-mono text-sm md:text-base">
        {history.map((item, index) => {
          let colorClass = 'text-current';
          if (item.type === 'error') colorClass = 'text-red-500 font-bold';
          if (item.type === 'warning') colorClass = 'text-yellow-400';
          if (item.type === 'info') colorClass = 'opacity-70 italic';
          if (item.type === 'system') colorClass = 'font-bold opacity-90';

          return (
            <div key={index} className={`${colorClass} whitespace-pre-wrap`}>
              {item.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Línea de Entrada de Comandos */}
      <form onSubmit={handleCommand} className="mt-4 flex items-center gap-2 border-t border-current pt-3 bg-gray-950/80">
        <span className="font-bold">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck="false"
          autoComplete="off"
          className="bg-transparent border-none outline-none flex-1 font-mono text-current text-sm md:text-base tracking-wider"
        />
        <span className="animate-blink font-bold">█</span>
      </form>
    </div>
  );
}