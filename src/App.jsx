import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import CRTOverlay from './components/CRTOverlay';

// Generador de ID aleatorio estilo "00A1"
const generateAgentId = () => {
  const chars = '0123456789ABCDEF';
  let id = '';
  for (let i = 0; i < 2; i++) id += Math.floor(Math.random() * 10);
  for (let i = 0; i < 2; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export default function App() {
  const [step, setStep] = useState('LOGIN_CHOICE'); // LOGIN_CHOICE, REGISTER_NAME, LOGIN_INPUT, TERMINAL, ADMIN, MINESWEEPER
  const [operator, setOperator] = useState({ name: '', id: '', credits: 1000 });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('emerald');
  const [activeMission, setActiveMission] = useState(null);
  
  // Estados para el minijuego de Buscaminas Táctico (Infiltración de Agentes)
  const [minesweeperData, setMinesweeperData] = useState({ targetAgent: null, contract: null });

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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

    // 1. FLUJO DE AUTENTICACIÓN
    if (step === 'LOGIN_CHOICE') {
      if (trimmedInput === '1') {
        setStep('REGISTER_NAME');
        setHistory([...newHistory, { type: 'system', text: 'INICIANDO PROTOCOLO DE RECLUTA // INTRODUZCA SU NOMBRE TÁCTICO:' }]);
      } else if (trimmedInput === '2') {
        setStep('LOGIN_INPUT');
        setHistory([...newHistory, { type: 'system', text: 'INTRODUZCA SU CÓDIGO ID DE ACCESO (Ej: 00A1):' }]);
      } else {
        setHistory([...newHistory, { type: 'error', text: 'Opción inválida. Escribe 1 para registrarse o 2 para ingresar.' }]);
      }
      return;
    }

    if (step === 'REGISTER_NAME') {
      if (!trimmedInput) return;
      const generatedId = generateAgentId();
      const hideout = Math.floor(Math.random() * 9); // Posición secreta 0-8 para el buscaminas

      try {
        await supabase.from('operators').insert([{
          agent_id: generatedId,
          name: trimmedInput,
          credits: 1000,
          status: 'ACTIVE',
          hideout_pos: hideout
        }]);

        setOperator({ name: trimmedInput, id: generatedId, credits: 1000 });
        setStep('TERMINAL');
        setHistory([
          ...newHistory,
          { type: 'system', text: `[REGISTRO ÉXITO] BIENVENIDO, OPERADOR ${trimmedInput.toUpperCase()}` },
          { type: 'error', text: `⚠️ GUARDE SU ID SECRETO: [ ${generatedId} ] LO NECESITARÁ PARA ENTRAR.` },
          { type: 'info', text: 'Escribe "help" para ver los comandos del sistema.' }
        ]);
      } catch (err) {
        setHistory([...newHistory, { type: 'error', text: `[ERROR REGISTRO]: ${err.message}` }]);
      }
      return;
    }

    if (step === 'LOGIN_INPUT') {
      // Acceso Maestro de Admin
      if (trimmedInput === '0000') {
        setOperator({ name: 'ADMIN_ROOT', id: '0000', credits: 999999 });
        setStep('ADMIN');
        setHistory([
          ...newHistory,
          { type: 'error', text: '⚠️ [ROOT OVERRIDE] ACCESO CONCEDIDO A PANEL DE CONTROL MAESTRO.' },
          { type: 'system', text: 'COMANDOS ADMIN:\n  admin list-contracts\n  admin create-contract\n  admin agents (para desclasificar agentes)\n  exit' }
        ]);
        return;
      }

      // Login de Agente Normal
      try {
        const { data, error } = await supabase
          .from('operators')
          .select('*')
          .eq('agent_id', trimmedInput)
          .maybeSingle();

        if (error || !data) {
          setHistory([...newHistory, { type: 'error', text: '[ACCESO DENEGADO] ID no reconocido en el mainframe.' }]);
          setStep('LOGIN_CHOICE');
          return;
        }

        if (data.status === 'ELIMINATED') {
          setHistory([...newHistory, { type: 'error', text: '[TERMINATED] Este ID pertenece a un agente desclasificado y exterminado. Acceso bloqueado.' }]);
          return;
        }

        setOperator({ name: data.name, id: data.agent_id, credits: data.credits });
        setStep('TERMINAL');
        setHistory([
          ...newHistory,
          { type: 'system', text: `CONEXIÓN SEGURA RESTAURADA. AGENTE: ${data.name.toUpperCase()} [ID: ${data.agent_id}]` },
          { type: 'output', text: `Billetera: ${data.credits} UCREDS` },
          { type: 'info', text: 'Escribe "help" para ver las operaciones tácticas.' }
        ]);
      } catch (err) {
        setHistory([...newHistory, { type: 'error', text: `[DB ERROR]: ${err.message}` }]);
      }
      return;
    }

    // 2. MODO ADMINISTRADOR (SYSADMIN)
    if (step === 'ADMIN') {
      if (trimmedInput === 'exit') {
        setStep('TERMINAL');
        setHistory([...newHistory, { type: 'system', text: '[OK] Saliendo del panel maestro.' }]);
        return;
      }
      if (trimmedInput === 'admin list-contracts') {
        const { data } = await supabase.from('contracts').select('*');
        setHistory([...newHistory, { type: 'system', text: '--- LISTA DE CONTRATOS ACTIVOS ---' }, ...data.map(c => ({ type: 'output', text: `[ID: ${c.id.slice(0, 8)}] | Título: ${c.title} | Bounty: ${c.bounty} | Estado: ${c.status}` }))]);
        return;
      }
      if (trimmedInput === 'admin agents') {
        const { data } = await supabase.from('operators').select('*').eq('status', 'ACTIVE');
        setHistory([...newHistory, { type: 'system', text: '--- AGENTES ACTIVOS EN LA RED ---' }, ...data.map(a => ({ type: 'output', text: `[AGENTE ID: ${a.agent_id}] | Nombre: ${a.name} | Créditos: ${a.credits} | Para desclasificar usa: bounty [ID] [Monto]` }))]);
        return;
      }
      if (cmd === 'bounty') {
        // Comando: bounty [agent_id] [monto]
        const targetId = args[1];
        const bountyAmount = args[2];
        if (!targetId || !bountyAmount) {
          setHistory([...newHistory, { type: 'error', text: 'Uso: bounty [AGENTE_ID] [MONTO] (Ej: bounty 12AB 150000)' }]);
          return;
        }
        const { data: targetAgent } = await supabase.from('operators').select('*').eq('agent_id', targetId).maybeSingle();
        if (!targetAgent) {
          setHistory([...newHistory, { type: 'error', text: 'Agente no encontrado.' }]);
          return;
        }

        // Crear contrato de desclasificación automático en Supabase
        await supabase.from('contracts').insert([{
          title: `DESCLASIFICAR Y EXTERMINAR: Agente ${targetAgent.name}`,
          target: `Ubicación cifrada de ${targetAgent.name}`,
          bounty: `${bountyAmount} UCREDS`,
          status: 'PENDING',
          is_agent_bounty: true,
          target_agent_id: targetAgent.agent_id
        }]);

        setHistory([...newHistory, { type: 'system', text: `✔ Contrato de desclasificación publicado para el agente ${targetAgent.name} [ID: ${targetId}] con recompensa de ${bountyAmount} UCREDS.` }]);
        return;
      }
      setHistory([...newHistory, { type: 'error', text: 'Comando admin desconocido. Usa: admin list-contracts, admin agents, bounty [ID] [Monto], exit' }]);
      return;
    }

    // 3. MODO BUSCAMINAS TÁCTICO (INFILTRACIÓN PARA EXTERMINIO)
    if (step === 'MINESWEEPER') {
      const chosenCell = parseInt(trimmedInput);
      if (isNaN(chosenCell) || chosenCell < 0 || chosenCell > 8) {
        setHistory([...newHistory, { type: 'error', text: '[ERROR] Selecciona una coordenada válida del sector (0 al 8).' }]);
        return;
      }

      const targetAgentId = minesweeperData.targetAgent;
      const { data: targetData } = await supabase.from('operators').select('*').eq('agent_id', targetAgentId).single();

      if (!targetData) {
        setHistory([...newHistory, { type: 'error', text: 'El objetivo ya no existe en el sistema.' }]);
        setStep('TERMINAL');
        return;
      }

      if (chosenCell === targetData.hideout_pos) {
        // ¡EXACTO! Encontró al agente y lo elimina de Supabase
        await supabase.from('operators').update({ status: 'ELIMINATED' }).eq('agent_id', targetAgentId);
        await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', minesweeperData.contract.id);

        // Pagar recompensa al operador actual
        const rewardNum = parseInt(minesweeperData.contract.bounty.replace(/[^0-9]/g, '')) || 50000;
        const newCreds = operator.credits + rewardNum;
        await supabase.from('operators').update({ credits: newCreds }).eq('agent_id', operator.id);
        setOperator(prev => ({ ...prev, credits: newCreds }));

        setStep('TERMINAL');
        setHistory([
          ...newHistory,
          { type: 'system', text: '🎯 [INFILTRACIÓN EXITOSA: BLANCO ELIMINADO] 🎯' },
          { type: 'output', text: `💥 Has rastreado al agente ${targetData.name} [ID: ${targetData.agent_id}] en el sector [${chosenCell}].` },
          { type: 'output', text: `🚨 AGENTE ${targetData.name.toUpperCase()} [ID: ${targetData.agent_id}] DESCLASIFICADO Y EXTERMINADO.` },
          { type: 'output', text: `💰 Recompensa de ${minesweeperData.contract.bounty} transferida a tu cuenta. Saldo: ${newCreds} UCREDS.` }
        ]);
      } else {
        // Falló la casilla
        setHistory([
          ...newHistory,
          { type: 'system', text: `❌ [INFILTRACIÓN FALLIDA] Sector [${chosenCell}] despejado. El objetivo no estaba aquí.` },
          { type: 'output', text: 'El objetivo ha cambiado de posición o alerta máxima activada. Ingresa otra coordenada (0-8) o escribe "abort" para salir:' }
        ]);
        if (trimmedInput.toLowerCase() === 'abort') {
          setStep('TERMINAL');
          setHistory(prev => [...prev, { type: 'system', text: 'Infiltración abortada. Regresando al menú principal.' }]);
        }
      }
      return;
    }

    // 4. TERMINAL PRINCIPAL DE COMANDOS
    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          { type: 'system', text: 'COMANDOS DISPONIBLES:' },
          { type: 'output', text: '  contracts         - Muestra contratos y misiones de desclasificación' },
          { type: 'output', text: '  accept [ID]       - Acepta un contrato o misión de caza' },
          { type: 'output', text: '  status [ID]       - Revisa el estatus detallado de un contrato' },
          { type: 'output', text: '  profile           - Revisa tu balance y credenciales' },
          { type: 'output', text: '  theme [amber/emerald] - Cambia el fósforo CRT' },
          { type: 'output', text: '  clear             - Limpia la pantalla' },
        ]);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'profile':
        setHistory([
          ...newHistory,
          { type: 'system', text: `=== PERFIL TÁCTICO ===` },
          { type: 'output', text: `Nombre: ${operator.name}` },
          { type: 'output', text: `ID Secreto: ${operator.id} (¡Guárdalo!)` },
          { type: 'output', text: `Créditos: ${operator.credits} UCREDS` }
        ]);
        break;

      case 'status':
        const stQuery = args[1];
        if (!stQuery) {
          setHistory(prev => [...prev, { type: 'error', text: 'Uso: status [ID_contrato]' }]);
          break;
        }
        const { data: stData } = await supabase.from('contracts').select('*');
        const stMatch = stData.find(c => c.id.startsWith(stQuery));
        if (!stMatch) {
          setHistory(prev => [...prev, { type: 'error', text: 'Contrato no encontrado.' }]);
        } else {
          setHistory(prev => [
            ...prev,
            { type: 'system', text: `=== ESTATUS DE CONTRATO [${stMatch.id.slice(0, 8)}] ===` },
            { type: 'output', text: `Título: ${stMatch.title}` },
            { type: 'output', text: `Objetivo: ${stMatch.target}` },
            { type: 'output', text: `Bounty: ${stMatch.bounty}` },
            { type: 'output', text: `Estado actual: [${stMatch.status}]` },
            { type: 'output', text: `Tipo: ${stMatch.is_agent_bounty ? 'Caza de Agente' : 'Infiltración de Servidor'}` }
          ]);
        }
        break;

      case 'contracts':
      case 'missions':
        const { data: cData } = await supabase.from('contracts').select('*');
        if (!cData || cData.length === 0) {
          setHistory(prev => [...prev, { type: 'warning', text: 'No hay contratos en la red.' }]);
        } else {
          const list = cData.map(c => 
            `[ID: ${c.id.slice(0, 8)}] | Misión: ${c.title} | Bounty: ${c.bounty} | Estado: [${c.status}] ${c.is_agent_bounty ? '🚨 [BOUNTY DE AGENTE]' : ''}`
          );
          setHistory(prev => [
            ...prev,
            { type: 'system', text: `=== RED DE CONTRATOS (${cData.length}) ===` },
            ...list.map(i => ({ type: 'output', text: i })),
            { type: 'info', text: 'Usa "accept [ID_parcial]" para aceptar.' }
          ]);
        }
        break;

      case 'accept':
        const accId = args[1];
        if (!accId) {
          setHistory(prev => [...prev, { type: 'error', text: 'Uso: accept [ID]' }]);
          break;
        }
        const { data: allC } = await supabase.from('contracts').select('*');
        const cMatch = allC.find(c => c.id.startsWith(accId));

        if (!cMatch) {
          setHistory(prev => [...prev, { type: 'error', text: 'Contrato inexistente.' }]);
        } else {
          await supabase.from('contracts').update({ status: 'IN_PROGRESS', assigned_operator_id: operator.id }).eq('id', cMatch.id);

          if (cMatch.is_agent_bounty) {
            // Activar modo Buscaminas Táctico para desclasificar y exterminar al agente
            setStep('MINESWEEPER');
            setMinesweeperData({ targetAgent: cMatch.target_agent_id, contract: cMatch });
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `🚨 [INFILTRACIÓN TÁCTICA ACTIVADA] 🚨` },
              { type: 'output', text: `Has aceptado desclasificar al agente objetivo. El blanco se esconde en un sector de red de 9 nodos (0 al 8).` },
              { type: 'output', text: `Introduce una coordenada numérica del 0 al 8 para rastrear y eliminar al agente:` },
              { type: 'system', text: `[ 0 ] [ 1 ] [ 2 ]\n[ 3 ] [ 4 ] [ 5 ]\n[ 6 ] [ 7 ] [ 8 ]` }
            ]);
          } else {
            // Misión normal de servidor
            setHistory(prev => [
              ...prev,
              { type: 'system', text: `✔ Contrato asegurado: ${cMatch.title}` },
              { type: 'output', text: `Usa "hack ${accId}" para completar el exploit del servidor.` }
            ]);
          }
        }
        break;

      case 'hack':
        const hkId = args[1];
        if (!hkId) {
          setHistory(prev => [...prev, { type: 'error', text: 'Uso: hack [ID]' }]);
          break;
        }
        const { data: hAll } = await supabase.from('contracts').select('*');
        const hMatch = hAll.find(c => c.id.startsWith(hkId));
        if (!hMatch) {
          setHistory(prev => [...prev, { type: 'error', text: 'Contrato no encontrado.' }]);
        } else {
          const val = parseInt(hMatch.bounty.replace(/[^0-9]/g, '')) || 10000;
          const updatedCreds = operator.credits + val;

          await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', hMatch.id);
          await supabase.from('operators').update({ credits: updatedCreds }).eq('agent_id', operator.id);
          setOperator(prev => ({ ...prev, credits: updatedCreds }));

          setHistory(prev => [
            ...prev,
            { type: 'system', text: '⚡ [EXPLOTACIÓN DE SERVIDOR EXITOSA] ⚡' },
            { type: 'output', text: `✔ Misión "${hMatch.title}" completada.` },
            { type: 'output', text: `💰 Recompensa de ${hMatch.bounty} añadida. Saldo: ${updatedCreds} UCREDS.` }
          ]);
        }
        break;

      default:
        setHistory([...newHistory, { type: 'error', text: `[ERROR]: Comando desconocido "${trimmedInput}". Escribe "help".` }]);
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
        <div>AGENT: {operator.name ? operator.name.toUpperCase() : 'AUTH_REQUIRED'} [ID: {operator.id || '----'}]</div>
        <div>CREDITS: {operator.credits} UCREDS</div>
        <div>MODE: {step}</div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none font-mono text-sm md:text-base">
        {step === 'LOGIN_CHOICE' && (
          <div className="space-y-2">
            <div className="font-bold text-current animate-pulse">=== OPERATOR GALAXY SECURE TERMINAL ===</div>
            <div>[1] Registrarse como nuevo Agente (Se te otorgará un ID único automático)</div>
            <div>[2] Iniciar sesión con ID existente</div>
            <div className="opacity-75 pt-2">&gt; Selecciona una opción (1 o 2):</div>
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