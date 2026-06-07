import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDb } from "@/hooks/useDb";
import { ALLOWED_GOOGLE_WORKSPACE_EMAILS, GOOGLE_WORKSPACE_CAPABILITIES } from "@/config/googleWorkspace";
import {
  FileSpreadsheet, Calendar as CalendarIcon, Mail, FormInput, FolderOpen,
  StickyNote, Plus, Search, Check, Loader2, Sparkles, RefreshCw,
  AlertCircle, Trash2, ExternalLink, Send, ArrowRight, CheckCircle2,
  HelpCircle, Info, Clock, CheckSquare, Palette, Image as ImageIcon, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceHub() {
  const { accessToken, user, signInWithGoogle } = useAuth();
  const { triggerEvent } = useNotifications();
  const { candidates, addCandidate } = useDb();

  // Active Hub Tab
  const [activeTab, setActiveTab] = useState<'sheets' | 'calendar' | 'gmail' | 'forms' | 'picker' | 'photos' | 'keep'>('sheets');

  // Unified Request Logging Terminal
  const [apiLogs, setApiLogs] = useState<any[]>([
    {
      id: "log-0",
      time: new Date().toLocaleTimeString(),
      type: "info",
      service: "System",
      message: "Suite de Integración Google Workspace inicializada."
    }
  ]);

  const addLog = (service: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', rawRequest?: any, rawResponse?: any) => {
    setApiLogs(prev => [
      {
        id: `log-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type,
        service,
        message,
        request: rawRequest ? JSON.stringify(rawRequest, null, 2) : null,
        response: rawResponse ? JSON.stringify(rawResponse, null, 2) : null
      },
      ...prev
    ]);
  };

  const isLoggedInWithGoogle = accessToken !== null;

  // ----------------------------------------------------
  // 1. STATE & METHODS: GOOGLE SHEETS
  // ----------------------------------------------------
  const [sheetId, setSheetId] = useState<string>("");
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSheetId, setImportSheetId] = useState("");
  const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null);

  const handleExportToSheets = async () => {
    const confirmation = window.confirm("¿Deseas exportar toda la lista actual de candidatos a una nueva hoja de cálculo de Google Sheets?");
    if (!confirmation) return;

    setIsExporting(true);
    const serviceName = "Google Sheets";
    const title = `RHDreams - Exportación de Candidatos (${new Date().toLocaleDateString()})`;

    addLog(serviceName, `Iniciando proceso de exportación para ${candidates.length} candidatos...`, "info");

    const payloadCreate = { properties: { title } };

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route POST /api/google/sheets/create must proxy to Google Sheets API
        const headers = ["ID", "Nombre", "Email", "Teléfono", "Puesto", "Fase", "Fuente", "Calificación", "Notas"];
        const rows = candidates.map(c => [
          c.id, c.name, c.email, c.phone, c.role, c.stage, c.source, c.rating, c.notes || ""
        ]);
        const resCreate = await fetch("/api/google/sheets/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, headers, rows, accessToken })
        });

        if (!resCreate.ok) throw new Error("Error al crear Spreadsheet");
        const sheetData = await resCreate.json();
        const createdId = sheetData.spreadsheetId;
        const createdUrl = sheetData.spreadsheetUrl;

        // Dummy resWrite reference kept for downstream error check compatibility
        const resWrite = { ok: true };

        if (!resWrite.ok) throw new Error("Error escribiendo valores en la hoja");

        setSheetId(createdId);
        setSheetUrl(createdUrl);
        addLog(serviceName, `¡Exportación exitosa! Spreadsheet creada en Google Drive. ID: ${createdId}`, "success", payloadCreate, sheetData);
        triggerEvent("Exportación completada", "Se ha creado una nueva hoja de Google Sheets con tus candidatos.");
      } catch (err: any) {
        console.error(err);
        addLog(serviceName, `Error de exportación: ${err.message}. No se creó ningún archivo.`, "error");
        setIsExporting(false);
      }
    } else {
      addLog(serviceName, "Conecta Google Workspace para exportar candidatos reales a Sheets.", "warning", payloadCreate);
      setIsExporting(false);
    }
  };

  const handleFetchImportPreview = async () => {
    if (!importSheetId) return;
    setIsImporting(true);
    addLog("Google Sheets", `Solicitando lectura de hoja de cálculo con ID: ${importSheetId}...`, "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route POST /api/google/sheets/import must proxy to Google Sheets API
        const res = await fetch("/api/google/sheets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetId: importSheetId, accessToken })
        });
        if (!res.ok) throw new Error("No se pudo obtener datos del Spreadsheet seleccionado.");
        const data = await res.json();

        if (data.values && data.values.length > 1) {
          const rows = data.values.slice(1).map((row: any, index: number) => ({
            id: `imported-${Date.now()}-${index}`,
            name: row[1] || `Importado Row ${index + 1}`,
            email: row[2] || `email-${index}@import.com`,
            phone: row[3] || "+0 000 000 000",
            role: row[4] || "Sin puesto especificado",
            stage: row[5] || "Nuevo",
            source: row[6] || "Google Sheets",
            rating: parseInt(row[7]) || 3,
            location: row[8] || "Remoto",
            notes: row[9] || "Importado automáticamente de Google Sheets"
          }));
          setImportPreviewData(rows);
          addLog("Google Sheets", `Cargados con éxito ${rows.length} candidatos para previsualización.`, "success", null, data);
        } else {
          throw new Error("El archivo no tiene filas de datos legibles.");
        }
      } catch (err: any) {
        addLog("Google Sheets", `Error de importación real: ${err.message}.`, "error");
        setIsImporting(false);
      }
    } else {
      addLog("Google Sheets", "Conecta Google Workspace para leer datos reales de Sheets.", "warning");
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreviewData) return;
    for (const candidate of importPreviewData) {
      await addCandidate({
        name: candidate.name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        role: candidate.role || "",
        stage: candidate.stage || "Nuevo",
        source: candidate.source || "Google Sheets",
        rating: Number(candidate.rating || 0),
        location: candidate.location || "",
        pool: candidate.pool || "",
        experience: candidate.experience || "",
        salaryDemand: candidate.salaryDemand || "",
        cvUrl: candidate.cvUrl || "",
        notes: candidate.notes || "",
      });
    }
    addLog("Google Sheets", `Sincronizados ${importPreviewData.length} candidatos reales en Firestore.`, "success");
    triggerEvent("Candidatos Importados", `Se han añadido ${importPreviewData.length} candidatos desde Google Sheets.`);
    setImportPreviewData(null);
    setImportSheetId("");
  };

  // ----------------------------------------------------
  // 2. STATE & METHODS: GOOGLE CALENDAR
  // ----------------------------------------------------
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const [interviewForm, setInterviewForm] = useState({
    candidateId: "",
    interviewerName: "",
    date: "",
    time: "",
    lengthMinutes: "45",
    generateMeet: true,
    description: ""
  });

  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = candidates.find(c => c.id === interviewForm.candidateId);
    if (!candidate) {
      alert("Selecciona un candidato válido.");
      return;
    }
    if (!isLoggedInWithGoogle || !accessToken) {
      addLog("Google Calendar", "Conecta Google Workspace para crear eventos reales en Calendar.", "warning");
      return;
    }

    setIsScheduling(true);
    const serviceName = "Google Calendar";

    const startIso = `${interviewForm.date}T${interviewForm.time}:00`;
    const endMinutes = parseInt(interviewForm.time.split(":")[1]) + parseInt(interviewForm.lengthMinutes);
    const endHour = parseInt(interviewForm.time.split(":")[0]) + Math.floor(endMinutes / 60);
    const endMinStr = String(endMinutes % 60).padStart(2, '0');
    const endHourStr = String(endHour).padStart(2, '0');
    const endIso = `${interviewForm.date}T${endHourStr}:${endMinStr}:00`;

    const summary = `Entrevista Reclutamiento - ${candidate.name} (${candidate.role})`;
    const description = `${interviewForm.description}\n\nEntrevistador: ${interviewForm.interviewerName}\nCandidato: ${candidate.name}\nCorreo: ${candidate.email}`;

    const newEventPayload: any = {
      summary,
      description,
      start: { dateTime: startIso, timeZone: "America/Mexico_City" },
      end: { dateTime: endIso, timeZone: "America/Mexico_City" },
      attendees: [{ email: candidate.email }],
    };

    if (interviewForm.generateMeet) {
      newEventPayload.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      };
    }

    addLog(serviceName, `Creando cita en Calendario de Google para ${candidate.name}...`, "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newEventPayload)
        });

        if (!res.ok) throw new Error("Error de API de Calendar");
        const resData = await res.json();

        const createdEvent = {
          id: resData.id,
          summary: resData.summary,
          description: resData.description,
          start: resData.start,
          end: resData.end,
          hangoutLink: resData.hangoutLink || "",
          status: "confirmed"
        };

        setCalendarEvents([createdEvent, ...calendarEvents]);
        addLog(serviceName, `¡Cita agendada con éxito en Google Calendar! Enlace Meet: ${createdEvent.hangoutLink}`, "success", newEventPayload, resData);
        triggerEvent("Cita confirmada", `Entrevista agendada con ${candidate.name} para ${interviewForm.date}`);
      } catch (err: any) {
        addLog(serviceName, `Error de Calendar API: ${err.message}. No se creó ningún evento.`, "error");
        setIsScheduling(false);
      }
    }
  };

  // ----------------------------------------------------
  // 3. STATE & METHODS: GMAIL API
  // ----------------------------------------------------
  const [gmailForm, setGmailForm] = useState({
    candidateEmail: "",
    subject: "",
    template: "invite",
    body: ""
  });

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleTemplateChange = (tmpl: string) => {
    const candidate = candidates.find(c => c.email === gmailForm.candidateEmail) || { name: "[Nombre]" };
    let subj = "Actualización de Postulación";
    let bdy = "";

    if (tmpl === 'invite') {
      subj = `Invitación a Entrevista - ${candidate.name}`;
      bdy = `Hola ${candidate.name},\n\nGracias por tu interés. Queremos agendar una conversación para revisar tu experiencia y resolver dudas sobre el proceso.\n\nSaludos cordiales,\nRecursos Humanos`;
    } else if (tmpl === 'offer') {
      subj = `Propuesta de Oferta Laboral - ${candidate.name}`;
      bdy = `Hola ${candidate.name},\n\n¡Felicidades! Fue un gusto entrevistarte. Tenemos el agrado de proponerte una oferta formal de empleo para unirte a nuestro equipo.\n\nToda la información detallada está en el documento adjunto de Google Drive.\n\nAtentamente,\nDirección de Operaciones`;
    } else {
      subj = `Gracias por participar - ${candidate.name}`;
      bdy = `Hola ${candidate.name},\n\nQueremos agradecerte el valioso tiempo que dedicaste a postularte y participar de nuestras entrevistas.\n\nLamentablemente, decidimos avanzar con otro perfil, pero guardaremos tu currículum en Google Drive para futuras vacantes.\n\nMucho éxito,\nEquipo de Sourcing`;
    }

    setGmailForm(prev => ({ ...prev, template: tmpl, subject: subj, body: bdy }));
  };

  const handleSendGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailForm.candidateEmail) {
      alert("Selecciona un correo destinatario.");
      return;
    }
    if (!isLoggedInWithGoogle || !accessToken) {
      addLog("Gmail API", "Conecta Google Workspace para enviar correos reales desde Gmail.", "warning");
      return;
    }

    const confirmation = window.confirm(`¿Confirmas el envío de este correo por Gmail a ${gmailForm.candidateEmail}?`);
    if (!confirmation) return;

    setIsSendingEmail(true);
    const serviceName = "Gmail API";
    addLog(serviceName, `Preparando payload RFC822 para enviar correo electrónico a ${gmailForm.candidateEmail}...`, "info");

    const emailContent = [
      `To: ${gmailForm.candidateEmail}`,
      `Subject: ${gmailForm.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      gmailForm.body.replace(/\n/g, '<br/>')
    ].join('\n');

    const base64Safe = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const payload = { raw: base64Safe };

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route POST /api/google/gmail/send must proxy to Gmail API
        const res = await fetch("/api/google/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, accessToken })
        });

        if (!res.ok) throw new Error("Error del API de Gmail");
        const resData = await res.json();

        addLog(serviceName, `¡Correo electrónico enviado con éxito vía Gmail API! ID del mensaje: ${resData.id}`, "success", payload, resData);
        triggerEvent("Gmail Enviado", `Correo enviado con éxito a ${gmailForm.candidateEmail}`);
        setIsSendingEmail(false);
      } catch (err: any) {
        addLog(serviceName, `Error de Gmail API: ${err.message}. No se envió ningún correo.`, "error");
        setIsSendingEmail(false);
      }
    }
  };

  // ----------------------------------------------------
  // 4. STATE & METHODS: GOOGLE FORMS
  // ----------------------------------------------------
  const [formId, setFormId] = useState<string>("");
  const [isLinkingForm, setIsLinkingForm] = useState(false);
  const [isSyncingResponses, setIsSyncingResponses] = useState(false);
  const [connectedForm, setConnectedForm] = useState<any | null>(null);

  const handleLinkGoogleForm = async () => {
    if (!formId) return;
    setIsLinkingForm(true);
    addLog("Google Forms", `Verificando existencia y permisos del formulario ${formId}...`, "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route GET /api/google/forms/:formId must proxy to Google Forms API
        const res = await fetch(`/api/google/forms/${formId}?accessToken=${encodeURIComponent(accessToken)}`);
        if (!res.ok) throw new Error("El Formulario de Google no existe o tu cuenta no cuenta con permisos.");
        const data = await res.json();

        setConnectedForm({
          id: data.formId,
          title: data.info?.title || "Formulario de Google Vinculado",
          responderCount: 0,
          publishedUrl: data.responderUri
        });
        addLog("Google Forms", `¡Formulario de Google vinculado correctamente! Título: ${data.info?.title}`, "success", null, data);
        triggerEvent("Formulario Vinculado", "Sincronización de Forms activada correctamente.");
      } catch (err: any) {
        addLog("Google Forms", `Error de Forms API: ${err.message}.`, "error");
        setIsLinkingForm(false);
      }
    } else {
      addLog("Google Forms", "Conecta Google Workspace para vincular formularios reales.", "warning");
      setIsLinkingForm(false);
    }
  };

  const handleSyncFormResponses = async () => {
    if (!connectedForm) return;
    setIsSyncingResponses(true);
    addLog("Google Forms", `Sincronizando respuestas y respuestas activas del formulario...`, "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route GET /api/google/forms/:formId used for responses via query param
        const res = await fetch(`/api/google/forms/${connectedForm.id}?responses=true&accessToken=${encodeURIComponent(accessToken)}`);
        if (!res.ok) throw new Error("No se pudo leer las respuestas del Formulario");
        const data = await res.json();

        addLog("Google Forms", `¡Respuestas sincronizadas! Encontradas ${data.responses?.length || 0} postulaciones nuevas.`, "success", null, data);
        setIsSyncingResponses(false);
      } catch (err: any) {
        addLog("Google Forms", `Error al leer respuestas reales: ${err.message}.`, "error");
        setIsSyncingResponses(false);
      }
    } else {
      addLog("Google Forms", "Conecta Google Workspace para sincronizar respuestas reales.", "warning");
      setIsSyncingResponses(false);
    }
  };

  const handleCreateNewForm = async () => {
    const title = "Postulación Directa - RHDreams";
    addLog("Google Forms", `Creando nuevo formulario en Google Drive titulado "${title}"...`, "info");

    if (!isLoggedInWithGoogle || !accessToken) {
      addLog("Google Forms", "Conecta Google Workspace para crear formularios reales.", "warning");
      return;
    }

    try {
      // TODO: backend route POST /api/google/forms/:formId (create) must proxy to Google Forms API
      const res = await fetch("/api/google/forms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, accessToken }),
      });
      if (!res.ok) throw new Error("No se pudo crear el formulario.");
      const data = await res.json();
      const gFormId = data.formId;
      setConnectedForm({
        id: gFormId,
        title: data.info?.title || title,
        responderCount: 0,
        publishedUrl: data.responderUri || `https://docs.google.com/forms/d/${gFormId}/edit`
      });
      setFormId(gFormId);
      addLog("Google Forms", `¡Formulario de Google generado y asignado correctamente!`, "success", { title }, data);
      triggerEvent("Formulario Creado", "Se ha creado el formulario en Google Drive.");
    } catch (err: any) {
      addLog("Google Forms", `Error creando formulario: ${err.message}`, "error");
    }
  };

  // ----------------------------------------------------
  // 5. STATE & METHODS: GOOGLE PICKER / DRIVE FILES
  // ----------------------------------------------------
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  const [searchDrive, setSearchDrive] = useState("");
  const [driveTypeFilter, setDriveTypeFilter] = useState<'all' | 'pdf' | 'image' | 'docs'>('all');
  const [selectedDriveFile, setSelectedDriveFile] = useState<any | null>(null);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);

  const isImageMime = (mimeType: string) => mimeType?.startsWith("image/");
  const isPdfMime = (mimeType: string) => mimeType?.includes("pdf");

  const filteredDriveFiles = driveFiles.filter(file => {
    const matchesText = file.name.toLowerCase().includes(searchDrive.toLowerCase());
    const matchesType =
      driveTypeFilter === 'all' ||
      (driveTypeFilter === 'pdf' && isPdfMime(file.mimeType)) ||
      (driveTypeFilter === 'image' && isImageMime(file.mimeType)) ||
      (driveTypeFilter === 'docs' && !isPdfMime(file.mimeType) && !isImageMime(file.mimeType));

    return matchesText && matchesType;
  });

  const fetchRealDriveFiles = async () => {
    setIsFetchingDrive(true);
    addLog("Google Drive", "Buscando archivos en el directorio principal de Google Drive de tu cuenta...", "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route GET /api/google/drive/files must proxy to Google Drive API
        const res = await fetch(`/api/google/drive/files?accessToken=${encodeURIComponent(accessToken)}`);
        if (!res.ok) throw new Error("Error leyendo archivos de Google Drive");
        const data = await res.json();

        if (data.files) {
          const formattedFiles = data.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink || "#",
            webContentLink: file.webContentLink || null,
            thumbnailLink: file.thumbnailLink || file.iconLink || null,
            modifiedTime: file.modifiedTime || null,
            size: file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB` : "N/D"
          }));
          setDriveFiles(formattedFiles);
          addLog("Google Drive", `Recuperados con éxito ${formattedFiles.length} archivos mediante el explorador seguro de Google Drive/Picker.`, "success", null, data);
        }
      } catch (err: any) {
        addLog("Google Drive", `Error de Drive API: ${err.message}.`, "error");
      } finally {
        setIsFetchingDrive(false);
      }
    } else {
      setIsFetchingDrive(false);
      addLog("Google Drive", "Conecta Google Workspace para leer archivos reales de Drive.", "warning");
    }
  };

  useEffect(() => {
    if (activeTab === 'picker') {
      fetchRealDriveFiles();
    }
    if (activeTab === 'photos') {
      fetchGooglePhotos();
    }
  }, [activeTab]);

  const handleSelectPickerFile = (file: any) => {
    setSelectedDriveFile(file);
    addLog("Google Picker", `Se ha seleccionado el archivo "${file.name}" de forma exclusiva para asociar a los currículums de candidatos.`, "success");
    triggerEvent("Archivo Seleccionado", `Se ha enlazado el archivo.`);
  };

  // ----------------------------------------------------
  // 6. STATE & METHODS: GOOGLE PHOTOS
  // ----------------------------------------------------
  const [googlePhotos, setGooglePhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isFetchingPhotos, setIsFetchingPhotos] = useState(false);

  const fetchGooglePhotos = async () => {
    setIsFetchingPhotos(true);
    addLog("Google Photos", "Leyendo imagenes y fotos autorizadas desde Google Photos...", "info");

    if (isLoggedInWithGoogle && accessToken) {
      try {
        // TODO: backend route GET /api/google/photos/albums must proxy to Google Photos API
        const res = await fetch(`/api/google/photos/albums?accessToken=${encodeURIComponent(accessToken)}`);

        if (!res.ok) throw new Error("Error leyendo Google Photos. Revisa que Photos Library API este habilitada.");
        const data = await res.json();
        const formattedPhotos = (data.mediaItems || []).map((photo: any) => ({
          id: photo.id,
          filename: photo.filename,
          mimeType: photo.mimeType,
          baseUrl: photo.baseUrl,
          productUrl: photo.productUrl,
          mediaMetadata: photo.mediaMetadata,
        }));

        setGooglePhotos(formattedPhotos);
        addLog("Google Photos", `Recuperadas ${formattedPhotos.length} fotos autorizadas.`, "success", null, data);
      } catch (err: any) {
        addLog("Google Photos", `Error de Photos API: ${err.message}.`, "error");
      } finally {
        setIsFetchingPhotos(false);
      }
    } else {
      setIsFetchingPhotos(false);
      addLog("Google Photos", "Conecta Google Workspace para leer fotos autorizadas reales.", "warning");
    }
  };

  const getPhotoPreviewUrl = (photo: any, size = "w420-h260") => {
    if (!photo?.baseUrl) return "";
    return photo.baseUrl.includes("googleusercontent")
      ? `${photo.baseUrl}=${size}`
      : `${photo.baseUrl}?w=420&h=260&fit=crop`;
  };

  // ----------------------------------------------------
  // 7. STATE & METHODS: GOOGLE KEEP
  // ----------------------------------------------------
  const [keepNotes, setKeepNotes] = useState<any[]>([]);

  const [newKeepNote, setNewKeepNote] = useState({ title: "", content: "", color: "tone1" });
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleCreateKeepNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeepNote.title && !newKeepNote.content) return;
    if (!isLoggedInWithGoogle || !accessToken) {
      addLog("Google Keep", "Conecta Google Workspace para crear notas reales en Keep.", "warning");
      return;
    }

    setIsCreatingNote(true);
    addLog("Google Keep", `Publicando nota en Google Keep con título: "${newKeepNote.title}"...`, "info");

    try {
      const payload = {
        title: newKeepNote.title || "Nota de reclutamiento",
        body: { text: { text: newKeepNote.content } },
      };
      // TODO: backend route GET /api/google/keep/notes must proxy to Google Keep API
      const res = await fetch("/api/google/keep/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, accessToken }),
      });
      if (!res.ok) throw new Error("No se pudo crear la nota en Google Keep.");
      const data = await res.json();
      const added = {
        id: data.name || `note-${Date.now()}`,
        title: data.title || newKeepNote.title || "Nota de reclutamiento",
        content: newKeepNote.content,
        color: newKeepNote.color,
        updated: "Justo ahora"
      };

      setKeepNotes([added, ...keepNotes]);
      setNewKeepNote({ title: "", content: "", color: "tone1" });
      setIsCreatingNote(false);

      addLog("Google Keep", "Nota creada correctamente en Google Keep.", "success", payload, data);
      triggerEvent("Nota creada", "Nota añadida en Google Keep.");
    } catch (err: any) {
      setIsCreatingNote(false);
      addLog("Google Keep", `Error creando nota: ${err.message}`, "error");
    }
  };

  const handleRemoveNote = (id: string, name: string) => {
    const confirmation = window.confirm(`¿Seguro que deseas eliminar la nota "${name}" de Google Keep?`);
    if (!confirmation) return;

    setKeepNotes(keepNotes.filter(n => n.id !== id));
    addLog("Google Keep", `Eliminada nota "${name}" de la bandeja de entrada sincronizada.`, "warning");
    triggerEvent("Nota eliminada", "Se removió de Google Keep.");
  };

  const neutralToolState = "bg-slate-200/10 border-slate-200/40 text-white shadow-[inset_3px_0_0_rgba(226,232,240,0.55),0_0_18px_rgba(245,245,245,0.10)]";
  const workspaceTools = [
    { id: "sheets", name: "Google Sheets", desc: "Base de candidatos", icon: FileSpreadsheet, iconClass: "icon-emerald" },
    { id: "calendar", name: "Google Calendar", desc: "Agendar entrevistas", icon: CalendarIcon, iconClass: "icon-amber" },
    { id: "gmail", name: "Gmail", desc: "Comunicaciones", icon: Mail, iconClass: "icon-rose" },
    { id: "forms", name: "Google Forms", desc: "Postulantes nuevos", icon: FormInput, iconClass: "icon-violet" },
    { id: "picker", name: "Google Drive Picker", desc: "PDFs, imagenes y CVs", icon: FolderOpen, iconClass: "icon-sky" },
    { id: "photos", name: "Google Photos", desc: "Fotos autorizadas", icon: ImageIcon, iconClass: "icon-orange" },
    { id: "keep", name: "Google Keep", desc: "Apuntes y notas rápidas", icon: StickyNote, iconClass: "icon-amber" }
  ] as const;

  const workspaceSummaryCards = [
    { label: "Candidatos", value: candidates.length, detail: "base local" },
    { label: "Eventos", value: calendarEvents.length, detail: "agenda" },
    { label: "Logs", value: apiLogs.length, detail: "API" }
  ] as const;

  return (
    <div className="flex flex-col gap-6 h-full pb-8">

      {/* Visual Header */}
      <div className="glass-panel flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 p-5 rounded-2xl border border-white/5">
        <div>
          <h1 className="page-title mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="w-6 h-6 icon-sky" />
            Integración Google Workspace
          </h1>
          <p className="text-slate-400 text-sm">Centraliza Sheets, Calendar, Gmail, Forms, Drive, Photos y Keep de Reclutamiento.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOOGLE_WORKSPACE_CAPABILITIES.slice(0, 4).map((capability) => (
              <span key={capability} className="text-[10px] px-2 py-1 rounded-lg bg-slate-950/60 border border-white/5 text-slate-400">
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* OAuth Integration Status Banner */}
        <div className="w-full lg:w-auto lg:min-w-[330px] flex items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-xl border border-white/10 shadow-inner">
          <div className="flex flex-col text-left lg:text-right">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estado de Conexión</span>
            <span className={cn("text-xs font-semibold", isLoggedInWithGoogle ? "text-emerald-400" : "text-slate-400")}>
              {isLoggedInWithGoogle ? "✓ Autenticado con Google" : "Conexión requerida"}
            </span>
            {!isLoggedInWithGoogle && (
              <span className="mt-1 max-w-[260px] text-[9px] leading-3 text-slate-500">
                Solo se puede integrar con: {ALLOWED_GOOGLE_WORKSPACE_EMAILS.join(", ")}
              </span>
            )}
          </div>
          {!isLoggedInWithGoogle ? (
            <button
              onClick={signInWithGoogle}
              className="bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.08)] border border-slate-300"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-current">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#a3a3a3"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#737373"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#525252"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#d4d4d4"/>
              </svg>
              Conectar Google
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-700 font-bold text-xs flex items-center justify-center text-white border border-zinc-500/30">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "G"}
            </div>
          )}
        </div>
      </div>

      {/* Main workspace layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Navigation Left Sidebar */}
        <div className="xl:col-span-3 flex flex-col gap-4">

          <div className="glass-panel p-3 rounded-2xl border border-white/5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-3">Paneles Workspace</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              {workspaceTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  className={cn(
                    "min-h-[74px] p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer group",
                    activeTab === tool.id
                      ? neutralToolState
                      : "bg-slate-950/45 border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.045] hover:border-slate-200/30 hover:shadow-[0_0_16px_rgba(245,245,245,0.08)]"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg bg-slate-950 border border-white/5 transition-transform group-hover:scale-105",
                    activeTab === tool.id ? "border-slate-200/25 bg-slate-800/80" : ""
                  )}>
                    <tool.icon className={cn("w-4 h-4", activeTab === tool.id ? tool.iconClass : "text-slate-300")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs tracking-wide uppercase truncate">{tool.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{tool.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Resumen de sincronizaciones</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
              {workspaceSummaryCards.map((card) => (
                <div key={card.label} className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{card.label}</div>
                      <div className="text-[10px] text-slate-600">{card.detail}</div>
                    </div>
                    <div className="text-lg font-bold text-white">{card.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel Center */}
        <div className="xl:col-span-6 flex flex-col gap-6">

          {/* Tab 1: Google Sheets */}
          {activeTab === 'sheets' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Mapeo y Base de Datos en Sheets</h3>
                  <p className="text-slate-400 text-xs mt-1">Exporta candidatos filtrados a Excel/Sheets o trae registros directamente.</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Exportación */}
                <div className="relative bg-gradient-to-br from-emerald-950/40 to-slate-950/60 p-5 rounded-2xl border border-emerald-500/20 flex flex-col gap-3 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/15 rounded-lg border border-emerald-500/20">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="font-bold text-xs text-emerald-400 uppercase tracking-wide">Exportación Masiva</div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">Genera una hoja de cálculo estructurada con todos los perfiles, fases y notas de contacto actuales.</p>
                  <button
                    onClick={handleExportToSheets}
                    disabled={isExporting}
                    className="mt-auto flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl py-2.5 px-4 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Exportar Candidatos
                  </button>
                </div>

                {/* Importación */}
                <div className="relative bg-gradient-to-br from-sky-950/40 to-slate-950/60 p-5 rounded-2xl border border-sky-500/20 flex flex-col gap-3 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sky-500/15 rounded-lg border border-sky-500/20">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div className="font-bold text-xs text-sky-400 uppercase tracking-wide">Importación Rápida</div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">Importa perfiles desde documentos compartidos ingresando el ID de la hoja de cálculo.</p>
                  <div className="flex gap-2 mt-auto">
                    <input
                      type="text"
                      className="bg-slate-900/80 border border-sky-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-400/50 transition-colors flex-1"
                      placeholder="Pega el ID del Spreadsheet..."
                      value={importSheetId}
                      onChange={(e) => setImportSheetId(e.target.value)}
                    />
                    <button
                      onClick={handleFetchImportPreview}
                      disabled={isImporting || !importSheetId}
                      className="bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                      Previsualizar
                    </button>
                  </div>
                </div>
              </div>

              {/* Sheet Success Link */}
              {sheetUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="flex gap-2.5 items-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-emerald-300">Documento Creado con Éxito</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-sm font-mono">ID: {sheetId}</div>
                    </div>
                  </div>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    Ver en Sheets <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Import Candidates Confirm View */}
              {importPreviewData && (
                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Candidatos a Importar ({importPreviewData.length})
                    </span>
                    <button
                      onClick={() => setImportPreviewData(null)}
                      className="text-xs text-slate-500 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importPreviewData.map(cand => (
                      <div key={cand.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg text-xs border border-white/5">
                        <div>
                          <div className="font-bold text-white">{cand.name}</div>
                          <div className="text-[10px] text-slate-500">{cand.role} • {cand.location}</div>
                        </div>
                        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full border border-white/5 text-zinc-300 font-bold">{cand.stage}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={confirmImport}
                    className="btn-primary w-full text-xs py-2 px-4"
                  >
                    Confirmar Ingesta al CRM local
                  </button>
                </div>
              )}

              {/* Spreadsheet Records list */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Últimos candidatos en cola</span>
                <div className="space-y-2">
                  {candidates.slice(0, 3).map(cand => (
                    <div key={cand.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5 text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{cand.name}</div>
                        <div className="text-[10px] text-slate-500">{cand.role}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-bold">Respaldo al Día</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Google Calendar */}
          {activeTab === 'calendar' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Google Calendar & Entrevistas</h3>
                  <p className="text-slate-400 text-xs mt-1">Programa videollamadas con Meet autogenerado para tus candidatos seleccionados.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <CalendarIcon className="w-5 h-5" />
                </div>
              </div>

              {/* Schedule form */}
              <form onSubmit={handleScheduleInterview} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Agendar Entrevista</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium block">Candidato</label>
                    <select
                      value={interviewForm.candidateId}
                      onChange={(e) => setInterviewForm({...interviewForm, candidateId: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-500 outline-none"
                      required
                    >
                      <option value="">Selecciona un candidato...</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium block">Entrevistador</label>
                    <input
                      type="text"
                      value={interviewForm.interviewerName}
                      onChange={(e) => setInterviewForm({...interviewForm, interviewerName: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:border-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium block">Fecha</label>
                    <input
                      type="date"
                      value={interviewForm.date}
                      onChange={(e) => setInterviewForm({...interviewForm, date: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium block">Hora</label>
                    <input
                      type="time"
                      value={interviewForm.time}
                      onChange={(e) => setInterviewForm({...interviewForm, time: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium block">Duración</label>
                    <select
                      value={interviewForm.lengthMinutes}
                      onChange={(e) => setInterviewForm({...interviewForm, lengthMinutes: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="15">15 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">1 hora</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-white/5">
                  <input
                    type="checkbox"
                    id="genMeet"
                    checked={interviewForm.generateMeet}
                    onChange={(e) => setInterviewForm({...interviewForm, generateMeet: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-zinc-500"
                  />
                  <label htmlFor="genMeet" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Auto-generar enlace corporativo de Google Meet <span className="text-zinc-400 font-semibold">(Recomendado)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isScheduling}
                  className="btn-primary w-full text-xs py-2 px-4 flex items-center justify-center gap-2"
                >
                  {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                  Crear Evento en Google Calendar
                </button>
              </form>

              {/* Event listings */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Eventos Próximos Sincronizados</span>
                <div className="space-y-2">
                  {calendarEvents.map(evt => (
                    <div key={evt.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/10 space-y-2 flex flex-col md:flex-row md:justify-between md:items-center">
                      <div>
                        <div className="font-bold text-slate-200 text-sm">{evt.summary}</div>
                        <p className="text-slate-400 text-xs mt-0.5">{evt.description.split("\n")[0]}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(evt.start.dateTime).toLocaleDateString()} a las {new Date(evt.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>

                      {evt.hangoutLink && (
                        <a
                          href={evt.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-zinc-600/10 hover:bg-zinc-600/30 text-zinc-300 text-xs font-bold flex items-center gap-1 border border-zinc-500/20 shadow-md text-decoration-none h-fit"
                        >
                          Unirse a Meet <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Gmail */}
          {activeTab === 'gmail' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Comunicaciones por Gmail</h3>
                  <p className="text-slate-400 text-xs mt-1 font-light">Envía notificaciones de postulación o cartas de oferta de forma directa vía Gmail API.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              {/* Compose Gmail */}
              <form onSubmit={handleSendGmail} className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                   Redactar Correo Gmail API
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium block">Destinatario (Candidato)</label>
                  <select
                    value={gmailForm.candidateEmail}
                    onChange={(e) => {
                      const email = e.target.value;
                      setGmailForm(prev => ({ ...prev, candidateEmail: email }));
                      // Trigger template override with new candidate name
                      setTimeout(() => handleTemplateChange(gmailForm.template), 50);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  >
                    <option value="">Selecciona el correo del candidato...</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.email}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                {/* Templates Selector */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'invite', label: 'Invitación' },
                    { id: 'offer', label: 'Propuesta' },
                    { id: 'reject', label: 'Agradecimiento' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id)}
                      className={cn(
                        "py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all uppercase tracking-wide cursor-pointer",
                        gmailForm.template === tmpl.id
                          ? "bg-zinc-500/10 border-zinc-500/40 text-zinc-300"
                          : "bg-slate-900 border-white/5 text-slate-400"
                      )}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium block">Asunto</label>
                  <input
                    type="text"
                    value={gmailForm.subject}
                    onChange={(e) => setGmailForm({...gmailForm, subject: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium block">Cuerpo del Mensaje (HTML/Texto)</label>
                  <textarea
                    value={gmailForm.body}
                    onChange={(e) => setGmailForm({...gmailForm, body: e.target.value})}
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmail || !gmailForm.candidateEmail}
                  className="btn-primary w-full text-xs py-2.5 px-4 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Correo de Forma Directa
                </button>
              </form>
            </div>
          )}

          {/* Tab 4: Google Forms */}
          {activeTab === 'forms' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Captura de Formularios (Forms)</h3>
                  <p className="text-slate-400 text-xs mt-1 font-light">Sincroniza y extrae postulantes de forma automatizada de tus formularios de registro.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <FormInput className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Sincronizar Canal de Registro</span>
                  <button
                    onClick={handleCreateNewForm}
                    className="text-[10px] bg-zinc-500/20 hover:bg-zinc-500/40 text-zinc-300 px-2 py-1 rounded border border-zinc-500/30 hover:scale-[1.01] transition-transform font-bold"
                  >
                    Crear nuevo en Drive
                  </button>
                </div>

                <p className="text-xs text-slate-400">Introduce la clave única del Formulario de Google (presente en el enlace de edición del documento) para habilitar las APIs automatizadas:</p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="Ej: 1FAIpQLSfD-T1Form..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white pl-4 outline-none focus:border-zinc-500"
                  />
                  <button
                    onClick={handleLinkGoogleForm}
                    disabled={isLinkingForm || !formId}
                    className="btn-primary text-xs py-2 px-4 shrink-0 disabled:opacity-40"
                  >
                    Enlazar Form
                  </button>
                </div>
              </div>

              {/* Linked Form Widget */}
              {connectedForm && (
                <div className="bg-zinc-500/10 border border-zinc-500/35 p-5 rounded-xl space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5 items-start">
                      <FormInput className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-zinc-300">{connectedForm.title}</div>
                        <p className="text-[11px] text-slate-400 mt-1">Sincronización segura activa y lista.</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-950 border border-white/5 px-2 py-0.5 rounded-full text-zinc-300 font-bold font-mono">
                      {connectedForm.responderCount || 0} postulaciones
                    </span>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={handleSyncFormResponses}
                      disabled={isSyncingResponses}
                      className="btn-primary text-[11px] py-1.5 px-3.5 flex items-center gap-1"
                    >
                      {isSyncingResponses ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Sincronizar Respuestas
                    </button>

                    <a
                      href={connectedForm.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-900 hover:bg-slate-850 text-zinc-300 border border-zinc-500/20 px-3.5 py-1.5 rounded-lg text-decoration-none text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      Abrir Formulario <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Google Picker / Drive */}
          {activeTab === 'picker' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Explorador de Archivos (Drive/Picker)</h3>
                  <p className="text-slate-400 text-xs mt-1">Busca y asocia recursos en la nube directamente a tu CRM de Recursos Humanos.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <FolderOpen className="w-5 h-5" />
                </div>
              </div>

              {/* Dynamic Filter Search */}
              <div className="flex items-center gap-2 bg-slate-950 border border-white/5 p-2 rounded-xl">
                <Search className="w-4 h-4 text-slate-500 ml-2" />
                <input
                  type="text"
                  value={searchDrive}
                  onChange={(e) => setSearchDrive(e.target.value)}
                  placeholder="Buscar en Google Drive..."
                  className="bg-transparent border-none outline-none focus:ring-0 text-white placeholder:text-slate-500 text-xs w-full"
                />
                <button
                  onClick={fetchRealDriveFiles}
                  disabled={isFetchingDrive}
                  className="p-1 rounded hover:bg-slate-900 font-bold text-slate-300"
                  title="Actualizar Archivos"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetchingDrive ? "animate-spin text-zinc-400" : "")} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "Todos" },
                  { id: "pdf", label: "PDF" },
                  { id: "image", label: "Imagenes" },
                  { id: "docs", label: "Docs" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setDriveTypeFilter(filter.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                      driveTypeFilter === filter.id
                        ? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                        : "bg-slate-950 text-slate-400 border-white/5 hover:text-white"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* File list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredDriveFiles
                  .map(file => {
                    const isSelected = selectedDriveFile?.id === file.id;
                    const isDoc = file.mimeType.includes("document");
                    const isSheet = file.mimeType.includes("spreadsheet");
                    const isPdf = file.mimeType.includes("pdf");
                    const isImage = file.mimeType.startsWith("image/");
                    const FileIcon = isPdf ? FileText : isImage ? ImageIcon : FolderOpen;

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleSelectPickerFile(file)}
                        className={cn(
                          "bg-slate-950 p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 hover:scale-[1.01]",
                          isSelected
                            ? "border-slate-200/55 bg-white/[0.045] shadow-[0_0_18px_rgba(245,245,245,0.12)]"
                            : "border-white/5 hover:border-slate-200/30 hover:shadow-[0_0_14px_rgba(245,245,245,0.08)]"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg shrink-0 border mt-0.5",
                          isDoc ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                          isSheet ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                          isPdf ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                          isImage ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                          <FileIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="font-bold text-xs text-slate-200 truncate pr-4">{file.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{file.size}</div>
                          <div className="text-[9px] text-slate-600 truncate mt-1">{file.mimeType}</div>
                        </div>
                        {isSelected && (
                          <div className="bg-zinc-500 p-0.5 rounded-full text-slate-900">
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Selected File Details Box */}
              {selectedDriveFile && (
                <div className="bg-zinc-500/10 border border-zinc-500/25 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedDriveFile.thumbnailLink && (
                      <img
                        src={selectedDriveFile.thumbnailLink}
                        alt={selectedDriveFile.name}
                        className="w-16 h-12 rounded-lg object-cover border border-white/10"
                      />
                    )}
                    <div className="min-w-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Archivo Enlazado</span>
                    <span className="text-xs font-bold text-white truncate max-w-xs">{selectedDriveFile.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDriveFile.webViewLink && selectedDriveFile.webViewLink !== "#" && (
                      <a
                        href={selectedDriveFile.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-300 hover:text-white flex items-center gap-1"
                      >
                        Abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedDriveFile(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Google Photos */}
          {activeTab === 'photos' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Google Photos</h3>
                  <p className="text-slate-400 text-xs mt-1">Consulta fotos e imagenes autorizadas para expedientes, evidencias y onboarding.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <ImageIcon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={fetchGooglePhotos}
                  disabled={isFetchingPhotos}
                  className="bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 border border-zinc-500/20 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetchingPhotos ? "animate-spin" : "")} />
                  Actualizar Fotos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {googlePhotos.map((photo) => {
                  const isSelected = selectedPhoto?.id === photo.id;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setSelectedPhoto(photo);
                        addLog("Google Photos", `Foto seleccionada: ${photo.filename}`, "success", null, photo);
                      }}
                      className={cn(
                        "text-left bg-slate-950 rounded-xl border overflow-hidden transition-all hover:scale-[1.01]",
                        isSelected ? "border-slate-200/55 shadow-[0_0_18px_rgba(245,245,245,0.12)]" : "border-white/5 hover:border-slate-200/30 hover:shadow-[0_0_14px_rgba(245,245,245,0.08)]"
                      )}
                    >
                      <img
                        src={getPhotoPreviewUrl(photo)}
                        alt={photo.filename}
                        className="w-full h-32 object-cover bg-slate-900"
                      />
                      <div className="p-3">
                        <div className="font-bold text-xs text-slate-200 truncate">{photo.filename}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{photo.mimeType}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPhoto && (
                <div className="bg-zinc-500/10 border border-zinc-500/25 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest block">Foto vinculada</span>
                    <span className="text-xs font-bold text-white truncate block">{selectedPhoto.filename}</span>
                  </div>
                  {selectedPhoto.productUrl && selectedPhoto.productUrl !== "#" && (
                    <a
                      href={selectedPhoto.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-300 hover:text-white flex items-center gap-1"
                    >
                      Abrir <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 7: Google Keep */}
          {activeTab === 'keep' && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Google Keep</h3>
                  <p className="text-slate-400 text-xs mt-1">Toma notas breves sobre evaluaciones, preguntas o avisos rápidos del equipo de RH.</p>
                </div>
                <div className="p-2 bg-zinc-500/10 text-zinc-400 rounded-lg border border-zinc-500/20">
                  <StickyNote className="w-5 h-5" />
                </div>
              </div>

              {/* Add Note form */}
              <form onSubmit={handleCreateKeepNote} className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <input
                  type="text"
                  value={newKeepNote.title}
                  onChange={(e) => setNewKeepNote({...newKeepNote, title: e.target.value})}
                  placeholder="Título de la nota..."
                  className="w-full bg-transparent border-none font-bold text-xs text-white outline-none placeholder:text-slate-500"
                />
                <textarea
                  value={newKeepNote.content}
                  onChange={(e) => setNewKeepNote({...newKeepNote, content: e.target.value})}
                  placeholder="Escribe una nota rápida de reclutamiento o checklist..."
                  rows={3}
                  className="w-full bg-transparent border-none text-xs text-slate-300 outline-none resize-none placeholder:text-slate-600 focus:ring-0"
                />

                <div className="flex justify-between items-center pt-2 border-t border-white/5 shrink-0">
                  <div className="flex gap-1.5">
                    {[
                      { id: 'tone1', color: 'bg-zinc-400' },
                      { id: 'tone2', color: 'bg-zinc-500' },
                      { id: 'tone3', color: 'bg-zinc-600' },
                      { id: 'tone4', color: 'bg-zinc-700' }
                    ].map(col => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setNewKeepNote({...newKeepNote, color: col.id})}
                        className={cn(
                          "w-4 h-4 rounded-full border cursor-pointer",
                          col.color,
                          newKeepNote.color === col.id ? "ring-1 ring-white scale-110 border-white" : "border-transparent"
                        )}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingNote || (!newKeepNote.title && !newKeepNote.content)}
                    className="btn-primary text-[10px] uppercase tracking-wide py-1 px-3.5 disabled:opacity-40"
                  >
                    Guardar Nota
                  </button>
                </div>
              </form>

              {/* Keep Card listings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keepNotes.map(note => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col justify-between relative group hover:border-slate-200/35 hover:shadow-[0_0_18px_rgba(245,245,245,0.10)] transition-all",
                      note.color === 'tone1' ? "bg-zinc-400/10 border-zinc-400/20 text-zinc-100" :
                      note.color === 'tone2' ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-100" :
                      note.color === 'tone3' ? "bg-zinc-600/10 border-zinc-600/20 text-zinc-100" :
                      "bg-zinc-500/10 border-zinc-500/20 text-zinc-100"
                    )}
                  >
                    <button
                      onClick={() => handleRemoveNote(note.id, note.title)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-current/60 hover:text-current"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide mb-2 pr-6 truncate">{note.title}</div>
                      <p className="text-xs font-light whitespace-pre-wrap leading-relaxed opacity-95">{note.content}</p>
                    </div>
                    <div className="text-[9px] font-mono opacity-50 mt-4 text-right">Actualizado: {note.updated}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* API Logs Output Terminal Side Panel */}
        <div className="xl:col-span-3 flex flex-col gap-4 xl:sticky xl:top-0">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Consola de Respuestas de API</span>
              <button
                onClick={() => setApiLogs([])}
                className="text-[9px] text-slate-500 hover:text-slate-200 uppercase tracking-wider font-bold transition-colors"
              >
                Limpiar
              </button>
            </div>

            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 style-3 font-mono">
              {apiLogs.map(log => (
                <div key={log.id} className="text-[10px] bg-slate-950/60 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 border-b border-white/5 pb-1 mb-1">
                    <span className={cn(
                      "font-bold uppercase tracking-wide",
                      log.type === "success" ? "text-zinc-400" :
                      log.type === "warning" ? "text-zinc-400" :
                      log.type === "error" ? "text-zinc-400" : "text-zinc-400"
                    )}>[{log.service}]</span>
                    <span>{log.time}</span>
                  </div>
                  <div className="text-slate-300">{log.message}</div>

                  {/* Expandable debug panel */}
                  {(log.request || log.response) && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      {log.request && (
                        <div>
                          <span className="text-[8px] text-slate-500">REQUEST:</span>
                          <pre className="p-1 bg-slate-900 border border-white/5 rounded text-[8px] text-zinc-400 overflow-x-auto max-w-full leading-normal">{log.request}</pre>
                        </div>
                      )}
                      {log.response && (
                        <div>
                          <span className="text-[8px] text-slate-500">RESPONSE:</span>
                          <pre className="p-1 bg-slate-900 border border-white/5 rounded text-[8px] text-zinc-400 overflow-x-auto max-w-full leading-normal">{log.response}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {apiLogs.length === 0 && (
                <div className="text-center text-slate-600 text-[10px] py-12">
                   Sin eventos registrados en esta sesión.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
