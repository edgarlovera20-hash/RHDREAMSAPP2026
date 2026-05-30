import React, { useState, useEffect } from 'react';
import { XCircle, BookOpen, FileText, Database, Plus, Trash2, Bot, Upload } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: any;
}

export function AgentConfigModal({ agent, onClose }: { agent: any, onClose: () => void }) {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newItemType, setNewItemType] = useState('text');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');

  useEffect(() => {
    fetchKnowledge();
  }, [agent.id]);

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
      
      // Before creating a knowledge, we must ensure the agent document exists 
      // If we are using mock agents that are not in DB, this will fail. Let's create a placeholder agent if needed in real code.
      // But for this UI, we assume agent exists or we create it.
      // For simplicity, let's create the agent if it doesn't exist, BUT we don't have its full data here to do it correctly. 
      // Let's assume the mock agent id is handled correctly for now. If it fails, we catch.
      
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
        <p className="text-slate-400 text-sm mb-6">Gestiona la base de conocimientos y plantillas para que este agente aprenda.</p>

        <div className="flex-1 overflow-y-auto pr-2 styled-scrollbar flex flex-col gap-8">
          
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
