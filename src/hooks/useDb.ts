import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth, OperationType } from "@/lib/firebase";
import { apiUrl, readApiJson } from "@/lib/api";
import {
  Candidate,
  Job,
  Appointment,
  Message,
  Automation,
  Notification,
  Agent
} from "@/services/db";

type CollectionUnsubscribe = () => void;

export function useDb() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const clearCollections = useCallback(() => {
    setCandidates([]);
    setAgents([]);
    setJobs([]);
    setAppointments([]);
    setAutomations([]);
    setNotifications([]);
    setMessages([]);
    setLoading(false);
  }, []);

  const requireAuthenticatedUser = () => {
    if (!auth.currentUser) {
      throw new Error("Debes iniciar sesión para modificar datos reales.");
    }
    return auth.currentUser;
  };

  // Load all collections reactive
  useEffect(() => {
    let collectionUnsubs: CollectionUnsubscribe[] = [];

    const cleanupCollections = () => {
      collectionUnsubs.forEach((unsubscribe) => unsubscribe());
      collectionUnsubs = [];
    };

    const reportSubscriptionError = (path: string, error: unknown) => {
      console.warn("Firestore subscription skipped:", {
        path,
        operationType: OperationType.LIST,
        error: error instanceof Error ? error.message : String(error),
        userId: auth.currentUser?.uid,
      });
      setLoading(false);
    };

    const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
      cleanupCollections();

      if (!firebaseUser) {
        clearCollections();
        return;
      }

      setLoading(true);

      collectionUnsubs = [
        onSnapshot(collection(db, "candidates"), (snapshot) => {
          const list: Candidate[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Candidate);
          });
          setCandidates(list);
        }, (error) => {
          reportSubscriptionError("candidates", error);
        }),

        onSnapshot(collection(db, "jobs"), (snapshot) => {
          const list: Job[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Job);
          });
          setJobs(list);
        }, (error) => {
          reportSubscriptionError("jobs", error);
        }),

        onSnapshot(collection(db, "appointments"), (snapshot) => {
          const list: Appointment[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Appointment);
          });
          setAppointments(list);
        }, (error) => {
          reportSubscriptionError("appointments", error);
        }),

        onSnapshot(collection(db, "messages"), (snapshot) => {
          const list: Message[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Message);
          });
          list.sort((a, b) => a.createdAt - b.createdAt);
          setMessages(list);
        }, (error) => {
          reportSubscriptionError("messages", error);
        }),

        onSnapshot(collection(db, "automations"), (snapshot) => {
          const list: Automation[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Automation);
          });
          setAutomations(list);
        }, (error) => {
          reportSubscriptionError("automations", error);
        }),

        onSnapshot(collection(db, "notifications"), (snapshot) => {
          const list: Notification[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Notification);
          });
          list.sort((a, b) => b.createdAt - a.createdAt);
          setNotifications(list);
          setLoading(false);
        }, (error) => {
          reportSubscriptionError("notifications", error);
        }),

        onSnapshot(collection(db, "agents"), (snapshot) => {
          const list: Agent[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as Agent);
          });
          setAgents(list);
        }, (error) => {
          reportSubscriptionError("agents", error);
        }),
      ];
    });

    return () => {
      cleanupCollections();
      unsubscribeAuth();
    };
  }, [clearCollections]);

  // AUTOMATION ENGINE (Phase 10 & Phase 7 & Phase 9)
  const runAutomationsForEvent = useCallback(async (triggerType: string, context: { candidate?: Candidate; appointment?: Appointment; message?: Message }) => {
    try {
      console.log(`[Automation Engine] Triggering event: ${triggerType}`, context);
      
      // Fetch latest active automations
      const activeAutos = automations.filter(a => a.active && a.trigger === triggerType);
      
      for (const auto of activeAutos) {
        console.log(`[Automation Engine] Executing Rule: "${auto.name}"`);
        
        for (const action of auto.actions) {
          if (action === "send_whatsapp" && context.candidate) {
            const defaultGreeting = `Hola ${context.candidate.name}, registramos tu interés para la vacante de ${context.candidate.role}. ¿Te gustaría recibir detalles sobre la capacitación u horarios de entrevistas?`;
            
            // Add outbound WhatsApp message
            const newMsgRef = doc(collection(db, "messages"));
            await setDoc(newMsgRef, {
              id: newMsgRef.id,
              candidateId: context.candidate.id,
              channel: "whatsapp",
              direction: "outbound",
              body: defaultGreeting,
              sender: "me",
              status: "sent",
              createdAt: Date.now()
            });

            // Ask the assigned AI agent to continue the conversation.
            triggerAgentDialogue(context.candidate.id, "agent-1", "Por favor da la bienvenida e introduce al candidato.");
          }

          if (action === "send_email" && context.candidate) {
            // Add automated system email logging
            const newMsgRef = doc(collection(db, "messages"));
            await setDoc(newMsgRef, {
              id: newMsgRef.id,
              candidateId: context.candidate.id,
              channel: "email",
              direction: "outbound",
              body: `Estimado/a ${context.candidate.name}, su postulación para la vacante de ${context.candidate.role} ha avanzado al estatus '${context.candidate.stage}'. Atentamente, Heavenly Dreams Team.`,
              sender: "me",
              status: "sent",
              createdAt: Date.now()
            });
          }

          if (action === "create_notification" && context.candidate) {
            const newNotRef = doc(collection(db, "notifications"));
            await setDoc(newNotRef, {
              id: newNotRef.id,
              title: "Automatización ejecutada",
              message: `${context.candidate.name} cambió a la etapa: ${context.candidate.stage}`,
              type: "info",
              read: false,
              candidateId: context.candidate.id,
              createdAt: Date.now()
            });
          }

          if (action === "assign_agent" && context.candidate) {
            const agentToAssign = context.candidate.stage === "Cita agendada" ? "agent-2" : "agent-1";
            await updateCandidate(context.candidate.id, { assignedAgentId: agentToAssign });
          }
        }
      }
    } catch (err) {
      console.error("Error running automation:", err);
    }
  }, [automations]);

  // AI Agent Conversation Engine Dialog Triggers
  const triggerAgentDialogue = useCallback(async (candidateId: string, agentId: string, customInstruction?: string) => {
    try {
      const activeCand = candidates.find(c => c.id === candidateId);
      const activeAgent = agents.find(a => a.id === agentId);
      const candMessages = messages.filter(m => m.candidateId === candidateId);

      if (!activeCand) return;
      
      const agentPrompt = activeAgent?.basePrompt || "Eres un asistente virtual de reclutamiento. Responde con datos verificados del proceso y escala a una persona cuando falte información.";
      
      // Post to our secure full-stack backend
      const res = await fetch(apiUrl("/api/gemini/reply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: activeCand,
          agentPrompt: agentPrompt,
          history: candMessages,
          customUserPrompt: customInstruction || "Continúa la conversación de manera natural."
        })
      });

      const data = await readApiJson(res);
      const replyPayload = data?.data || data;
      if (replyPayload?.reply) {
        // Save the outbound AI response as a WhatsApp message in Firestore
        const newMsgRef = doc(collection(db, "messages"));
        await setDoc(newMsgRef, {
          id: newMsgRef.id,
          candidateId: candidateId,
          channel: "whatsapp",
          direction: "outbound",
          body: replyPayload.reply,
          sender: "me",
          status: "sent",
          createdAt: Date.now() + 100 // tiny delay
        });

        // Trigger in-app notification of the reply
        const notRef = doc(collection(db, "notifications"));
        await setDoc(notRef, {
          id: notRef.id,
          title: `Agente ${activeAgent?.name || "IA"} respondió`,
          message: `Mensaje enviado a ${activeCand.name}`,
          type: "success",
          read: false,
          candidateId: candidateId,
          createdAt: Date.now()
        });

        // Advance the stage when the AI response clearly confirms scheduling intent.
        const replyLower = replyPayload.reply.toLowerCase();
        if (replyLower.includes("entrevista") || replyLower.includes("agenda") || replyLower.includes("coordinada")) {
          if (activeCand.stage === "Nuevo" || activeCand.stage === "Contactado") {
            await updateCandidate(candidateId, { stage: "Cita agendada" });
          }
        }
      }
    } catch (err) {
      console.error("Dialogue service failed: ", err);
    }
  }, [candidates, agents, messages]);

  // --- CRUD FUNCTIONS ---

  // Candidates CRUD
  const addCandidate = async (candData: Omit<Candidate, "id" | "createdAt" | "updatedAt">) => {
    requireAuthenticatedUser();
    const id = "cand-" + Date.now();
    const candidate: Candidate = {
      ...candData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "candidates", id), candidate);
    
    // Trigger Automation
    await runAutomationsForEvent("candidate.created", { candidate });
    
    // Also add an automated notification
    const newNotRef = doc(collection(db, "notifications"));
    await setDoc(newNotRef, {
      id: newNotRef.id,
      title: "Nuevo Candidato",
      message: `${candidate.name} ingresado vía ${candidate.source}`,
      type: "success",
      read: false,
      candidateId: id,
      createdAt: Date.now()
    });
  };

  const updateCandidate = async (id: string, candData: Partial<Candidate>) => {
    requireAuthenticatedUser();
    const prevCandidate = candidates.find(c => c.id === id);
    const updated: Partial<Candidate> = {
      ...candData,
      updatedAt: Date.now()
    };

    await updateDoc(doc(db, "candidates", id), updated);
    
    // Trigger Automation if stage changed
    if (candData.stage && prevCandidate && prevCandidate.stage !== candData.stage) {
      const fullCand = { ...prevCandidate, ...updated } as Candidate;
      await runAutomationsForEvent("candidate.stage_changed", { candidate: fullCand });
    }
  };

  const deleteCandidate = async (id: string) => {
    requireAuthenticatedUser();
    await deleteDoc(doc(db, "candidates", id));
  };

  // Jobs CRUD
  const addJob = async (jobData: Omit<Job, "id" | "applicants" | "platforms" | "createdAt" | "updatedAt">) => {
    requireAuthenticatedUser();
    const id = "job-" + Date.now();
    const job: Job = {
      ...jobData,
      id,
      applicants: 0,
      platforms: ["LinkedIn", "WhatsApp"],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "jobs", id), job);
  };

  const updateJob = async (id: string, jobData: Partial<Job>) => {
    requireAuthenticatedUser();
    await updateDoc(doc(db, "jobs", id), {
      ...jobData,
      updatedAt: Date.now()
    });
  };

  const deleteJob = async (id: string) => {
    requireAuthenticatedUser();
    await deleteDoc(doc(db, "jobs", id));
  };

  // Appointments CRUD
  const addAppointment = async (apptData: Omit<Appointment, "id" | "createdAt">) => {
    requireAuthenticatedUser();
    const id = "appt-" + Date.now();
    const appt: Appointment = {
      ...apptData,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "appointments", id), appt);
    
    // Update candidate stage to "Cita agendada"
    await updateCandidate(apptData.candidateId, { stage: "Cita agendada" });

    // Inform automations
    await runAutomationsForEvent("appointment.created", { appointment: appt });
    
    // Register an outbound confirmation message for the selected channel.
    const msgBody = `Hola ${apptData.candidateName}, confirmamos tu entrevista el día ${apptData.date} a las ${apptData.time}. Por favor responde CONFIRMO para registrar tu asistencia.`;
    await addMessage({
      candidateId: apptData.candidateId,
      channel: "whatsapp",
      direction: "outbound",
      body: msgBody,
      sender: "me",
      status: "sent"
    });
  };

  const updateAppointment = async (id: string, apptData: Partial<Appointment>) => {
    requireAuthenticatedUser();
    const prevAppointment = appointments.find(a => a.id === id);
    await updateDoc(doc(db, "appointments", id), apptData);

    const fullAppt = prevAppointment ? { ...prevAppointment, ...apptData } as Appointment : null;
    if (fullAppt) {
      if (apptData.status === "confirmed") {
        await updateCandidate(fullAppt.candidateId, { stage: "Confirmó asistencia" });
        await runAutomationsForEvent("appointment.confirmed", { appointment: fullAppt });
      } else if (apptData.status === "no_show") {
        await updateCandidate(fullAppt.candidateId, { stage: "No asistió" });
        await runAutomationsForEvent("appointment.missed", { appointment: fullAppt });
        
        // Auto follow-up WhatsApp for no show
        await addMessage({
          candidateId: fullAppt.candidateId,
          channel: "whatsapp",
          direction: "outbound",
          body: `Hola ${fullAppt.candidateName}, notamos que no pudiste asistir a nuestra entrevista pactada para hoy. ¿Te gustaría que busquemos otra fecha para reagendar?`,
          sender: "me",
          status: "sent"
        });
      }
    }
  };

  const deleteAppointment = async (id: string) => {
    requireAuthenticatedUser();
    await deleteDoc(doc(db, "appointments", id));
  };

  // Messages CRUD
  const transcribeInboundAudioMessage = async (
    audioBase64: string,
    audioMimeType: string | undefined,
    candidate?: Candidate,
    agent?: Agent
  ) => {
    const res = await fetch(apiUrl("/api/gemini/audio/transcribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        mimeType: audioMimeType || "audio/mpeg",
        language: agent?.audioLanguage || "es-MX",
        context: candidate
          ? `Candidato: ${candidate.name}. Puesto: ${candidate.role}. Canal de reclutamiento: ${candidate.source}.`
          : "Audio entrante de un candidato de reclutamiento.",
      }),
    });

    const data = await readApiJson(res);
    const payload = data?.data || data;

    if (!res.ok || !payload?.transcription) {
      throw new Error(payload?.error || data?.error || "No se pudo transcribir el audio.");
    }

    return payload.transcription as string;
  };

  const addMessage = async (msgData: Omit<Message, "id" | "createdAt">) => {
    requireAuthenticatedUser();
    const id = "msg-" + Date.now();
    const activeCand = candidates.find(c => c.id === msgData.candidateId);
    const assignedAgentId = activeCand?.assignedAgentId || "agent-1";
    const activeAgent = agents.find(a => a.id === assignedAgentId);

    let processedMsgData = { ...msgData };

    if (
      msgData.direction === "inbound" &&
      msgData.attachmentType === "audio" &&
      msgData.audioBase64 &&
      (activeAgent?.transcribeAudio ?? true)
    ) {
      try {
        const transcription = await transcribeInboundAudioMessage(
          msgData.audioBase64,
          msgData.audioMimeType,
          activeCand,
          activeAgent
        );

        processedMsgData = {
          ...processedMsgData,
          transcription,
          transcriptionStatus: "completed",
          body: transcription ? `[Audio transcrito] ${transcription}` : msgData.body,
        };
      } catch (error) {
        processedMsgData = {
          ...processedMsgData,
          transcriptionStatus: "failed",
          body: msgData.body || "[Audio recibido: transcripción pendiente]",
        };
        console.error("Error transcribing inbound audio:", error);
      }
    }

    const msg: Message = {
      ...processedMsgData,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "messages", id), msg);

    // If inbound message, we trigger automations and allow assigned AI agent to respond automatically! (Phase 8 & 9)
    if (processedMsgData.direction === "inbound") {
      // Check if message says "CONFIRMO" for appointment
      if (processedMsgData.body.toUpperCase().includes("CONFIRMO")) {
        const appt = appointments.find(a => a.candidateId === processedMsgData.candidateId && a.status === "scheduled");
        if (appt) {
          await updateAppointment(appt.id, { status: "confirmed" });
        }
      }

      if (processedMsgData.attachmentType !== "audio" || (activeAgent?.audioAutoReply ?? true)) {
        const agentInstruction = processedMsgData.transcription
          ? `El candidato envió un audio. Transcripción: "${processedMsgData.transcription}". Responde de forma natural, breve y útil.`
          : processedMsgData.body;

        // Prompt Gemini to produce response
        setTimeout(() => {
          triggerAgentDialogue(processedMsgData.candidateId, assignedAgentId, agentInstruction);
        }, 1000);
      }
    }
  };

  // Automations CRUD
  const addAutomation = async (autoData: Omit<Automation, "id">) => {
    requireAuthenticatedUser();
    const id = "auto-" + Date.now();
    const auto: Automation = { ...autoData, id };
    await setDoc(doc(db, "automations", id), auto);
  };

  const updateAutomation = async (id: string, autoData: Partial<Automation>) => {
    requireAuthenticatedUser();
    await updateDoc(doc(db, "automations", id), autoData);
  };

  const deleteAutomation = async (id: string) => {
    requireAuthenticatedUser();
    await deleteDoc(doc(db, "automations", id));
  };

  // Notifications CRUD
  const addNotification = async (notData: Omit<Notification, "id" | "createdAt">) => {
    requireAuthenticatedUser();
    const id = "not-" + Date.now();
    const notification: Notification = {
      ...notData,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "notifications", id), notification);
  };

  const markNotificationRead = async (id: string) => {
    requireAuthenticatedUser();
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  // Agents CRUD
  const addAgent = async (agentData: Omit<Agent, "id" | "userId" | "createdAt">) => {
    const currentUser = requireAuthenticatedUser();
    const id = "agent-" + Date.now();
    const agent: Agent = {
      ...agentData,
      id,
      userId: currentUser.uid,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "agents", id), agent);
  };

  const updateAgent = async (id: string, agentData: Partial<Agent>) => {
    requireAuthenticatedUser();
    await updateDoc(doc(db, "agents", id), agentData);
  };

  const deleteAgent = async (id: string) => {
    requireAuthenticatedUser();
    await deleteDoc(doc(db, "agents", id));
  };

  return {
    candidates,
    jobs,
    appointments,
    messages,
    automations,
    notifications,
    agents,
    loading,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addJob,
    updateJob,
    deleteJob,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addMessage,
    addAutomation,
    updateAutomation,
    deleteAutomation,
    addNotification,
    markNotificationRead,
    addAgent,
    updateAgent,
    deleteAgent,
    triggerAgentDialogue
  };
}
