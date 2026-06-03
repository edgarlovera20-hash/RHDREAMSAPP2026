import React, { useState, useEffect, useRef } from 'react';
import { XCircle, BookOpen, FileText, Database, Plus, Trash2, Bot, Save, Mic, Volume2, SlidersHorizontal, Download, Upload, Copy } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_ACCOUNT_CHANNEL, DEFAULT_ACCOUNT_NAME, DEFAULT_COMPANY_NAME } from '@/lib/recruiterAgentPrompt';

interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: any;
}

const DEFAULT_PERSONALITY = `Eres un agente de reclutamiento de Heavenly Dreams.
Hablas en español claro, cercano y profesional.
Ayudas al candidato, verificas datos antes de prometer algo y escalas cuando una persona de RH debe intervenir.`;

export function AgentConfigModal({
  agent,
  onClose,
  onSave,
}: {
  agent: any,
  onClose: () => void,
  onSave?: (agentId: string, patch: Record<string, any>) => void
}) {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const knowledgeImportRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  
  const [newItemType, setNewItemType] = useState('text');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [personalityPrompt, setPersonalityPrompt] = useState(agent.personalityPrompt || agent.basePrompt || agent.systemPrompt || DEFAULT_PERSONALITY);
  const [companyName, setCompanyName] = useState(agent.companyName || DEFAULT_COMPANY_NAME);
  const [accountName, setAccountName] = useState(agent.accountName || DEFAULT_ACCOUNT_NAME);
  const [accountChannel, setAccountChannel] = useState(agent.accountChannel || DEFAULT_ACCOUNT_CHANNEL);
  const [tone, setTone] = useState(agent.tone || 'Cercano, profesional y directo');
  const [responseStyle, setResponseStyle] = useState(agent.responseStyle || 'Respuestas breves, humanas y accionables.');
  const [escalationRules, setEscalationRules] = useState(agent.escalationRules || 'Escalar a RH cuando falte información, haya quejas, salario no confirmado, datos sensibles o dudas legales.');
  const [transcribeAudio, setTranscribeAudio] = useState(agent.transcribeAudio ?? true);
  const [audioAutoReply, setAudioAutoReply] = useState(agent.audioAutoReply ?? true);
  const [audioLanguage, setAudioLanguage] = useState(agent.audioLanguage || 'es-MX');
  const localKnowledgeKey = `rhdreams_agent_knowledge_${agent.id}`;

  const syncAgentKnowledge = (items: KnowledgeItem[]) => {
    const normalized = items.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      content: item.content,
      createdAt: item.createdAt || new Date().toISOString(),
    }));
    localStorage.setItem(localKnowledgeKey, JSON.stringify(normalized));
    onSave?.(agent.id, {
      knowledgeBase: normalized,
      memory: normalized.length ? `${normalized.length} fuentes` : agent.memory,
    });
  };

  const readLocalKnowledge = (): KnowledgeItem[] => {
    try {
      const stored = localStorage.getItem(localKnowledgeKey);
      const parsed = stored ? JSON.parse(stored) : agent.knowledgeBase;
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return Array.isArray(agent.knowledgeBase) ? agent.knowledgeBase : [];
    }
  };

  useEffect(() => {
    fetchKnowledge();
    setPersonalityPrompt(agent.personalityPrompt || agent.basePrompt || agent.systemPrompt || DEFAULT_PERSONALITY);
    setCompanyName(agent.companyName || DEFAULT_COMPANY_NAME);
    setAccountName(agent.accountName || DEFAULT_ACCOUNT_NAME);
    setAccountChannel(agent.accountChannel || DEFAULT_ACCOUNT_CHANNEL);
    setTone(agent.tone || 'Cercano, profesional y directo');
    setResponseStyle(agent.responseStyle || 'Respuestas breves, humanas y accionables.');
    setEscalationRules(agent.escalationRules || 'Escalar a RH cuando falte información, haya quejas, salario no confirmado, datos sensibles o dudas legales.');
    setTranscribeAudio(agent.transcribeAudio ?? true);
    setAudioAutoReply(agent.audioAutoReply ?? true);
    setAudioLanguage(agent.audioLanguage || 'es-MX');
  }, [agent.id]);

  const handleSavePersonality = () => {
    onSave?.(agent.id, {
      personalityPrompt,
      basePrompt: personalityPrompt,
      systemPrompt: personalityPrompt,
      companyName: companyName.trim() || DEFAULT_COMPANY_NAME,
      accountName: accountName.trim() || DEFAULT_ACCOUNT_NAME,
      accountChannel: accountChannel.trim() || DEFAULT_ACCOUNT_CHANNEL,
      tone,
      responseStyle,
      escalationRules,
      transcribeAudio,
      audioAutoReply,
      audioLanguage,
    });
  };

  const fetchKnowledge = async () => {
    try {
      const localItems = readLocalKnowledge();
      if (!auth.currentUser) {
        setKnowledgeList(localItems);
        syncAgentKnowledge(localItems);
        return;
      }
      const q = query(
        collection(db, `agents/${agent.id}/knowledge`), 
        where('userId', '==', auth.currentUser?.uid)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeItem));
      const byId = new Map<string, KnowledgeItem>();
      [...localItems, ...items].forEach(item => byId.set(item.id, item));
      const merged = Array.from(byId.values());
      setKnowledgeList(merged);
      syncAgentKnowledge(merged);
    } catch (err: any) {
      const localItems = readLocalKnowledge();
      setKnowledgeList(localItems);
      syncAgentKnowledge(localItems);
      if (err.message.includes('offline')) return;
      handleFirestoreError(err, OperationType.LIST, `agents/${agent.id}/knowledge`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!newItemTitle.trim() || !newItemContent.trim()) return;
    try {
      setLoading(true);
      const localItem: KnowledgeItem = {
        id: `local-${Date.now()}`,
        type: newItemType,
        title: newItemTitle.trim(),
        content: newItemContent.trim(),
        createdAt: new Date().toISOString(),
      };
      const nextItems = [localItem, ...knowledgeList];
      setKnowledgeList(nextItems);
      syncAgentKnowledge(nextItems);

      if (auth.currentUser) {
        await addDoc(collection(db, `agents/${agent.id}/knowledge`), {
          type: newItemType,
          title: newItemTitle,
          content: newItemContent,
          agentId: agent.id,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      
      setNewItemTitle('');
      setNewItemContent('');
      if (auth.currentUser) await fetchKnowledge();
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `agents/${agent.id}/knowledge`);
      } catch (e) {
        // Suppress expected throw for UI
        alert("Error al guardar conocimiento. Asegúrate de que el agente esté guardado en Firebase.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const nextItems = knowledgeList.filter(item => item.id !== id);
      setKnowledgeList(nextItems);
      syncAgentKnowledge(nextItems);
      if (auth.currentUser && !id.startsWith('local-') && !id.startsWith('import-')) {
        await deleteDoc(doc(db, `agents/${agent.id}/knowledge`, id));
        await fetchKnowledge();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `agents/${agent.id}/knowledge/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = (fileName: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportKnowledge = () => {
    downloadJson(`rhdreams_${agent.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_conocimiento.json`, {
      app: 'RHDreams',
      type: 'agent_knowledge_export',
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
      },
      knowledge: knowledgeList,
    });
  };

  const normalizeImportedKnowledge = (payload: any): KnowledgeItem[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.knowledge)) return payload.knowledge;
    if (Array.isArray(payload.items)) return payload.items;
    if (typeof payload === 'object' && payload.title && payload.content) return [payload];
    throw new Error('El archivo no contiene conocimientos válidos.');
  };

  const handleImportKnowledgeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const imported = normalizeImportedKnowledge(payload).map((item: any, index: number) => ({
        id: `import-${Date.now()}-${index}`,
        title: item.title || item.name || `Fuente importada ${index + 1}`,
        type: item.type || 'text',
        content: item.content || item.text || item.body || JSON.stringify(item, null, 2),
        createdAt: item.createdAt || new Date().toISOString(),
      }));
      const nextItems = [...imported, ...knowledgeList];
      setKnowledgeList(nextItems);
      syncAgentKnowledge(nextItems);
      window.alert(`Importadas ${imported.length} fuentes para ${agent.name}.`);
    } catch (error: any) {
      window.alert(error.message || 'No se pudo importar la base de conocimientos.');
    }
  };

  const handleImportPlainText = () => {
    setNewItemType('text');
    setNewItemTitle('Documento pegado');
    setNewItemContent('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col glass-panel shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
           <Bot className="w-6 h-6 text-zinc-400" />
           Configuración: {agent.name}
        </h2>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-slate-400 text-sm">Gestiona personalidad, audios, base de conocimientos y plantillas para que este agente aprenda.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={knowledgeImportRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportKnowledgeFile}
            />
            <button
              onClick={() => knowledgeImportRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-zinc-500/50 hover:text-white"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar datos
            </button>
            <button
              onClick={handleExportKnowledge}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-zinc-500/50 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar datos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 styled-scrollbar flex flex-col gap-8">
          <div className="bg-slate-800/50 border border-zinc-500/20 p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
                  Personalidad y voz del agente
                </h3>
                <p className="mt-1 text-xs text-slate-500">Estos campos controlan cómo habla, cuándo escala y qué hace con audios.</p>
              </div>
              <button
                onClick={handleSavePersonality}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition-colors hover:bg-zinc-400"
              >
                <Save className="h-4 w-4" />
                Guardar personalidad
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Empresa</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ej. Heavenly Dreams"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Cuenta o línea</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Ej. WhatsApp RH 1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Canal</label>
                <input
                  type="text"
                  value={accountChannel}
                  onChange={e => setAccountChannel(e.target.value)}
                  placeholder="WhatsApp"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Tono</label>
                <input
                  type="text"
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  placeholder="Ej. cálido, directo, ejecutivo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Idioma de audio</label>
                <select
                  value={audioLanguage}
                  onChange={e => setAudioLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="es-MX">Español México</option>
                  <option value="es">Español</option>
                  <option value="en-US">Inglés EUA</option>
                  <option value="auto">Detectar automáticamente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Personalidad / prompt base</label>
              <textarea
                value={personalityPrompt}
                onChange={e => setPersonalityPrompt(e.target.value)}
                placeholder="Describe cómo debe hablar, qué debe priorizar y qué límites debe respetar."
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Estilo de respuesta</label>
                <textarea
                  value={responseStyle}
                  onChange={e => setResponseStyle(e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Reglas de escalamiento</label>
                <textarea
                  value={escalationRules}
                  onChange={e => setEscalationRules(e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 cursor-pointer hover:border-zinc-500/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Mic className="w-4 h-4 text-zinc-400" />
                    Transcribir audios
                  </span>
                  <input
                    type="checkbox"
                    checked={transcribeAudio}
                    onChange={e => setTranscribeAudio(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-600 text-zinc-500 focus:ring-zinc-500"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Convierte notas de voz en texto antes de activar la IA.</p>
              </label>

              <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 cursor-pointer hover:border-zinc-500/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Volume2 className="w-4 h-4 text-zinc-300" />
                    Responder audios
                  </span>
                  <input
                    type="checkbox"
                    checked={audioAutoReply}
                    onChange={e => setAudioAutoReply(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-600 text-zinc-500 focus:ring-zinc-500"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Si está apagado, solo guarda la transcripción para revisión humana.</p>
              </label>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-zinc-500/20 p-5 rounded-2xl">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  Autoconocimiento del agente
                </h3>
                <p className="mt-1 text-xs text-slate-500">Aprende de mensajes respondidos, pruebas y errores para consultar su experiencia previa.</p>
              </div>
              <button
                onClick={() => onSave?.(agent.id, { learningMemory: [], lastLearningAt: null, memory: `${knowledgeList.length} fuentes` })}
                className="rounded-lg border border-zinc-500/20 bg-zinc-500/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-500/20"
              >
                Limpiar aprendizajes
              </button>
            </div>

            {Array.isArray(agent.learningMemory) && agent.learningMemory.length > 0 ? (
              <div className="grid gap-3">
                {agent.learningMemory.slice(0, 6).map((memory: any) => (
                  <div key={memory.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                        {memory.intent || 'Aprendizaje'}
                      </span>
                      <span className="text-[10px] text-slate-500">{memory.source || 'Interacción'}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{memory.lesson || memory.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-center text-sm text-slate-500">
                Todavía no hay aprendizajes. Este agente empezará a recordar cuando responda mensajes en el chat o en el probador.
              </div>
            )}
          </div>
          
          {/* New Item Form */}
          <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
             <h3 className="text-white font-semibold flex items-center gap-2 border-b border-slate-700 pb-2">
               <Database className="w-4 h-4 text-zinc-300" />
               Añadir a la Base de Conocimientos
               <button
                 onClick={handleImportPlainText}
                 className="ml-auto text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors"
               >
                 Pegar documento
               </button>
               <button 
                 onClick={async () => {
                   setNewItemType('template');
                   setNewItemTitle('Plantilla Base: Saludo Inicial');
                   setNewItemContent('¡Hola! Soy {agent_name}, asistente de reclutamiento. ¿Te interesa conocer más detalles sobre la vacante de {job_title}?');
                 }}
                 className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors"
               >
                 Cargar Plantilla Base
               </button>
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs text-slate-400 font-medium mb-1.5 block">Tipo de Conocimiento</label>
                 <select 
                   value={newItemType}
                   onChange={e => setNewItemType(e.target.value)}
                   className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                 >
                   <option value="text">Texto Libre / Instrucciones</option>
                   <option value="template">Plantilla de Conversación</option>
                   <option value="file">Información de Archivo (Manual)</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs text-slate-400 font-medium mb-1.5 block">Título / Referencia</label>
                 <input 
                   type="text"
                   value={newItemTitle}
                   onChange={e => setNewItemTitle(e.target.value)}
                   placeholder="Ej. Cultura de la Empresa"
                   className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                 />
               </div>
             </div>

             <div>
               <label className="text-xs text-slate-400 font-medium mb-1.5 block">Contenido</label>
               <textarea 
                 value={newItemContent}
                 onChange={e => setNewItemContent(e.target.value)}
                 placeholder="Pega el texto, instrucciones o el cuerpo de la plantilla aquí..."
                 className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono resize-none"
               />
             </div>

             <div className="flex justify-end">
               <button 
                 onClick={handleAddKnowledge}
                 disabled={loading || !newItemTitle.trim() || !newItemContent.trim()}
                 className="bg-zinc-500 hover:bg-zinc-600 disabled:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Agregar Conocimiento
               </button>
             </div>
          </div>

          {/* List existing knowledge */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              Conocimiento Actual
            </h3>
            
            {loading && knowledgeList.length === 0 ? (
               <div className="text-slate-400 text-sm animate-pulse">Cargando base de conocimientos...</div>
            ) : knowledgeList.length === 0 ? (
               <div className="text-center p-8 bg-slate-800/30 border border-slate-700/50 rounded-xl border-dashed">
                 <p className="text-slate-500 text-sm">Este agente aún no tiene conocimientos almacenados.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-3">
                 {knowledgeList.map(item => (
                   <div key={item.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex gap-4 group">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                         {item.type === 'template' ? <FileText className="w-5 h-5 text-zinc-300" /> : <BookOpen className="w-5 h-5 text-zinc-300" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => navigator.clipboard?.writeText(item.content)}
                              className="text-slate-500 hover:text-zinc-300 p-1"
                              title="Copiar contenido"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="text-slate-500 hover:text-zinc-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 block">{item.type}</span>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.content}</p>
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
