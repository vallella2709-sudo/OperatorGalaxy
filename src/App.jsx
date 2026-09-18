import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import CRTOverlay from './components/CRTOverlay';

export default function App() {
  const [step, setStep] = useState('LOGIN'); // LOGIN, TERMINAL, ADMIN
  const [operator, setOperator] = useState({ name: '', id: '' });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('emerald');
  const [activeMission, setActiveMission] = useState(null);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Efecto de máquina de escribir para simular salida de texto de terminal real
  const typeText = (textList, callback) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < textList.length) {
        setHistory(prev => [...prev, textList[index]]);
        index++;
      } else {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 35); // Velocidad de escritura en ms
  };

  useEffect(() => {
    if (step === 'TERMINAL') {
      typeText([
        { type: 'system', text: `BIENVENIDO AL MAINFRAME, OPERADOR: ${operator.name.toUpperCase()} [ID: ${operator.id}]` },
        { type: 'info', text: 'Escribe "help" para ver los comandos tácticos o "contracts" para misiones disponibles.' }
      ]);
    }
  }, [step]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleScreenClick = () => {
    inputRef.current?.focus();
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const newHistory = [...history, { type: 'input', text: `> ${trimmedInput}` }];
    setHistory(newHistory);
    setInput('');

    const args = trimmedInput.split(' ');
    const cmd = args[0].toLowerCase();

    // Flujo de Login inicial
    if (step === 'LOGIN') {
      if (!operator.name) {
        setOperator(prev => ({ ...prev, name: trimmedInput }));
        setHistory([...newHistory, { type: 'system', text: `OPERADOR REGISTRADO: ${trimmedInput}. INTRODUZCA CÓDIGO DE IDENTIFICACIÓN (ID):` }]);
        return;
      }
      if (!operator.id) {
        setOperator(prev => ({ ...prev, id: trimmedInput }));
        setStep('TERMINAL');
        return;
      }
    }

    // Modo Administrador
    if (step === 'ADMIN') {
      if (cmd === 'exit') {
        setStep('TERMINAL');
        setHistory([...newHistory, { type: 'system', text: '[OK] Saliendo del modo Administrador del Sistema.' }]);
        return;
      }
      if (cmd === 'list') {
        const { data } = await supabase.from('contracts').select('*');
        setHistory([...newHistory, { type: 'system', text: '--- BASE DE DATOS GLOBAL (ADMIN VIEW) ---' }, ...data.map(c => ({ type: 'output', text: `[ID: ${c.id}] | ${c.title} | Bounty: ${c.bounty} | Status: ${c.status}` }))]);
        return;
      }
      if (cmd === 'create') {
        // Formato: create [Titulo] | [Target] | [Bounty]
        const parts = trimmedInput.replace('create ', '').split('|').map(p => p.trim());
        if (parts.length < 3) {
          setHistory([...newHistory, { type: 'error', text: 'Uso incorrecto. Formato: create [Titulo] | [Target] | [Bounty]' }]);
          return;
        }
        await supabase.from('contracts').insert([{ title: parts[0], target: parts[1], bounty: parts[2], status: 'PENDING' }]);
        setHistory([...newHistory, { type: 'system', text: '✔ Contrato inyectado exitosamente en el servidor central.' }]);
        return;
      }
      if (cmd === 'delete') {
        const idDel = args[1];
        await supabase.from('contracts').delete().eq('id', idDel);
        setHistory([...newHistory, { type: 'system', text: `✔ Contrato ${idDel} eliminado del sistema.` }]);
        return;
      }
      setHistory([...newHistory, { type: 'error', text: 'Comando admin desconocido. Usa: list, create, delete [id], exit' }]);
      return;
    }

    // Comandos de la Terminal Principal
    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          { type: 'system', text: 'COMANDOS TÁCTICOS DISPONIBLES:' },
          { type: 'output', text: '  contracts          - Lista contratos y misiones activas con tiempo límite' },
          { type: 'output', text: '  accept [ID]        - Acepta y asegura un contrato bajo tu nombre' },
          { type: 'output', text: '  hack [ID]          - Completa el contrato activo introduciendo el exploit' },
          { type: 'output', text: '  admin              - Acceso al panel de control de contratos (SysAdmin)' },
          { type: 'output', text: '  theme [emerald/amber] - Cambia la fósforo-optica de la CRT' },
          { type: 'output', text: '  clear              - Limpia la pantalla' },
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

      case 'admin':
        setStep('ADMIN');
        setHistory([
          ...newHistory, 
          { type: 'error', text: '⚠️ [SECURITY OVERRIDE] ACCESO CONCEDIDO A PANEL DE ADMINISTRACIÓN.' },
          { type: 'system', text: 'Comandos Admin: list | create [T] | [Target] | [Bounty] | delete [ID] | exit' }
        ]);
        break;

      case 'contracts':
      case 'missions':
        try {
          const { data, error } = await supabase.from('contracts').select('*');
          if (error) throw error;

          if (!data || data.length === 0) {
            setHistory(prev => [...prev, { type: 'warning', text: 'No hay contratos activos en este sector.' }]);
          } else {
            const list = data.map(c => {
              const timeLeft = c.expires_at ? new Date(c.expires_at).toLocaleTimeString() : 'N/A';
              return `[ID: ${c.id.slice(0, 8)}] | Misión: ${c.title} | Objetivo: ${c.target} | Recompensa: ${c.bounty} | Estado: [${c.status}] | Expira: ${timeLeft} | Asignado: ${c.agent_name || 'LIBRE'}`;
            });
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `=== RED DE CONTRATOS DISPONIBLES (${data.length}) ===` },
              ...list.map(i => ({ type: 'output', text: i })),
              { type: 'info', text: 'Usa "accept [ID_parcial]" para tomar una misión.' }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[DB ERROR]: ${err.message}` }]);
        }
        break;

      case 'accept':
        const accQuery = args[1];
        if (!accQuery) {
          setHistory(prev => [...prev, { type: 'error', text: '[ERROR] Especifica el ID del contrato. Ej: accept 62ebde22' }]);
          break;
        }
        try {
          const { data } = await supabase.from('contracts').select('*');
          const match = data.find(c => c.id.startsWith(accQuery));

          if (!match) {
            setHistory(prev => [...prev, { type: 'error', text: 'Contrato no encontrado.' }]);
          } else {
            // Actualizamos en Supabase asignándolo al operador actual
            await supabase.from('contracts').update({ 
              status: 'IN_PROGRESS', 
              agent_name: operator.name 
            }).eq('id', match.id);

            setActiveMission(match);
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `>>> MISIÓN ASEGURADA: ${match.title} <<<` },
              { type: 'output', text: `🔒 Objetivo fijado: ${match.target}. El tiempo límite ha comenzado.` },
              { type: 'output', text: `💻 Terminal reconfigurada para infiltración. Usa "hack ${accQuery}" para ejecutar el exploit final.` }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[ERROR]: ${err.message}` }]);
        }
        break;

      case 'hack':
        const hackQuery = args[1];
        if (!hackQuery) {
          setHistory(prev => [...prev, { type: 'error', text: '[ERROR] Especifica el ID para completar el hackeo.' }]);
          break;
        }
        try {
          const { data } = await supabase.from('contracts').select('*');
          const match = data.find(c => c.id.startsWith(hackQuery));

          if (!match) {
            setHistory(prev => [...prev, { type: 'error', text: 'Nodo no encontrado.' }]);
          } else {
            await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', match.id);
            setActiveMission(null);
            setHistory(prev => [
              ...prev,
              { type: 'system', text: '⚡ [EXPLOIT COMPLETADO CON ÉXITO] ⚡' },
              { type: 'output', text: `✔ Misión "${match.title}" cumplida por el agente ${operator.name}.` },
              { type: 'output', text: `💰 Recompensa de ${match.bounty} transferida a tu cuenta segura.` }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[FAIL]: ${err.message}` }]);
        }
        break;

      default:
        setHistory([
          ...newHistory,
          { type: 'error', text: `[ERROR]: Comando "${trimmedInput}" no reconocido. Escribe "help".` }
        ]);
        break;
    }
  };

  const themeClasses = theme === 'amber' 
    ? 'text-amber-500 terminal-glow-amber border-amber-500/30' 
    : 'text-emerald-400 terminal-glow border-emerald-500/30';

  return (
    <div 
      onClick={handleScreenClick}
      className={`relative h-screen w-screen bg-gray-950 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none ${themeClasses}`}
    >
      <CRTOverlay />

      {/* Cabecera Táctica */}
      <header className="border-b border-current pb-2 mb-4 flex justify-between items-center text-xs tracking-widest opacity-80">
        <div>OP_NAME: {operator.name ? operator.name.toUpperCase() : 'ANON'} [ID: {operator.id || '----'}]</div>
        <div>MODE: {step} {activeMission ? `| TARGET: ${activeMission.target}` : ''}</div>
        <div>THEME: {theme.toUpperCase()}</div>
      </header>

      {/* Pantalla / Historial de Terminal */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none font-mono text-sm md:text-base">
        {step === 'LOGIN' && !operator.name && (
          <div className="text-current font-bold animate-pulse">
            &gt; INTRODUZCA NOMBRE DE OPERADOR:
          </div>
        )}
        {step === 'LOGIN' && operator.name && !operator.id && (
          <div className="text-current font-bold animate-pulse">
            &gt; INTRODUZCA CÓDIGO DE IDENTIFICACIÓN (ID SECRETO):
          </div>
        )}

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

      {/* Input de Comandos */}
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