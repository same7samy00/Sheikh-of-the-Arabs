import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyC5ls-rPdJ65x5BoMGwAOpdcPtD585C2ys",
    authDomain: "pharmacy-inventory-bf04a.firebaseapp.com",
    projectId: "pharmacy-inventory-bf04a",
    storageBucket: "pharmacy-inventory-bf04a.firebasestorage.app",
    messagingSenderId: "937788650384",
    appId: "1:937788650384:web:6451225d00e648f3a0b915",
    measurementId: "G-ZGC9EQ55SL"
};
const SHARED_SCANNER_SESSION_ID = "YOUR_STORE_UNIQUE_SCANNER_ID_12345";

// --- Initialize & Export Services ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Authentication Guard ---
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    if (!user && !isLoginPage) {
        window.location.href = 'index.html';
    }
});

// --- Dynamic Active Tab & Logout ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
                await signOut(auth);
                window.location.href = 'index.html';
            }
        });
    }
});

// --- Shared Functions ---
export function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

const scannerSessionDocRef = doc(db, 'scannerSessions', SHARED_SCANNER_SESSION_ID);
let scannerUnsubscribe = null;

export function requestScan(purpose) {
    showNotification("جاري طلب المسح من الهاتف...", "info");
    updateDoc(scannerSessionDocRef, {
        status: 'scanRequested',
        purpose: purpose,
        requestedAt: new Date()
    }).catch(() => setDoc(scannerSessionDocRef, { status: 'scanRequested', purpose: purpose, requestedAt: new Date() }));
}

export function listenToScannerSession(callback) {
    if (scannerUnsubscribe) scannerUnsubscribe();
    scannerUnsubscribe = onSnapshot(scannerSessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'scanned' && data.scannedValue) {
                callback(data.scannedValue, data.purpose);
                updateDoc(scannerSessionDocRef, { status: 'readyForNextScan', scannedValue: null });
            }
        }
    });
}
