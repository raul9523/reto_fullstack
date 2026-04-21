import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { categories as mockCategories } from "./src/mockdata/categories.js";
import { products as mockProducts } from "./src/mockdata/products.js";
import { users as mockUsers } from "./src/mockdata/users.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKbDxn_KrJtYRQeWK-mxCSkliJhThDbUQ",
  authDomain: "duo-dreams.firebaseapp.com",
  projectId: "duo-dreams",
  storageBucket: "duo-dreams.firebasestorage.app",
  messagingSenderId: "852763243834",
  appId: "1:852763243834:web:075f05a6740132e0028c03",
  measurementId: "G-3EZR728C04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const documentTypes = [
  { id: "CC", name: "Cédula de Ciudadanía", isCompany: false },
  { id: "CE", name: "Cédula de Extranjería", isCompany: false },
  { id: "NIT", name: "NIT", isCompany: true },
  { id: "TI", name: "Tarjeta de Identidad", isCompany: false },
  { id: "PP", name: "Pasaporte", isCompany: false }
];

const seedDocumentTypes = async () => {
  console.log("Seeding document types...");
  for (const type of documentTypes) {
    const { id, ...data } = type;
    await setDoc(doc(db, "document_types", id), data);
  }
};

const seedCategories = async () => {
  console.log("Seeding categories...");
  for (const cat of mockCategories) {
    const { id, ...data } = cat;
    await setDoc(doc(db, "categories", id), data);
  }
};

const seedProducts = async () => {
  console.log("Seeding products...");
  for (const prod of mockProducts) {
    const { id, ...data } = prod;
    await setDoc(doc(db, "products", id), data);
  }
};

const seedUsers = async () => {
  console.log("Seeding users...");
  for (const user of mockUsers) {
    const { id, ...data } = user;
    await setDoc(doc(db, "users", id), data);
  }
  
  // Admin user
  await setDoc(doc(db, "users", "admin-001"), {
    email: "raulpte0211@gmail.com",
    firstName: "Admin",
    lastName: "Duo Dreams",
    role: "admin",
    createdAt: new Date().toISOString()
  });
};

const seedSettings = async () => {
  console.log("Seeding settings...");
  await setDoc(doc(db, "settings", "global"), {
    shippingCost: 15000,
    paymentMethods: {
      pse: true,
      transferencia: true,
      contraentrega: true
    }
  });
};

const run = async () => {
  try {
    await seedDocumentTypes();
    await seedCategories();
    await seedProducts();
    await seedUsers();
    await seedSettings();
    console.log("¡Base de datos sembrada con éxito! ✅");
  } catch (error) {
    console.error("Error al sembrar la base de datos:", error);
  }
  process.exit();
};

run();
