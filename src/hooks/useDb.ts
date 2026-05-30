import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  Candidate,
  Job,
  Appointment,
  Message,
  Automation,
  Notification,
  Agent
} from "@/services/db";

export function useDb() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all collections reactive
  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, "candidates"), (snapshot) => {
      const list: Candidate[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Candidate);
      });
      setCandidates(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "candidates");
    });

    const unsubJobs = onSnapshot(collection(db, "jobs"), (snapshot) => {
      const list: Job[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Job);
      });
      setJobs(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "jobs");
    });

    const unsubAppointments = onSnapshot(collection(db, "appointments"), (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });

    const unsubMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Message);
      });
      // Sort messages ascending by time for chat timelines
      list.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "messages");
    });

    const unsubAutomations = onSnapshot(collection(db, "automations"), (snapshot) => {
      const list: Automation[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Automation);
      });
      setAutomations(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "automations");
    });

    const unsubNotifications = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Notification);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications");
    });

    const unsubAgents = onSnapshot(collection(db, "agents"), (snapshot) => {
      const list: Agent[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Agent);
      });
      setAgents(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "agents");
    });

    return () => {
      unsubCandidates();
      unsubJobs();
      unsubAppointments();
      unsubMessages();
      unsubAutomations();
      unsubNotifications();
      unsubAgents();
    };
  }, []);

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
            const defaultGreeting = `Hola ${context.candidate.name}, te habla Atenea, asistente de Heavenly Dreams. Registramos tu interés para la vacante de ${context.candidate.role}. ¿Te gustaría detalles sobre nuestra capacitación u horarios de entrevistas?`;
            
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

            // Auto prompt AI agent Atenea to answer
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
            // Auto assign agent to candidate (Atenea for early stages, Hermes for scheduling)
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
      
      const agentPrompt = activeAgent?.basePrompt || "Eres un reclutador virtual de Heavenly Dreams.";
      
      // Post to our secure full-stack backend
      const res = await fetch("/api/gemini/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: activeCand,
          agentPrompt: agentPrompt,
          history: candMessages,
          customUserPrompt: customInstruction || "Continúa la conversación de manera natural."
        })
      });

      const data = await res.json();
      if (data.reply) {
        // Save the outbound AI response as a WhatsApp message in Firestore
        const newMsgRef = doc(collection(db, "messages"));
        await setDoc(newMsgRef, {
          id: newMsgRef.id,
          candidateId: candidateId,
          channel: "whatsapp",
          direction: "outbound",
          body: data.reply,
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

        // Simular un cambio de etapa si el agente detecta agendamientos
        const replyLower = data.reply.toLowerCase();
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
    await deleteDoc(doc(db, "candidates", id));
  };

  // Jobs CRUD
  const addJob = async (jobData: Omit<Job, "id" | "applicants" | "platforms" | "createdAt" | "updatedAt">) => {
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
    await updateDoc(doc(db, "jobs", id), {
      ...jobData,
      updatedAt: Date.now()
    });
  };

  const deleteJob = async (id: string) => {
    await deleteDoc(doc(db, "jobs", id));
  };

  // Appointments CRUD
  const addAppointment = async (apptData: Omit<Appointment, "id" | "createdAt">) => {
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
    
    // Send a WhatsApp template simulation
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
    await deleteDoc(doc(db, "appointments", id));
  };

  // Messages CRUD
  const addMessage = async (msgData: Omit<Message, "id" | "createdAt">) => {
    const id = "msg-" + Date.now();
    const msg: Message = {
      ...msgData,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "messages", id), msg);

    // If inbound message, we trigger automations and allow assigned AI agent to respond automatically! (Phase 8 & 9)
    if (msgData.direction === "inbound") {
      const activeCand = candidates.find(c => c.id === msgData.candidateId);
      
      // Auto reply with active agent
      const assignedAgentId = activeCand?.assignedAgentId || "agent-1"; 
      
      // Check if message says "CONFIRMO" for appointment
      if (msgData.body.toUpperCase().includes("CONFIRMO")) {
        const appt = appointments.find(a => a.candidateId === msgData.candidateId && a.status === "scheduled");
        if (appt) {
          await updateAppointment(appt.id, { status: "confirmed" });
        }
      }

      // Prompt Gemini to produce response
      setTimeout(() => {
        triggerAgentDialogue(msgData.candidateId, assignedAgentId, msgData.body);
      }, 1000);
    }
  };

  // Automations CRUD
  const addAutomation = async (autoData: Omit<Automation, "id">) => {
    const id = "auto-" + Date.now();
    const auto: Automation = { ...autoData, id };
    await setDoc(doc(db, "automations", id), auto);
  };

  const updateAutomation = async (id: string, autoData: Partial<Automation>) => {
    await updateDoc(doc(db, "automations", id), autoData);
  };

  const deleteAutomation = async (id: string) => {
    await deleteDoc(doc(db, "automations", id));
  };

  // Notifications CRUD
  const addNotification = async (notData: Omit<Notification, "id" | "createdAt">) => {
    const id = "not-" + Date.now();
    const notification: Notification = {
      ...notData,
      id,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "notifications", id), notification);
  };

  const markNotificationRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  // Agents CRUD
  const addAgent = async (agentData: Omit<Agent, "id" | "userId" | "createdAt">) => {
    const id = "agent-" + Date.now();
    const currentUserId = auth.currentUser?.uid || "shared";
    const agent: Agent = {
      ...agentData,
      id,
      userId: currentUserId,
      createdAt: Date.now()
    };
    await setDoc(doc(db, "agents", id), agent);
  };

  const updateAgent = async (id: string, agentData: Partial<Agent>) => {
    await updateDoc(doc(db, "agents", id), agentData);
  };

  const deleteAgent = async (id: string) => {
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
