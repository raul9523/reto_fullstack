import { db } from './src/firebase/firebase.config.js';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

const initSettings = async () => {
  const settingsRef = doc(db, 'settings', 'global');
  await setDoc(settingsRef, {
    shippingCost: 15000,
    paymentMethods: {
      pse: true,
      transferencia: true,
      contraentrega: true
    }
  });
  console.log("Configuración inicial guardada.");
};

// También vamos a inicializar algunas categorías si no existen
const initCategories = async () => {
  const categories = ['Pijamas', 'Accesorios'];
  for (const cat of categories) {
    await setDoc(doc(db, 'categories', cat), {
      name: cat,
      isActive: true,
      createdAt: new Date().toISOString()
    });
  }
  console.log("Categorías iniciales guardadas.");
};

// Correr inicialización
const run = async () => {
  await initSettings();
  await initCategories();
  process.exit();
};

run();
