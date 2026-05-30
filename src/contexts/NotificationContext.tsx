import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPref {
  id: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { id: 'new_candidate', label: 'Nuevos candidatos', description: 'Notificar cuando un candidato aplique a una oferta.', email: true, inApp: true },
  { id: 'interview_scheduled', label: 'Citas agendadas', description: 'Notificar cuando se agende o modifique una entrevista.', email: true, inApp: true },
  { id: 'status_change', label: 'Cambios de estado', description: 'Notificar cuando un candidato cambie de fase en el embudo.', email: false, inApp: true },
  { id: 'team_mention', label: 'Menciones del equipo', description: 'Notificar cuando te mencionen en notas o comentarios.', email: true, inApp: true },
  { id: 'system_alerts', label: 'Alertas del sistema', description: 'Avisos importantes sobre suscripción o mantenimiento.', email: true, inApp: false },
];

interface NotificationContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // Preferences
  prefs: NotificationPref[];
  updatePref: (id: string, type: 'email' | 'inApp') => void;
  
  // Event Trigger (Simulating backend integration)
  triggerEvent: (eventId: string, data: any) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const initialNotifications: AppNotification[] = [
  {
    id: '1',
    title: 'Nuevo candidato prometedor',
    message: 'Sarah Connor ha aplicado para la posición de Senior Backend Engineer.',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    actionUrl: '/candidates',
    actionLabel: 'Ver candidato'
  },
  {
    id: '2',
    title: 'Entrevista programada',
    message: 'Entrevista con Mike Ross a las 15:00 hrs.',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  }
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [prefs, setPrefs] = useState<NotificationPref[]>(() => {
    const stored = localStorage.getItem('talentflow_notif_prefs');
    return stored ? JSON.parse(stored) : DEFAULT_PREFS;
  });

  useEffect(() => {
    localStorage.setItem('talentflow_notif_prefs', JSON.stringify(prefs));
  }, [prefs]);

  const updatePref = useCallback((id: string, type: 'email' | 'inApp') => {
    setPrefs(current => current.map(p => p.id === id ? { ...p, [type]: !p[type] } : p));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9),
      read: false,
      createdAt: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Simulates integration: an event happens, and depending on prefs we dispatch in-app and/or email
  const triggerEvent = useCallback((eventId: string, data: any) => {
    const pref = prefs.find(p => p.id === eventId);
    if (!pref) return;

    if (pref.inApp) {
      addNotification({
        title: data.title || 'Nueva Notificación',
        message: data.message || 'Una acción ocurrió en el sistema.',
        type: data.type || 'info',
      });
    }

    if (pref.email) {
      // Logic that sends email notification. Using console and an extra "toast" to simulate inbox delivery
      console.log(`[SIMULATED EMAIL SENT] to Inbox. Event: ${eventId}, Data:`, data);
      
      // Give a distinct "email" visual indicator as a fallback alert in the UI for the demo
      addNotification({
        title: '📧 Correo enviado a tu inbox',
        message: `Asunto: ${data.title}`,
        type: 'info',
      });
    }
  }, [prefs, addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      prefs,
      updatePref,
      triggerEvent
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
