import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  BrowserPushStatus,
  getBrowserPushStatus,
  isBrowserPushSupported,
  showBrowserNotification,
} from '@/lib/pushNotifications';

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
  push: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { id: 'new_candidate', label: 'Nuevos candidatos', description: 'Notificar cuando un candidato aplique a una oferta.', email: true, inApp: true, push: false },
  { id: 'interview_scheduled', label: 'Citas agendadas', description: 'Notificar cuando se agende o modifique una entrevista.', email: true, inApp: true, push: true },
  { id: 'status_change', label: 'Cambios de estado', description: 'Notificar cuando un candidato cambie de fase en el embudo.', email: false, inApp: true, push: true },
  { id: 'team_mention', label: 'Menciones del equipo', description: 'Notificar cuando te mencionen en notas o comentarios.', email: true, inApp: true, push: true },
  { id: 'system_alerts', label: 'Alertas del sistema', description: 'Avisos importantes sobre suscripción o mantenimiento.', email: true, inApp: false, push: true },
  { id: 'sync', label: 'Sincronizaciones', description: 'Avisos de importaciones, mensajes enviados y procesos conectados.', email: false, inApp: true, push: false },
  { id: 'info', label: 'Avisos operativos', description: 'Recordatorios y acciones pendientes dentro del CRM.', email: false, inApp: true, push: false },
];

const normalizePrefs = (storedPrefs?: Partial<NotificationPref>[]) => (
  DEFAULT_PREFS.map(defaultPref => {
    const storedPref = storedPrefs?.find(pref => pref.id === defaultPref.id);
    return {
      ...defaultPref,
      ...storedPref,
      email: storedPref?.email ?? defaultPref.email,
      inApp: storedPref?.inApp ?? defaultPref.inApp,
      push: storedPref?.push ?? defaultPref.push,
    };
  })
);

const toNotificationPayload = (eventId: string, data: any) => {
  if (data && typeof data === 'object') {
    return {
      title: data.title || 'Nueva Notificación',
      message: data.message || 'Una acción ocurrió en el sistema.',
      type: data.type || 'info',
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
    };
  }

  return {
    title: eventId,
    message: typeof data === 'string' ? data : 'Una acción ocurrió en el sistema.',
    type: 'info' as NotificationType,
  };
};

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
  updatePref: (id: string, type: 'email' | 'inApp' | 'push') => void;
  pushStatus: BrowserPushStatus;
  pushError: string | null;
  requestPushPermission: () => Promise<BrowserPushStatus>;
  sendTestPushNotification: () => Promise<boolean>;
  
  // Event Trigger
  triggerEvent: (eventId: string, data: any) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const initialNotifications: AppNotification[] = [];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [prefs, setPrefs] = useState<NotificationPref[]>(() => {
    const stored = localStorage.getItem('talentflow_notif_prefs');
    return stored ? normalizePrefs(JSON.parse(stored)) : DEFAULT_PREFS;
  });
  const [pushStatus, setPushStatus] = useState<BrowserPushStatus>(() => getBrowserPushStatus());
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('talentflow_notif_prefs', JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    setPushStatus(getBrowserPushStatus());
  }, []);

  const updatePref = useCallback((id: string, type: 'email' | 'inApp' | 'push') => {
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

  const requestPushPermission = useCallback(async () => {
    setPushError(null);

    if (!isBrowserPushSupported()) {
      setPushStatus('unsupported');
      setPushError('Las notificaciones push requieren HTTPS o localhost y un navegador compatible.');
      return 'unsupported' as BrowserPushStatus;
    }

    const permission = await Notification.requestPermission();
    setPushStatus(permission);

    if (permission === 'granted') {
      addNotification({
        title: 'Push activadas',
        message: 'Las notificaciones del navegador ya están listas para citas, estados y alertas.',
        type: 'success',
      });
    } else if (permission === 'denied') {
      setPushError('El navegador bloqueó las notificaciones. Actívalas desde la configuración del sitio.');
    }

    return permission;
  }, [addNotification]);

  const sendTestPushNotification = useCallback(async () => {
    setPushError(null);

    if (getBrowserPushStatus() !== 'granted') {
      setPushStatus(getBrowserPushStatus());
      setPushError('Primero activa el permiso de notificaciones push.');
      return false;
    }

    try {
      const sent = await showBrowserNotification({
        title: 'Prueba push de RHDreams',
        message: 'Listo: recibirás avisos importantes aunque estés en otra pestaña.',
        type: 'success',
        actionUrl: '/reports',
        tag: 'rhdreams-push-test',
      });

      if (sent) {
        addNotification({
          title: 'Prueba enviada',
          message: 'Se lanzó una notificación push de prueba al navegador.',
          type: 'success',
        });
      }

      return sent;
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'No se pudo enviar la notificación push.');
      return false;
    }
  }, [addNotification]);

  // An event happens, and depending on prefs we dispatch in-app notifications.
  const triggerEvent = useCallback((eventId: string, data: any) => {
    const pref = prefs.find(p => p.id === eventId);
    if (!pref) return;
    const payload = toNotificationPayload(eventId, data);

    if (pref.inApp) {
      addNotification({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        actionUrl: payload.actionUrl,
        actionLabel: payload.actionLabel,
      });
    }

    if (pref.push && getBrowserPushStatus() === 'granted') {
      showBrowserNotification({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        actionUrl: payload.actionUrl,
        tag: eventId,
      }).catch(error => {
        setPushError(error instanceof Error ? error.message : 'No se pudo enviar la notificación push.');
      });
    }

    if (pref.email) {
      addNotification({
        title: 'Correo pendiente de configuración',
        message: 'Conecta un proveedor de email transaccional para enviar esta notificación fuera de la app.',
        type: 'warning',
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
      pushStatus,
      pushError,
      requestPushPermission,
      sendTestPushNotification,
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
