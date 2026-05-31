import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  MapPin,
  Users,
  Globe,
  Briefcase,
  Share2,
  X,
  Clock,
  GraduationCap,
  ClipboardList,
  Gift,
  Target,
  Copy,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RECRUITMENT_JOB_TEMPLATES } from "@/data/recruitmentKnowledge";

type JobOffer = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Draft" | "Active" | "Closed";
  description: string;
  targetProfile: string;
  ageRange: string;
  experience: string;
  education: string;
  responsibilities: string;
  offer: string;
  schedule: string;
  salaryRange: string;
  benefits: string;
  agentInstructions: string;
  applicants: number;
  platforms: string[];
};

const EMPTY_JOB: Omit<JobOffer, "id" | "applicants" | "platforms"> = {
  title: "",
  department: "",
  location: "",
  status: "Draft",
  description: "",
  targetProfile: "",
  ageRange: "",
  experience: "",
  education: "",
  responsibilities: "",
  offer: "",
  schedule: "",
  salaryRange: "",
  benefits: "",
  agentInstructions: ""
};

const normalizeJobs = (): JobOffer[] => {
  return RECRUITMENT_JOB_TEMPLATES.map((job) => ({
    ...job,
    status: "Active",
    applicants: 0,
  }));
};

function buildAgentBrief(job: JobOffer) {
  return `VACANTE: ${job.title}
Departamento: ${job.department}
Ubicacion: ${job.location}
Estado: ${job.status}

A QUIEN BUSCAR:
${job.targetProfile}

EDAD / CUMPLIMIENTO:
${job.ageRange}

EXPERIENCIA:
${job.experience}

PREPARACION ACADEMICA:
${job.education}

QUE HACE:
${job.responsibilities}

QUE SE OFRECE:
${job.offer}

HORARIOS:
${job.schedule}

SUELDO:
${job.salaryRange}

BENEFICIOS:
${job.benefits}

INSTRUCCIONES PARA EL AGENTE:
${job.agentInstructions}`;
}

export function Jobs() {
  const [jobs, setJobs] = useState<JobOffer[]>(normalizeJobs());
  const [searchFilter, setSearchFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [newJob, setNewJob] = useState(EMPTY_JOB);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const haystack = [
      job.title,
      job.department,
      job.location,
      job.targetProfile,
      job.experience,
      job.education,
      job.schedule
    ].join(" ").toLowerCase();
    return haystack.includes(searchFilter.toLowerCase());
  }), [jobs, searchFilter]);

  const updateNewJob = (field: keyof typeof EMPTY_JOB, value: string) => {
    setNewJob((current) => ({ ...current, [field]: value }));
  };

  const handleCreateJob = () => {
    if (!newJob.title || !newJob.department || !newJob.location) return;
    const added: JobOffer = {
      id: `job-${Date.now()}`,
      ...newJob,
      applicants: 0,
      platforms: []
    };
    setJobs([added, ...jobs]);
    setIsModalOpen(false);
    setNewJob(EMPTY_JOB);
  };

  const copyBrief = async (job: JobOffer) => {
    await navigator.clipboard.writeText(buildAgentBrief(job));
    setCopiedJobId(job.id);
    setTimeout(() => setCopiedJobId(null), 1800);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-2">Ofertas de Empleo</h1>
          <p className="text-slate-400">Define vacantes claras para que los agentes sepan a quien buscar, que evaluar y que ofrecer.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-50 hover:text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Plus className="w-4 h-4" />
          Nueva Oferta
        </button>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por puesto, perfil, experiencia, estudios, horario o ubicacion..."
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            className="w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-500 text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredJobs.map((job) => (
          <div key={job.id} className="glass-panel glass-panel-hover rounded-2xl flex flex-col p-6 group border border-white/5">
            <div className="flex justify-between items-start gap-4 mb-5">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                  <Briefcase className="w-6 h-6 opacity-80" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{job.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{job.department}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[11px] bg-slate-900/70 border border-white/5 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {job.location}
                    </span>
                    <span className="text-[11px] bg-slate-900/70 border border-white/5 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {job.schedule}
                    </span>
                  </div>
                </div>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border shrink-0",
                job.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                job.status === "Closed" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}>
                {job.status === "Active" ? "Activa" : job.status === "Closed" ? "Cerrada" : "Borrador"}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">{job.description || job.targetProfile}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <InfoBlock icon={Target} label="A quien buscar" value={job.targetProfile} />
              <InfoBlock icon={Users} label="Edad / Cumplimiento" value={job.ageRange} />
              <InfoBlock icon={ClipboardList} label="Experiencia" value={job.experience} />
              <InfoBlock icon={GraduationCap} label="Preparacion" value={job.education} />
              <InfoBlock icon={Briefcase} label="Que hace" value={job.responsibilities} />
              <InfoBlock icon={Gift} label="Que se ofrece" value={`${job.offer} ${job.benefits}`} />
            </div>

            <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4 mb-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-300">Brief para el agente</h4>
                <button
                  onClick={() => copyBrief(job)}
                  className="text-xs text-cyan-300 hover:text-white flex items-center gap-1"
                >
                  {copiedJobId === job.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJobId === job.id ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{job.agentInstructions}</p>
            </div>

            <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {job.platforms.length > 0 ? job.platforms.map((platform) => (
                    <span key={platform} className="text-[10px] bg-slate-800/50 border border-white/5 text-slate-300 px-2 py-1 rounded-md font-medium uppercase tracking-wider">
                      {platform}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-500 italic">No publicada</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {job.applicants}
                </span>
                <button onClick={() => setSelectedJob(job)} className="px-3 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors">
                  Ver ficha
                </button>
                {job.status === "Active" && (
                  <button className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <JobModal
          title="Nueva Oferta"
          job={newJob}
          onChange={updateNewJob}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreateJob}
        />
      )}

      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel shadow-2xl">
            <div className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedJob.title}</h2>
                <p className="text-sm text-slate-400">{selectedJob.department} - {selectedJob.location}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200 font-mono bg-slate-950/60 border border-slate-700/60 rounded-xl p-4">
                {buildAgentBrief(selectedJob)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/35 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
        <Icon className="w-3.5 h-3.5 text-cyan-400" />
        {label}
      </div>
      <p className="text-xs text-slate-300 leading-5">{value || "Pendiente"}</p>
    </div>
  );
}

function JobModal({
  title,
  job,
  onChange,
  onClose,
  onSave
}: {
  title: string;
  job: typeof EMPTY_JOB;
  onChange: (field: keyof typeof EMPTY_JOB, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto glass-panel shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50 p-5 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Titulo del puesto" value={job.title} onChange={(value) => onChange("title", value)} placeholder="Ej: Asesor/a de Servicio al Cliente" required />
            <Field label="Departamento" value={job.department} onChange={(value) => onChange("department", value)} placeholder="Ej: Operaciones" required />
            <Field label="Ubicacion" value={job.location} onChange={(value) => onChange("location", value)} placeholder="Ej: CDMX / Remoto" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Area label="Descripcion general" value={job.description} onChange={(value) => onChange("description", value)} placeholder="Resumen corto de la vacante." />
            <Area label="A quien debe buscar el agente" value={job.targetProfile} onChange={(value) => onChange("targetProfile", value)} placeholder="Perfil humano y profesional ideal: actitud, habilidades, disponibilidad, tipo de experiencia." />
            <Area label="Edad o rango permitido" value={job.ageRange} onChange={(value) => onChange("ageRange", value)} placeholder="Opcional/no excluyente. Usa solo si legalmente aplica; no discriminar." />
            <Area label="Experiencia requerida" value={job.experience} onChange={(value) => onChange("experience", value)} placeholder="Ej: 6 meses en ventas, soporte, call center o atencion a clientes." />
            <Area label="Preparacion academica" value={job.education} onChange={(value) => onChange("education", value)} placeholder="Ej: Preparatoria terminada, carrera tecnica, licenciatura trunca o afin." />
            <Area label="Que hace en el puesto" value={job.responsibilities} onChange={(value) => onChange("responsibilities", value)} placeholder="Actividades diarias y responsabilidades principales." />
            <Area label="Que se ofrece" value={job.offer} onChange={(value) => onChange("offer", value)} placeholder="Contrato, capacitacion, herramientas, crecimiento, modalidad." />
            <Area label="Horarios" value={job.schedule} onChange={(value) => onChange("schedule", value)} placeholder="Dias, turnos, descansos, modalidad y disponibilidad esperada." />
            <Field label="Sueldo / rango" value={job.salaryRange} onChange={(value) => onChange("salaryRange", value)} placeholder="Ej: $10,000 - $14,000 MXN mensuales" />
            <Field label="Beneficios" value={job.benefits} onChange={(value) => onChange("benefits", value)} placeholder="Prestaciones, bonos, capacitacion, remoto, etc." />
          </div>

          <Area
            label="Instrucciones especificas para el agente"
            value={job.agentInstructions}
            onChange={(value) => onChange("agentInstructions", value)}
            placeholder="Que debe priorizar, que preguntas hacer, que perfiles descartar por criterios laborales validos y que nunca debe inventar."
            rows={5}
          />

          <div>
            <label className="text-sm text-slate-300 mb-1.5 block">Estado inicial</label>
            <select
              value={job.status}
              onChange={(event) => onChange("status", event.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
            >
              <option value="Draft">Borrador</option>
              <option value="Active">Activa</option>
              <option value="Closed">Cerrada</option>
            </select>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-900/95 p-5 flex justify-end gap-3 border-t border-slate-700/50">
          <button onClick={onClose} className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!job.title || !job.department || !job.location}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Oferta
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm text-slate-300 mb-1.5 block">{label}{required && <span className="text-rose-400"> *</span>}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function Area({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return (
    <div>
      <label className="text-sm text-slate-300 mb-1.5 block">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
        placeholder={placeholder}
      />
    </div>
  );
}
