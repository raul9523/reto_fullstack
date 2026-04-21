# 🛍️ Duo-Dreams - E-commerce Fullstack Premium

![Duo-Dreams Banner](./public/assets/images/banner.png)

**Duo-Dreams** es una plataforma de comercio electrónico moderna, diseñada para ofrecer una experiencia de usuario fluida y un panel administrativo robusto. Construida con las últimas tecnologías web, la aplicación combina velocidad, seguridad y un diseño minimalista de alta gama.

---

## 🚀 Funcionalidades Principales

### 👤 Experiencia del Usuario
- **Autenticación Segura**: Sistema de Login y Registro integrado con Firebase Authentication.
- **Galería de Productos Dinámica**: Catálogo poblado en tiempo real desde Firestore con búsqueda instantánea.
- **Filtrado Inteligente**: Navegación por categorías para encontrar productos fácilmente.
- **Carrito de Compras Persistente**: Gestión de productos con persistencia local y sincronización de estado mediante Zustand.
- **Checkout Optimizado**: Proceso de compra intuitivo con resumen detallado y múltiples métodos de pago simulados.
- **Historial de Pedidos**: Los usuarios pueden consultar sus compras anteriores y el estado de sus pedidos.

### 📊 Panel Administrativo (Admin Dashboard)
- **Métricas en Tiempo Real**: Visualización de ventas, usuarios registrados y stock mediante gráficos dinámicos con **Recharts**.
- **Gestión de Inventario**: Interfaz completa para agregar, editar y eliminar productos.
- **Control de Usuarios**: Visualización de la base de datos de clientes y sus roles.

---

## 🛠️ Stack Tecnológico

| Tecnología | Propósito |
| :--- | :--- |
| **React 19** | Biblioteca principal para la interfaz de usuario. |
| **Vite 8** | Herramienta de construcción y servidor de desarrollo ultra rápido. |
| **Tailwind CSS 4** | Framework de estilos para un diseño moderno y responsivo. |
| **Zustand 5** | Gestión de estado global ligera y eficiente. |
| **Firebase 12** | Backend-as-a-Service (Auth, Firestore, Hosting). |
| **Recharts** | Biblioteca de visualización de datos para el dashboard. |
| **Axios** | Cliente HTTP para comunicaciones robustas. |

---

## ⚙️ Configuración e Instalación

Sigue estos pasos para ejecutar el proyecto localmente:

### 1. Clonar el repositorio
```bash
git clone [url-del-repositorio]
cd Duo-Dreams
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Firebase:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 4. Sembrar la Base de Datos (Opcional)
Para cargar datos de prueba iniciales (productos, categorías, usuarios demo):
```bash
node seed-db.js
```

### 5. Iniciar el entorno de desarrollo
```bash
npm run dev
```

---

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura organizada basada en **Atomic Design**:

- `src/components/atoms`: Componentes básicos reutilizables (Botones, Inputs).
- `src/components/molecules`: Combinaciones de átomos (Product Cards, Forms).
- `src/components/organisms`: Componentes complejos (Header, Footer, Gallery).
- `src/pages`: Vistas completas de la aplicación.
- `src/store`: Gestión de estado con Zustand (User, Cart, Products).
- `src/firebase`: Configuración y utilidades de Firebase.

---

## 🌐 Despliegue

La aplicación está lista para ser desplegada en **Firebase Hosting**:
```bash
npm run build
npx firebase deploy
```

---

## 📄 Licencia

Este proyecto fue desarrollado como parte de un reto técnico fullstack. Todos los derechos reservados a Duo-Dreams.