import { create } from 'zustand';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase.config';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  listenToNotifications: (userId, isAdmin = false) => {
    set({ isLoading: true });
    
    // Si es admin, escucha notificaciones para 'admin' o para su ID específico
    const q = isAdmin 
      ? query(collection(db, 'notifications'), where('userId', 'in', ['admin', userId]), orderBy('createdAt', 'desc'))
      : query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({ id: doc.id, ...data });
        if (!data.read) unread++;
      });
      set({ notifications: notes, unreadCount: unread, isLoading: false });
    });

    return unsubscribe;
  },

  markAsRead: async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  markAllAsRead: async (userId, isAdmin = false) => {
    const { notifications } = get();
    const unreadNotes = notifications.filter(n => !n.read);
    if (unreadNotes.length === 0) return;

    const batch = writeBatch(db);
    unreadNotes.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  }
}));

export default useNotificationStore;
