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

// Hook de máquina de escribir corregido y seguro
function useTypewriter(text, speed = 15, onComplete) {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    if (!text) return;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text]);
  return displayedText;
}

// Componente para renderizar la línea con efecto de escritura
function TerminalLine({ item, isLast, onLineComplete }) {
  const textToShow = useTypewriter(
    item.text, 
    item.type === 'system' ? 10 : 3, 
    isLast ? onLineComplete : null
  );

  let colorClass = 'text-emerald-400';
  if (item.type === 'error') colorClass = 'text-red-500 font-bold';
  if (item.type === 'warning') colorClass = 'text-yellow-400';
  if (item.type === 'info') colorClass = 'opacity-70 italic';
  if (item.type === 'system') colorClass = 'font-bold text-emerald-300';
  if (item.type === 'input') colorClass = 'text-emerald-500 opacity-90';

  return (
    <div className={`${colorClass} whitespace-pre-wrap`}>
      {isLast && item.type !== 'input' ? textToShow : item.text}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState('LOGIN_CHOICE'); 
  const [operator, setOperator] = useState({ name: '', id: '', credits: 1000 });
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'system', text: 'ESTABLECIENDO CONEXIÓN SEGURA CON EL MAINFRAME CENTRAL...\nSECURE PROTOCOL v4.0.2 INICIALIZADO.' }
  ]);
  
  const [activeContract, setActiveContract] = useState(null);
  const [ronanTargetCell, setRonanTargetCell] = useState(null);
  const [hackStage, setHackStage] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleScreenClick = () => {
    inputRef.current?.focus();
  };

  const addLine = (type, text) => {
    setHistory(prev => [...prev, { type, text }]);
    setIsTyping(true);
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (isTyping) return;
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (activeContract) {
      addLine('input', `> ${trimmedInput}`);
      setInput('');
      await handleActiveMissionInput(trimmedInput);
      return;
    }

    addLine('input', `> ${trimmedInput}`);
    setInput('');

    const args = trimmedInput.split(' ');
    const cmd = args[0].toLowerCase();

    if (step === 'LOGIN_CHOICE') {
      if (trimmedInput === '1') {
        setStep('REGISTER_NAME');
        addLine('system', 'INICIANDO PROTOCOLO DE RECLUTA // INTRODUZCA SU NOMBRE TÁCTICO:');
      } else if (trimmedInput === '2') {
        setStep('LOGIN_INPUT');
        addLine('system', 'INTRODUZCA SU CÓDIGO ID DE ACCESO (Ej: 00A1):');
      } else {
        addLine('error', 'Opción inválida. Escribe 1 para registrarse o 2 para ingresar.');
      }
      return;
    }

    if (step === 'REGISTER_NAME') {
      if (!trimmedInput) return;
      const generatedId = generateAgentId();

      try {
        const { error: insertError } = await supabase.from('operators').insert([{
          agent_id: generatedId,
          name: trimmedInput,
          credits: 1000,
          status: 'ACTIVE'
        }]);

        if (insertError) throw insertError;

        setOperator({ name: trimmedInput, id: generatedId, credits: 1000 });
        setStep('TERMINAL');
        addLine('system', `[REGISTRO EXITOSO] BIENVENIDO, OPERADOR ${trimmedInput.toUpperCase()}`);
        setTimeout(() => addLine('error', `⚠️ GUARDE SU ID SECRETO: [ ${generatedId} ] LO NECESITARÁ PARA ENTRAR.`), 500);
        setTimeout(() => addLine('info', 'Escribe "contracts" para ver las misiones disponibles en la red.'), 1000);
      } catch (err) {
        addLine('error', `[ERROR REGISTRO]: ${err.message}`);
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
          addLine('error', '[ACCESO DENEGADO] ID no reconocido en el mainframe.');
          setStep('LOGIN_CHOICE');
          return;
        }

        if (data.lock_until && new Date() < new Date(data.lock_until)) {
          const minutesLeft = Math.ceil((new Date(data.lock_until) - new Date()) / 60000);
          addLine('error', `⛔ [TERMINAL BLOQUEADA] Sanción activa por rastreo fallido. Intenta en ${minutesLeft} minutos.`);
          return;
        }

        setOperator({ name: data.name, id: data.agent_id, credits: data.credits });
        setStep('TERMINAL');
        addLine('system', `CONEXIÓN RESTAURADA. AGENTE: ${data.name.toUpperCase()} [ID: ${data.agent_id}]`);
        setTimeout(() => addLine('output', `Billetera: ${data.credits} UCREDS`), 400);
        setTimeout(() => addLine('info', 'Escribe "contracts" para acceder a los contratos o "help".'), 800);
      } catch (err) {
        addLine('error', `[DB ERROR]: ${err.message}`);
      }
      return;
    }

    switch (cmd) {
      case 'help':
        addLine('system', 'COMANDOS DISPONIBLES:\n  contracts   - Examina la red de contratos y objetivos\n  accept [ID] - Acepta y despliega el protocolo de misión\n  profile     - Revisa credenciales y balance\n  clear       - Limpia el buffer de pantalla');
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'profile':
        addLine('system', `=== PERFIL TÁCTICO ===\nOperador: ${operator.name} [ID: ${operator.id}]\nCréditos: ${operator.credits} UCREDS`);
        break;

      case 'contracts':
        const { data: cData, error: cError } = await supabase.from('contracts').select('*');
        if (cError || !cData || cData.length === 0) {
          addLine('warning', 'No hay contratos disponibles en este nodo.');
        } else {
          addLine('system', `=== RED DE CONTRATOS ACTIVOS (${cData.length}) ===`);
          cData.forEach((c, idx) => {
            setTimeout(() => {
              addLine('output', `[ID: ${c.id}] | ${c.title}\nBounty: ${c.bounty} | Estado: [${c.status}]`);
            }, idx * 200);
          });
          setTimeout(() => {
            addLine('info', 'Usa "accept [ID]" (ej: accept d1a84329) para hackear el objetivo.');
          }, cData.length * 200 + 100);
        }
        break;

      case 'accept':
        const rawArg = args.slice(1).join(' ');
        const accId = rawArg.replace(/[\[\]]/g, '').trim();

        if (!accId) {
          addLine('error', 'Uso incorrecto. Formato: accept [ID]');
          break;
        }
        
        const { data: allC, error: errC } = await supabase.from('contracts').select('*');
        if (errC || !allC) {
          addLine('error', 'Error crítico al conectar con la base de datos.');
          break;
        }

        const cMatch = allC.find(c => c.id && c.id.toLowerCase().startsWith(accId.toLowerCase()));

        if (!cMatch) {
          addLine('error', `Contrato con identificador parcial "${accId}" no encontrado.`);
        } else {
          setActiveContract(cMatch);
          await supabase.from('contracts').update({ status: 'IN_PROGRESS', assigned_operator_id: operator.id }).eq('id', cMatch.id);

          if (cMatch.title.toLowerCase().includes('ronan')) {
            const randomCell = Math.floor(Math.random() * 400); // 0 a 399
            setRonanTargetCell(randomCell);
            
            addLine('system', '🚨 [PROTOCOLO DE INFILTRACIÓN ACTIVO: AGENTE RONAN] 🚨');
            setTimeout(() => addLine('system', cMatch.description || 'Sin descripción.'), 300);
            setTimeout(() => addLine('output', '--- MATRIZ DE RASTREO TÁCTICO 20x20 (Nodos 0 a 399) ---'), 600);
            setTimeout(() => addLine('info', 'Introduce una coordenada numérica (0 - 399) para escanear el sector:'), 900);
          } else {
            setHackStage(1);
            addLine('system', `⚡ [INICIANDO INFILTRACIÓN: ${cMatch.title.toUpperCase()}] ⚡`);
            setTimeout(() => addLine('system', cMatch.description || 'Infiltración corporativa.'), 300);
            setTimeout(() => addLine('output', '--- CONSOLA DE INTRUSIÓN DE RED ---'), 600);
            setTimeout(() => addLine('output', 'Fase 1/3: Saltando cortafuegos corporativo...'), 900);
            setTimeout(() => addLine('info', '>>> Escribe el comando de bypass: OVERRIDE_FIREWALL --node-root'), 1200);
          }
        }
        break;

      default:
        addLine('error', `Comando no reconocido: "${trimmedInput}". Escribe "help".`);
        break;
    }
  };

  const handleActiveMissionInput = async (val) => {
    const isRonan = activeContract.title.toLowerCase().includes('ronan');

    if (isRonan) {
      const chosen = parseInt(val);
      if (isNaN(chosen) || chosen < 0 || chosen > 399) {
        addLine('error', 'Coordenada fuera de rango. Selecciona un nodo entre 0 y 399.');
        return;
      }

      if (chosen === ronanTargetCell) {
        const reward = parseInt(activeContract.bounty.replace(/[^0-9]/g, '')) || 1000000;
        const newCreds = operator.credits + reward;
        
        await supabase.from('operators').update({ credits: newCreds }).eq('agent_id', operator.id);
        await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', activeContract.id);
        
        setOperator(prev => ({ ...prev, credits: newCreds }));
        setActiveContract(null);
        
        addLine('system', '🎯 [BLANCO LOCALIZADO Y ELIMINADO CON ÉXITO] 🎯');
        setTimeout(() => addLine('output', `El agente Ronan fue interceptado en el nodo [${chosen}].`), 300);
        setTimeout(() => addLine('output', `💰 Recompensa de ${activeContract.bounty} transferida. Saldo: ${newCreds} UCREDS.`), 600);
        setTimeout(() => addLine('info', 'Terminal liberada. Escribe "contracts".'), 900);
      } else {
        const oneHourLater = new Date(new Date().getTime() + 3600000).toISOString();
        await supabase.from('operators').update({ lock_until: oneHourLater }).eq('agent_id', operator.id);

        setActiveContract(null);
        addLine('error', `❌ [ERROR DE RASTREO] Nodo [${chosen}] vacío. El agente ha detectado la intrusión.`);
        setTimeout(() => addLine('error', '⛔ [ALERTA] Terminal bloqueada por contrainteligencia durante 1 hora.'), 400);
        setTimeout(() => {
          addLine('info', 'Desconectando sesión...');
          setStep('LOGIN_CHOICE');
        }, 800);
      }
    } else {
      if (hackStage === 1) {
        if (val === 'OVERRIDE_FIREWALL --node-root') {
          setHackStage(2);
          addLine('system', '✔ Cortafuegos corporativo neutralizado.');
          setTimeout(() => addLine('output', 'Fase 2/3: Descargando archivos confidenciales del servidor central.'), 400);
          setTimeout(() => addLine('info', '>>> Escribe la consulta de extracción: SELECT * FROM mainframe_data;'), 800);
        } else {
          addLine('error', 'Acceso denegado. Escribe: OVERRIDE_FIREWALL --node-root');
        }
      } else if (hackStage === 2) {
        if (val.toLowerCase() === 'select * from mainframe_data;') {
          setHackStage(3);
          addLine('system', '✔ Volcado de datos completado con éxito en el servidor proxy.');
          setTimeout(() => addLine('output', 'Fase 3/3: Borrando registros de actividad y rastros forenses.'), 400);
          setTimeout(() => addLine('info', '>>> Escribe el comando de finalización: EXECUTE --purge-logs'), 800);
        } else {
          addLine('error', 'Sintaxis SQL incorrecta. Escribe: SELECT * FROM mainframe_data;');
        }
      } else if (hackStage === 3) {
        if (val === 'EXECUTE --purge-logs') {
          const reward = parseInt(activeContract.bounty.replace(/[^0-9]/g, '')) || 100000;
          const newCreds = operator.credits + reward;

          await supabase.from('operators').update({ credits: newCreds }).eq('agent_id', operator.id);
          await supabase.from('contracts').update({ status: 'COMPLETED' }).eq('id', activeContract.id);

          setOperator(prev => ({ ...prev, credits: newCreds }));
          setActiveContract(null);
          setHackStage(0);

          addLine('system', '⚡ [INFILTRACIÓN COMPLETADA SIN RASTRO] ⚡');
          setTimeout(() => addLine('output', `✔ Misión "${activeContract.title}" finalizada.`), 300);
          setTimeout(() => addLine('output', `💰 Recompensa añadida: ${activeContract.bounty}. Saldo: ${newCreds} UCREDS.`), 600);
          setTimeout(() => addLine('info', 'Terminal restaurada al menú principal. Escribe "contracts".'), 900);
        } else {
          addLine('error', 'Comando de purga incorrecto. Escribe: EXECUTE --purge-logs');
        }
      }
    }
  };

  return (
    <div 
      onClick={handleScreenClick}
      className="relative h-screen w-screen bg-gray-950 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none text-emerald-400 border border-emerald-500/30 font-mono"
    >
      <CRTOverlay />

      <header className="border-b border-emerald-500/30 pb-2 mb-4 flex justify-between items-center text-xs tracking-widest opacity-80">
        <div>AGENT: {operator.name ? operator.name.toUpperCase() : 'AUTH_REQUIRED'} [ID: {operator.id || '----'}]</div>
        <div>CREDITS: {operator.credits} UCREDS</div>
        <div>MODE: {activeContract ? 'ACTIVE_MISSION' : step}</div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-none text-sm md:text-base">
        {step === 'LOGIN_CHOICE' && history.length === 1 && !isTyping && (
          <div className="space-y-2">
            <div className="font-bold text-emerald-400 animate-pulse">=== OPERATOR GALAXY SECURE TERMINAL ===</div>
            <div>[1] Registrarse como nuevo Agente</div>
            <div>[2] Iniciar sesión con ID existente</div>
            <div className="opacity-75 pt-2">&gt; Selecciona una opción (1 o 2):</div>
          </div>
        )}

        {history.map((item, index) => (
          <TerminalLine 
            key={index} 
            item={item} 
            isLast={index === history.length - 1} 
            onLineComplete={() => setIsTyping(false)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommand} className="mt-4 flex items-center gap-2 border-t border-emerald-500/30 pt-3 bg-gray-950/80">
        <span className="font-bold">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
          autoFocus
          spellCheck="false"
          autoComplete="off"
          className="bg-transparent border-none outline-none flex-1 font-mono text-emerald-400 text-sm md:text-base tracking-wider disabled:opacity-40"
        />
        <span className="animate-blink font-bold">█</span>
      </form>
    </div>
  );
}