import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import CRTOverlay from './components/CRTOverlay';

export default function App() {
  const [step, setStep] = useState('LOGIN_NAME'); // LOGIN_NAME, LOGIN_ID, TERMINAL, ADMIN
  const [operator, setOperator] = useState({ name: '', id: '', credits: 1000 });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('emerald');
  const [activeMission, setActiveMission] = useState(null);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
    }, 30);
  };

  useEffect(() => {
    if (step === 'TERMINAL') {
      typeText([
        { type: 'system', text: `ACCESO AUTORIZADO. AGENTE: ${operator.name.toUpperCase()} [ID: ${operator.id}]` },
        { type: 'info', text: `BILLETERA CIFRADA: ${operator.credits} UCREDS` },
        { type: 'info', text: 'Escribe "help" para ver los comandos tácticos o "contracts" para misiones.' }
      ]);
    }
  }, [step]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleScreenClick = () => {
    inputRef.current?.focus();
  };

  // Función para autenticar o registrar al operador en Supabase
  const handleLoginProcess = async (nameInput, idInput) => {
    try {
      // Buscar si el agente ya existe por su agent_id
      let { data: existingAgent, error } = await supabase
        .from('operators')
        .select('*')
        .eq('agent_id', idInput)
        .maybeSingle();

      if (existingAgent) {
        // Agente existente: Cargamos sus datos de Supabase
        setOperator({
          name: existingAgent.name,
          id: existingAgent.agent_id,
          credits: existingAgent.credits
        });
        setHistory(prev => [
          ...prev, 
          { type: 'input', text: `> ${idInput}` },
          { type: 'system', text: `[DB] Identificación reconocida. Bienvenido de vuelta, Agente ${existingAgent.name}.` }
        ]);
      } else {
        // Agente nuevo: Lo creamos en Supabase
        const newAgentData = {
          agent_id: idInput,
          name: nameInput,
          credits: 1000 // Bono inicial de recluta
        };

        const { error: insertError } = await supabase
          .from('operators')
          .insert([newAgentData]);

        if (insertError) throw insertError;

        setOperator({
          name: nameInput,
          id: idInput,
          credits: 1000
        });

        setHistory(prev => [
          ...prev, 
          { type: 'input', text: `> ${idInput}` },
          { type: 'system', text: `[DB] Nuevo perfil biométrico registrado. Bono de inicio asignado: 1000 UCREDS.` }
        ]);
      }

      setStep('TERMINAL');
    } catch (err) {
      setHistory(prev => [
        ...prev, 
        { type: 'error', text: `[AUTH ERROR]: ${err.message}` }
      ]);
      setStep('LOGIN_NAME');
      setOperator({ name: '', id: '', credits: 1000 });
    }
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

    // Flujo de Login
    if (step === 'LOGIN_NAME') {
      setOperator(prev => ({ ...prev, name: trimmedInput }));
      setStep('LOGIN_ID');
      setHistory([...newHistory, { type: 'system', text: `NOMBRE TÁCTICO: ${trimmedInput}. INTRODUZCA SU CÓDIGO ID SECRETO:` }]);
      return;
    }

    if (step === 'LOGIN_ID') {
      await handleLoginProcess(operator.name, trimmedInput);
      return;
    }

    // Modo Administrador
    if (step === 'ADMIN') {
      if (cmd === 'exit') {
        setStep('TERMINAL');
        setHistory([...newHistory, { type: 'system', text: '[OK] Saliendo del panel de Administrador.' }]);
        return;
      }
      if (cmd === 'list') {
        const { data } = await supabase.from('contracts').select('*');
        setHistory([...newHistory, { type: 'system', text: '--- GESTIÓN GLOBAL DE CONTRATOS ---' }, ...data.map(c => ({ type: 'output', text: `[ID: ${c.id}] | ${c.title} | ${c.bounty} | Status: ${c.status}` }))]);
        return;
      }
      if (cmd === 'create') {
        const parts = trimmedInput.replace('create ', '').split('|').map(p => p.trim());
        if (parts.length < 3) {
          setHistory([...newHistory, { type: 'error', text: 'Uso: create [Titulo] | [Target] | [Bounty]' }]);
          return;
        }
        await supabase.from('contracts').insert([{ title: parts[0], target: parts[1], bounty: parts[2], status: 'PENDING' }]);
        setHistory([...newHistory, { type: 'system', text: '✔ Contrato creado en red.' }]);
        return;
      }
      if (cmd === 'delete') {
        await supabase.from('contracts').delete().eq('id', args[1]);
        setHistory([...newHistory, { type: 'system', text: `✔ Contrato ${args[1]} eliminado.` }]);
        return;
      }
      setHistory([...newHistory, { type: 'error', text: 'Comando desconocido. Usa: list, create, delete [id], exit' }]);
      return;
    }

    // Comandos de Terminal
    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          { type: 'system', text: 'COMANDOS DISPONIBLES:' },
          { type: 'output', text: '  contracts          - Lista contratos disponibles en la red' },
          { type: 'output', text: '  accept [ID]        - Acepta un contrato bajo tu ID de agente' },
          { type: 'output', text: '  hack [ID]          - Completa el contrato y cobra créditos' },
          { type: 'output', text: '  profile            - Muestra tu estatus y balance de créditos' },
          { type: 'output', text: '  admin              - Panel de control de contratos' },
          { type: 'output', text: '  theme [amber/emerald] - Cambia el color del fósforo CRT' },
          { type: 'output', text: '  clear              - Limpia la pantalla' },
        ]);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'profile':
        // Recargar créditos actualizados de Supabase
        const { data: agData } = await supabase.from('operators').select('*').eq('agent_id', operator.id).single();
        if (agData) setOperator(prev => ({ ...prev, credits: agData.credits }));
        
        setHistory([
          ...newHistory,
          { type: 'system', text: `=== PERFIL DE OPERADOR ===` },
          { type: 'output', text: `Nombre: ${operator.name}` },
          { type: 'output', text: `ID Secreto: ${operator.id}` },
          { type: 'output', text: `Créditos Disponibles: ${agData ? agData.credits : operator.credits} UCREDS` }
        ]);
        break;

      case 'theme':
        if (args[1] === 'amber' || args[1] === 'emerald') {
          setTheme(args[1]);
          setHistory([...newHistory, { type: 'system', text: `[OK] Tema cambiado a: ${args[1]}` }]);
        } else {
          setHistory([...newHistory, { type: 'error', text: '[ERROR] Temas válidos: theme emerald | theme amber' }]);
        }
        break;

      case 'admin':
        setStep('ADMIN');
        setHistory([
          ...newHistory, 
          { type: 'error', text: '⚠️ [SECURITY OVERRIDE] PANEL SYSADMIN ACTIVADO.' },
          { type: 'system', text: 'Comandos: list | create [T] | [Target] | [Bounty] | delete [ID] | exit' }
        ]);
        break;

      case 'contracts':
      case 'missions':
        try {
          const { data, error } = await supabase.from('contracts').select('*');
          if (error) throw error;

          if (!data || data.length === 0) {
            setHistory(prev => [...prev, { type: 'warning', text: 'No hay contratos en la red.' }]);
          } else {
            const list = data.map(c => 
              `[ID: ${c.id.slice(0, 8)}] | Misión: ${c.title} | Objetivo: ${c.target} | Recompensa: ${c.bounty} | Estado: [${c.status}] | Agente: ${c.assigned_operator_id || 'LIBRE'}`
            );
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `=== RED DE CONTRATOS (${data.length}) ===` },
              ...list.map(i => ({ type: 'output', text: i })),
              { type: 'info', text: 'Usa "accept [ID_parcial]" para asegurar tu misión.' }
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
            await supabase.from('contracts').update({ 
              status: 'IN_PROGRESS', 
              assigned_operator_id: operator.id,
              agent_name: operator.name
            }).eq('id', match.id);

            setActiveMission(match);
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `>>> CONTRATO ASIGNADO A TI: ${match.title} <<<` },
              { type: 'output', text: `💻 Usa "hack ${accQuery}" para ejecutar el exploit y finalizar la misión.` }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[ERROR]: ${err.message}` }]);
        }
        break;

      case 'hack':
        const hackQuery = args[1];
        if (!hackQuery) {
          setHistory(prev => [...prev, { type: 'error', text: '[ERROR] Especifica el ID del contrato a hackear.' }]);
          break;
        }
        try {
          const { data } = await supabase.from('contracts').select('*');
          const match = data.find(c => c.id.startsWith(hackQuery));

          if (!match) {
            setHistory(prev => [...prev, { type: 'error', text: 'Nodo no encontrado.' }]);
          } else {
            // Extraer valor numérico del bounty para sumarlo a los créditos del operador (ej: "50,000 UCREDS" -> 50000)
            const bountyNum = parseInt(match.bounty.replace(/[^0-9]/g, '')) || 5000;
            const newCredits = operator.credits + bountyNum;

            // Actualizar contrato a COMPLETED
            await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', match.id);

            // Actualizar créditos del operador en Supabase
            await supabase.from('operators').update({ credits: newCredits }).eq('agent_id', operator.id);

            setOperator(prev => ({ ...prev, credits: newCredits }));
            setActiveMission(null);

            setHistory(prev => [
              ...prev,
              { type: 'system', text: '⚡ [EXPLOIT COMPLETADO EXITOSAMENTE] ⚡' },
              { type: 'output', text: `✔ Misión "${match.title}" finalizada.` },
              { type: 'output', text: `💰 Transferencia de ${match.bounty} acreditada a tu cuenta. Saldo total: ${newCredits} UCREDS.` }
            ]);
          }
        } catch (err) {
          setHistory(prev => [...prev, { type: 'error', text: `[FAIL]: ${err.message}` }]);
        }
        break;

      default:
        setHistory([
          ...newHistory,
          { type: 'error', text: `[ERROR]: Comando desconocido "${trimmedInput}".` }
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

      <header className="border-b border-current pb-2 mb-4 flex justify-between items-center text-xs tracking-widest opacity-80">
        <div>AGENT: {operator.name ? operator.name.toUpperCase() : 'AUTH_PENDING'} [ID: {operator.id || '----'}]</div>
        <div>CREDITS: {operator.credits} UCREDS</div>
        <div>THEME: {theme.toUpperCase()}</div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none font-mono text-sm md:text-base">
        {step === 'LOGIN_NAME' && (
          <div className="text-current font-bold animate-pulse">
            &gt; ACCESO AL SISTEMA CENTRAL // INTRODUZCA SU NOMBRE TÁCTICO:
          </div>
        )}
        {step === 'LOGIN_ID' && (
          <div className="text-current font-bold animate-pulse">
            &gt; INTRODUZCA SU CÓDIGO DE IDENTIFICACIÓN (ID SECRETO):
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