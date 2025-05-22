const DB_NAME = 'user_db';
const DB_VERSION = 1;
const STORE_NAME = 'users';

let db;

// Usuarios predefinidos (codificados para este ejemplo)
const VALID_USERS = [
    { username: 'user1', password: 'password1' },
    { username: 'user2', password: 'password2' },
    { username: 'user3', password: 'password3' },
    { username: 'user4', password: 'password4' }
];

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('message');
const loggedInContent = document.getElementById('loggedInContent');
const loggedInUsernameSpan = document.getElementById('loggedInUsername');
const logoutButton = document.getElementById('logoutButton');

// Inicializar IndexedDB
function initDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error de IndexedDB:', event.target.errorCode);
            reject('Error de IndexedDB');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB abierto con éxito');
            resolve();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'username' });
                // Poblar con usuarios iniciales
                VALID_USERS.forEach(user => {
                    objectStore.add(user);
                });
                console.log('Almacén de objetos creado y poblado');
            }
        };
    });
}

// Función para autenticar usuario
async function authenticateUser(username, password) {
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(username);

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const user = event.target.result;
                if (user && user.password === password) {
                    resolve(true); // Autenticación exitosa
                } else {
                    resolve(false); // Credenciales inválidas
                }
            };

            request.onerror = (event) => {
                console.error('Error al obtener usuario de IndexedDB:', event.target.errorCode);
                reject('Error al obtener usuario');
            };
        });
    } catch (error) {
        console.error('Error de transacción de IndexedDB:', error);
        return false; // Asume que la autenticación falló debido a un error de DB
    }
}

// Función para establecer y recuperar el estado de inicio de sesión en localStorage (para persistencia de la UI)
function setLoggedInUser(username) {
    localStorage.setItem('loggedInUser', username);
    updateUI(username);
}

function getLoggedInUser() {
    return localStorage.getItem('loggedInUser');
}

function clearLoggedInUser() {
    localStorage.removeItem('loggedInUser');
    updateUI(null);
}

// Actualizar la interfaz de usuario según el estado de inicio de sesión
function updateUI(username) {
    if (username) {
        loggedInUsernameSpan.textContent = username;
        loginForm.style.display = 'none';
        loggedInContent.style.display = 'block';
    } else {
        usernameInput.value = '';
        passwordInput.value = '';
        messageElement.textContent = '';
        loginForm.style.display = 'block';
        loggedInContent.style.display = 'none';
    }
}

// Manejar el envío del formulario de inicio de sesión
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        messageElement.textContent = 'Por favor, introduce usuario y contraseña.';
        return;
    }

    // Intentar la autenticación usando IndexedDB
    const isAuthenticated = await authenticateUser(username, password);

    if (isAuthenticated) {
        messageElement.textContent = '';
        setLoggedInUser(username);
    } else {
        messageElement.textContent = 'Usuario o contraseña inválidos.';
    }
});

// Manejar el cierre de sesión
logoutButton.addEventListener('click', () => {
    clearLoggedInUser();
});

// Al cargar la aplicación, verifica si un usuario ya ha iniciado sesión
window.addEventListener('load', async () => {
    await initDb(); // Asegura que la DB esté inicializada antes de verificar el estado de login
    const loggedInUser = getLoggedInUser();
    if (loggedInUser) {
        updateUI(loggedInUser);
    } else {
        updateUI(null);
    }
});

// Asegura que app.js no se cachee demasiado agresivamente, para desarrollo
// En producción, tu service worker lo maneja.
if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_APP_JS_UPDATE' });
}
