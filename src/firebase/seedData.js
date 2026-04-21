import { db } from './firebase.config';
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

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

const EXPECTED_DT_IDS = new Set(DOCUMENT_TYPES.map(d => d.id));

export const seedInitialData = async () => {
  try {
    // document_types: sincronizar siempre — elimina los viejos y escribe los correctos
    const dtSnap = await getDocs(collection(db, 'document_types'));
    const batch = writeBatch(db);

    // Eliminar documentos que no están en la lista oficial
    dtSnap.docs.forEach(d => {
      if (!EXPECTED_DT_IDS.has(d.id)) batch.delete(d.ref);
    });

    // Crear / sobreescribir todos los tipos correctos
    for (const { id, ...data } of DOCUMENT_TYPES) {
      batch.set(doc(db, 'document_types', id), data);
    }

    await batch.commit();

    // payment_methods: solo crear si la colección está vacía (el admin puede agregar los suyos)
    const pmSnap = await getDocs(collection(db, 'payment_methods'));
    if (pmSnap.empty) {
      const pmBatch = writeBatch(db);
      for (const { id, ...data } of PAYMENT_METHODS) {
        pmBatch.set(doc(db, 'payment_methods', id), data);
      }
      await pmBatch.commit();
    }
  } catch (err) {
    console.error('seedInitialData error:', err);
  }
};
