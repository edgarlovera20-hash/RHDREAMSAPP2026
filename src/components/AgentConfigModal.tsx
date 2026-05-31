import React, { useState, useEffect } from 'react';
import { XCircle, BookOpen, FileText, Database, Plus, Trash2, Bot, Save, Mic, Volume2, SlidersHorizontal } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

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
  const [loading, setLoading] = useState(true);
  
  const [newItemType, setNewItemType] = useState('text');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [personalityPrompt, setPersonalityPrompt] = useState(agent.personalityPrompt || agent.basePrompt || agent.systemPrompt || DEFAULT_PERSONALITY);
  const [tone, setTone] = useState(agent.tone || 'Cercano, profesional y directo');
  const [responseStyle, setResponseStyle] = useState(agent.responseStyle || 'Respuestas breves, humanas y accionables.');
  const [escalationRules, setEscalationRules] = useState(agent.escalationRules || 'Escalar a RH cuando falte información, haya quejas, salario no confirmado, datos sensibles o dudas legales.');
  const [transcribeAudio, setTranscribeAudio] = useState(agent.transcribeAudio ?? true);
  const [audioAutoReply, setAudioAutoReply] = useState(agent.audioAutoReply ?? true);
  const [audioLanguage, setAudioLanguage] = useState(agent.audioLanguage || 'es-MX');

  useEffect(() => {
    fetchKnowledge();
    setPersonalityPrompt(agent.personalityPrompt || agent.basePrompt || agent.systemPrompt || DEFAULT_PERSONALITY);
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
      const q = query(
        collection(db, `agents/${agent.id}/knowledge`), 
        where('userId', '==', auth.currentUser?.uid)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeItem));
      setKnowledgeList(items);
    } catch (err: any) {
      if (err.message.includes('offline')) return;
      handleFirestoreError(err, OperationType.LIST, `agents/${agent.id}/knowledge`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!newItemTitle.trim() || !newItemContent.trim() || !auth.currentUser) return;
    try {
      setLoading(true);
      
      await addDoc(collection(db, `agents/${agent.id}/knowledge`), {
        type: newItemType,
        title: newItemTitle,
        content: newItemContent,
        agentId: agent.id,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      setNewItemTitle('');
      setNewItemContent('');
      await fetchKnowledge();
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
      await deleteDoc(doc(db, `agents/${agent.id}/knowledge`, id));
      await fetchKnowledge();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `agents/${agent.id}/knowledge/${id}`);
    } finally {
      setLoading(false);
    }
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
           <Bot className="w-6 h-6 text-cyan-400" />
           Configuración: {agent.name}
        </h2>
        <p className="text-slate-400 text-sm mb-6">Gestiona personalidad, audios, base de conocimientos y plantillas para que este agente aprenda.</p>

        <div className="flex-1 overflow-y-auto pr-2 styled-scrollbar flex flex-col gap-8">
          <div className="bg-slate-800/50 border border-cyan-500/20 p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  Personalidad y voz del agente
                </h3>
                <p className="mt-1 text-xs text-slate-500">Estos campos controlan cómo habla, cuándo escala y qué hace con audios.</p>
              </div>
              <button
                onClick={handleSavePersonality}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Save className="h-4 w-4" />
                Guardar personalidad
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Tono</label>
                <input
                  type="text"
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  placeholder="Ej. cálido, directo, ejecutivo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Idioma de audio</label>
                <select
                  value={audioLanguage}
                  onChange={e => setAudioLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
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
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Estilo de respuesta</label>
                <textarea
                  value={responseStyle}
                  onChange={e => setResponseStyle(e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-1.5 block">Reglas de escalamiento</label>
                <textarea
                  value={escalationRules}
                  onChange={e => setEscalationRules(e.target.value)}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 cursor-pointer hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    Transcribir audios
                  </span>
                  <input
                    type="checkbox"
                    checked={transcribeAudio}
                    onChange={e => setTranscribeAudio(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Convierte notas de voz en texto antes de activar la IA.</p>
              </label>

              <label className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 cursor-pointer hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Responder audios
                  </span>
                  <input
                    type="checkbox"
                    checked={audioAutoReply}
                    onChange={e => setAudioAutoReply(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Si está apagado, solo guarda la transcripción para revisión humana.</p>
              </label>
            </div>
          </div>
          
          {/* New Item Form */}
          <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
             <h3 className="text-white font-semibold flex items-center gap-2 border-b border-slate-700 pb-2">
               <Database className="w-4 h-4 text-emerald-400" />
               Añadir a la Base de Conocimientos
               <button 
                 onClick={async () => {
                   setNewItemType('template');
                   setNewItemTitle('Plantilla Base: Saludo Inicial');
                   setNewItemContent('¡Hola! Soy {agent_name}, asistente de reclutamiento. ¿Te interesa conocer más detalles sobre la vacante de {job_title}?');
                 }}
                 className="ml-auto text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors"
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
                   className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
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
                   className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                 />
               </div>
             </div>

             <div>
               <label className="text-xs text-slate-400 font-medium mb-1.5 block">Contenido</label>
               <textarea 
                 value={newItemContent}
                 onChange={e => setNewItemContent(e.target.value)}
                 placeholder="Pega el texto, instrucciones o el cuerpo de la plantilla aquí..."
                 className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
               />
             </div>

             <div className="flex justify-end">
               <button 
                 onClick={handleAddKnowledge}
                 disabled={loading || !newItemTitle.trim() || !newItemContent.trim()}
                 className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Agregar Conocimiento
               </button>
             </div>
          </div>

          {/* List existing knowledge */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
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
                         {item.type === 'template' ? <FileText className="w-5 h-5 text-purple-400" /> : <BookOpen className="w-5 h-5 text-amber-400" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
