import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import CRTOverlay from './components/CRTOverlay';

const generateAgentId = () => {
  const chars = '0123456789ABCDEF';
  let id = '';
  for (let i = 0; i < 2; i++) id += Math.floor(Math.random() * 10);
  for (let i = 0; i < 2; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export default function App() {
  const [step, setStep] = useState('LOGIN_CHOICE'); 
  const [operator, setOperator] = useState({ name: '', id: '', credits: 1000 });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  
  // Estado para la misión activa actual
  const [activeContract, setActiveContract] = useState(null);
  
  // Estados para el Buscaminas 20x20 (Ronan)
  const [ronanTargetCell, setRonanTargetCell] = useState(null);
  const [lockTimer, setLockTimer] = useState(null);

  // Estados para el minijuego de Hackeo de Empresas (Rogue 1, Cybernet, Biotechnology)
  const [hackStage, setHackStage] = useState(0);

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

    // Si estamos en modo misión activa, manejamos la lógica del minijuego correspondiente
    if (activeContract) {
      await handleActiveMissionInput(trimmedInput);
      setInput('');
      return;
    }

    const newHistory = [...history, { type: 'input', text: `> ${trimmedInput}` }];
    setHistory(newHistory);
    setInput('');

    const args = trimmedInput.split(' ');
    const cmd = args[0].toLowerCase();

    // 1. AUTENTICACIÓN
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

      try {
        await supabase.from('operators').insert([{
          agent_id: generatedId,
          name: trimmedInput,
          credits: 1000,
          status: 'ACTIVE'
        }]);

        setOperator({ name: trimmedInput, id: generatedId, credits: 1000 });
        setStep('TERMINAL');
        setHistory([
          ...newHistory,
          { type: 'system', text: `[REGISTRO EXITOSO] BIENVENIDO, OPERADOR ${trimmedInput.toUpperCase()}` },
          { type: 'error', text: `⚠️ GUARDE SU ID SECRETO: [ ${generatedId} ]` },
          { type: 'info', text: 'Escribe "contracts" para ver las misiones disponibles.' }
        ]);
      } catch (err) {
        setHistory([...newHistory, { type: 'error', text: `[ERROR REGISTRO]: ${err.message}` }]);
      }
      return;
    }

    if (step === 'LOGIN_INPUT') {
      try {
        const { data, error } = await supabase
          .from('operators')
          .select('*')
          .eq('agent_id', trimmedInput)
          .maybeSingle();

        if (error || !data) {
          setHistory([...newHistory, { type: 'error', text: '[ACCESO DENEGADO] ID no reconocido.' }]);
          setStep('LOGIN_CHOICE');
          return;
        }

        // Verificar si está temporalmente bloqueado por intento fallido de Ronan
        if (data.lock_until && new Date() < new Date(data.lock_until)) {
          const minutesLeft = Math.ceil((new Date(data.lock_until) - new Date()) / 60000);
          setHistory([...newHistory, { type: 'error', text: `⛔ [TERMINAL BLOQUEADA] Sanción de seguridad activa por rastreo fallido. Intenta de nuevo en ${minutesLeft} minutos.` }]);
          return;
        }

        setOperator({ name: data.name, id: data.agent_id, credits: data.credits });
        setStep('TERMINAL');
        setHistory([
          ...newHistory,
          { type: 'system', text: `CONEXIÓN RESTAURADA. AGENTE: ${data.name.toUpperCase()} [ID: ${data.agent_id}]` },
          { type: 'output', text: `Billetera: ${data.credits} UCREDS` },
          { type: 'info', text: 'Escribe "contracts" para ver misiones o "help".' }
        ]);
      } catch (err) {
        setHistory([...newHistory, { type: 'error', text: `[DB ERROR]: ${err.message}` }]);
      }
      return;
    }

    // 2. TERMINAL PRINCIPAL
    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          { type: 'system', text: 'COMANDOS DISPONIBLES:' },
          { type: 'output', text: '  contracts   - Lista los contratos disponibles' },
          { type: 'output', text: '  accept [ID] - Acepta un contrato (Bloquea la terminal en Modo Misión)' },
          { type: 'output', text: '  profile     - Muestra tus credenciales y saldo' },
          { type: 'output', text: '  clear       - Limpia la pantalla' },
        ]);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'profile':
        setHistory([
          ...newHistory,
          { type: 'system', text: `=== PERFIL TÁCTICO ===` },
          { type: 'output', text: `Operador: ${operator.name} [ID: ${operator.id}]` },
          { type: 'output', text: `Créditos: ${operator.credits} UCREDS` }
        ]);
        break;

      case 'contracts':
        const { data: cData } = await supabase.from('contracts').select('*');
        if (!cData || cData.length === 0) {
          setHistory(prev => [...prev, { type: 'warning', text: 'No hay contratos en la red.' }]);
        } else {
          const list = cData.map(c => 
            `[ID: ${c.id.slice(0, 8)}] | ${c.title} | Recompensa: ${c.bounty} | [${c.status}]`
          );
          setHistory(prev => [
            ...prev,
            { type: 'system', text: `=== RED DE CONTRATOS ===` },
            ...list.map(i => ({ type: 'output', text: i })),
            { type: 'info', text: 'Usa "accept [ID_parcial]" para aceptar y desplegar la misión.' }
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
          break;
        }

        // ACTIVAR MODO MISIÓN: Vaciar terminal y bloquear
        setActiveContract(cMatch);
        await supabase.from('contracts').update({ status: 'IN_PROGRESS', assigned_operator_id: operator.id }).eq('id', cMatch.id);

        if (cMatch.title.toLowerCase().includes('ronan')) {
          // Generar celda aleatoria secreta para el Buscaminas 20x20 (0 a 399)
          const randomCell = Math.floor(Math.random() * 400);
          setRonanTargetCell(randomCell);
          
          setHistory([
            { type: 'system', text: '🚨 [MODO MISIÓN ACTIVA: DESCLASIFICACIÓN AGENTE RONAN] 🚨' },
            { type: 'system', text: cMatch.description },
            { type: 'output', text: '--- MATRIZ DE RASTREO TÁCTICO 20x20 (Coordenadas 0 a 399) ---' },
            { type: 'info', text: 'Introduce un número del 0 al 399 para seleccionar un nodo de la red y rastrear al agente. (Si fallas, bloqueo de 1 hora).' }
          ]);
        } else {
          // Misión de empresa (Rogue 1, Cybernet, Biotechnology)
          setHackStage(1);
          setHistory([
            { type: 'system', text: `⚡ [MODO MISIÓN ACTIVA: ${cMatch.title.toUpperCase()}] ⚡` },
            { type: 'system', text: cMatch.description },
            { type: 'output', text: '--- CONSOLA DE INFILTRACIÓN CORPORATIVA ---' },
            { type: 'output', text: 'Fase 1/3: Inyección de carga útil. Escribe el comando de bypass requerido:' },
            { type: 'info', text: '>>> Escribe: OVERRIDE_FIREWALL --node-root' }
          ]);
        }
        break;

      default:
        setHistory([...newHistory, { type: 'error', text: `Comando desconocido. Escribe "help".` }]);
        break;
    }
  };

  // LÓGICA CUANDO LA TERMINAL ESTÁ EN MODO MISIÓN ACTIVA
  const handleActiveMissionInput = async (val) => {
    const isRonan = activeContract.title.toLowerCase().includes('ronan');

    if (isRonan) {
      const chosen = parseInt(val);
      if (isNaN(chosen) || chosen < 0 || chosen > 399) {
        setHistory(prev => [...prev, { type: 'error', text: 'Coordenada inválida. Debe ser un número entre 0 y 399.' }]);
        return;
      }

      if (chosen === ronanTargetCell) {
        // ¡Éxito! Encontró a Ronan
        const reward = parseInt(activeContract.bounty.replace(/[^0-9]/g, '')) || 1000000;
        const newCreds = operator.credits + reward;
        
        await supabase.from('operators').update({ credits: newCreds }).eq('agent_id', operator.id);
        await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', activeContract.id);
        
        setOperator(prev => ({ ...prev, credits: newCreds }));
        setActiveContract(null);
        
        setHistory([
          { type: 'system', text: '🎯 [OBJETIVO ALCANZADO: AGENTE RONAN EXTERMINADO] 🎯' },
          { type: 'output', text: `Has localizado al agente en el nodo [${chosen}]. Desclasificación completada.` },
          { type: 'output', text: `💰 Recompensa de ${activeContract.bounty} acreditada. Saldo: ${newCreds} UCREDS.` },
          { type: 'info', text: 'Terminal restaurada al menú principal. Escribe "contracts".' }
        ]);
      } else {
        // Falló: Aplicar bloqueo de 1 hora
        const oneHourLater = new Date(new Date().getTime + 3600000).toISOString();
        await supabase.from('operators').update({ lock_until: oneHourLater }).eq('agent_id', operator.id);

        setActiveContract(null);
        setHistory([
          { type: 'error', text: '❌ [RASTREO FALLIDO] El nodo estaba vacío. El agente Ronan ha detectado el escaneo y se ha desplazado.' },
          { type: 'error', text: '⛔ [SANCIÓN DE RED] Terminal bloqueada por 1 hora por protocolo de contrainteligencia.' },
          { type: 'info', text: 'La sesión se cerrará por seguridad.' }
        ]);
        setStep('LOGIN_CHOICE');
      }
    } else {
      // Lógica de Hackeo Secuencial para Empresas (Rogue 1, Cybernet, Biotechnology)
      if (hackStage === 1) {
        if (val === 'OVERRIDE_FIREWALL --node-root') {
          setHackStage(2);
          setHistory(prev => [
            ...prev,
            { type: 'input', text: `> ${val}` },
            { type: 'system', text: '✔ Firewall secundario evadido.' },
            { type: 'output', text: 'Fase 2/3: Extracción de base de datos cifrada.' },
            { type: 'info', text: '>>> Escribe la consulta SQL de extracción: SELECT * FROM mainframe_data;' }
          ]);
        } else {
          setHistory(prev => [...prev, { type: 'input', text: `> ${val}` }, { type: 'error', text: 'Comando incorrecto. Escribe: OVERRIDE_FIREWALL --node-root' }]);
        }
      } else if (hackStage === 2) {
        if (val.toLowerCase() === 'select * from mainframe_data;') {
          setHackStage(3);
          setHistory(prev => [
            ...prev,
            { type: 'input', text: `> ${val}` },
            { type: 'system', text: '✔ Datos extraídos con éxito.' },
            { type: 'output', text: 'Fase 3/3: Limpieza de huellas y transferencia de fondos.' },
            { type: 'info', text: '>>> Escribe el comando final: EXECUTE --purge-logs' }
          ]);
        } else {
          setHistory(prev => [...prev, { type: 'input', text: `> ${val}` }, { type: 'error', text: 'Consulta SQL incorrecta. Escribe: SELECT * FROM mainframe_data;' }]);
        }
      } else if (hackStage === 3) {
        if (val === 'EXECUTE --purge-logs') {
          // Misión cumplida de empresa
          const reward = parseInt(activeContract.bounty.replace(/[^0-9]/g, '')) || 100000;
          const newCreds = operator.credits + reward;

          await supabase.from('operators').update({ credits: newCreds }).eq('agent_id', operator.id);
          await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', activeContract.id);

          setOperator(prev => ({ ...prev, credits: newCreds }));
          setActiveContract(null);
          setHackStage(0);

          setHistory([
            { type: 'system', text: '⚡ [INFILTRACIÓN CORPORATIVA EXITOSA] ⚡' },
            { type: 'output', text: `✔ Misión "${activeContract.title}" finalizada con éxito.` },
            { type: 'output', text: `💰 Recompensa de ${activeContract.bounty} transferida. Saldo: ${newCreds} UCREDS.` },
            { type: 'info', text: 'Terminal restaurada. Escribe "contracts".' }
          ]);
        } else {
          setHistory(prev => [...prev, { type: 'input', text: `> ${val}` }, { type: 'error', text: 'Comando incorrecto. Escribe: EXECUTE --purge-logs' }]);
        }
      }
    }
  };

  return (
    <div 
      onClick={handleScreenClick}
      className="relative h-screen w-screen bg-gray-950 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none text-emerald-400 border border-emerald-500/30"
    >
      <CRTOverlay />

      <header className="border-b border-emerald-500/30 pb-2 mb-4 flex justify-between items-center text-xs tracking-widest opacity-80 font-mono">
        <div>AGENT: {operator.name ? operator.name.toUpperCase() : 'AUTH_REQUIRED'} [ID: {operator.id || '----'}]</div>
        <div>CREDITS: {operator.credits} UCREDS</div>
        <div>MODE: {activeContract ? 'ACTIVE_MISSION' : step}</div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none font-mono text-sm md:text-base">
        {step === 'LOGIN_CHOICE' && (
          <div className="space-y-2">
            <div className="font-bold text-emerald-400 animate-pulse">=== OPERATOR GALAXY SECURE TERMINAL ===</div>
            <div>[1] Registrarse como nuevo Agente</div>
            <div>[2] Iniciar sesión con ID existente</div>
            <div className="opacity-75 pt-2">&gt; Selecciona una opción (1 o 2):</div>
          </div>
        )}

        {history.map((item, index) => {
          let colorClass = 'text-emerald-400';
          if (item.type === 'error') colorClass = 'text-red-500 font-bold';
          if (item.type === 'warning') colorClass = 'text-yellow-400';
          if (item.type === 'info') colorClass = 'opacity-70 italic';
          if (item.type === 'system') colorClass = 'font-bold opacity-90 text-emerald-300';
          if (item.type === 'input') colorClass = 'text-emerald-500 opacity-90';

          return (
            <div key={index} className={`${colorClass} whitespace-pre-wrap`}>
              {item.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommand} className="mt-4 flex items-center gap-2 border-t border-emerald-500/30 pt-3 bg-gray-950/80">
        <span className="font-bold">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          spellCheck="false"
          autoComplete="off"
          className="bg-transparent border-none outline-none flex-1 font-mono text-emerald-400 text-sm md:text-base tracking-wider"
        />
        <span className="animate-blink font-bold">█</span>
      </form>
    </div>
  );
}