import { db } from './firebase.config';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

const DOCUMENT_TYPES = [
  { id: 'CC',  name: 'Cédula de Ciudadanía',            order: 1 },
  { id: 'CE',  name: 'Cédula de Extranjería',            order: 2 },
  { id: 'NIT', name: 'NIT',                              order: 3, hasDV: true },
  { id: 'TI',  name: 'Tarjeta de Identidad',             order: 4 },
  { id: 'PP',  name: 'Pasaporte',                        order: 5 },
  { id: 'PEP', name: 'Permiso Especial de Permanencia',  order: 6 },
];

const PAYMENT_METHODS = [
  { id: 'pse',           label: 'PSE',                   icon: '🏦', description: 'Pago electrónico seguro desde tu banco.',   order: 1 },
  { id: 'transferencia', label: 'Transferencia Bancaria', icon: '💸', description: 'Transfiere y envía el comprobante de pago.', order: 2 },
  { id: 'contraentrega', label: 'Contra Entrega',         icon: '📦', description: 'Paga cuando recibas tu pedido en casa.',     order: 3 },
];

export const seedInitialData = async () => {
  try {
    const dtSnap = await getDocs(collection(db, 'document_types'));
    if (dtSnap.empty) {
      for (const { id, ...data } of DOCUMENT_TYPES) {
        await setDoc(doc(db, 'document_types', id), data);
      }
    }

    const pmSnap = await getDocs(collection(db, 'payment_methods'));
    if (pmSnap.empty) {
      for (const { id, ...data } of PAYMENT_METHODS) {
        await setDoc(doc(db, 'payment_methods', id), data);
      }
    }
  } catch (err) {
    console.error('seedInitialData error:', err);
  }
};
