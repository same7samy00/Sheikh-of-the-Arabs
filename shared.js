// --- SHARED JAVASCRIPT (shared.js) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- CONFIG (MUST BE IDENTICAL EVERYWHERE) ---
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

// --- FIREBASE INITIALIZATION ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    const protectedPages = ['dashboard.html', 'inventory.html', 'add_product.html'];
    const currentPage = window.location.pathname.split('/').pop();
    if (!user && protectedPages.includes(currentPage)) {
        window.location.href = 'index.html';
    }
});

// --- DYNAMIC ACTIVE TAB & LOGOUT ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            showConfirmation("هل أنت متأكد من تسجيل الخروج؟", async () => {
                await signOut(auth);
                showNotification("تم تسجيل الخروج بنجاح.", "info");
                window.location.href = 'index.html';
            });
        });
    }
});

// --- NOTIFICATION SYSTEM ---
const notificationContainer = document.getElementById('notification-container');
export function showNotification(message, type = 'info', duration = 4000) {
    if (!notificationContainer) return;

    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    let iconClass = 'ri-information-line';
    if (type === 'success') iconClass = 'ri-check-line';
    else if (type === 'error') iconClass = 'ri-error-warning-line';
    else if (type === 'warning') iconClass = 'ri-alert-line';

    notificationDiv.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
    notificationContainer.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.style.animation = 'fadeOut 0.5s forwards';
        notificationDiv.addEventListener('animationend', () => notificationDiv.remove());
    }, duration);
}

export function showConfirmation(message, onConfirm) {
    if (!notificationContainer) return;
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification warning confirm';
    notificationDiv.innerHTML = `
        <div><i class="ri-question-line"></i><span>${message}</span></div>
        <div class="confirm-buttons">
            <button class="btn btn-primary confirm-yes">نعم</button>
            <button class="btn btn-secondary confirm-cancel">إلغاء</button>
        </div>
    `;
    notificationContainer.appendChild(notificationDiv);

    const removeNotification = () => {
        notificationDiv.style.animation = 'fadeOut 0.5s forwards';
        notificationDiv.addEventListener('animationend', () => notificationDiv.remove());
    };

    notificationDiv.querySelector('.confirm-yes').addEventListener('click', () => {
        onConfirm();
        removeNotification();
    });
    notificationDiv.querySelector('.confirm-cancel').addEventListener('click', removeNotification);
}

// --- QR SCANNER COMMUNICATION ---
const scannerSessionDocRef = doc(db, 'scannerSessions', SHARED_SCANNER_SESSION_ID);
let scannerUnsubscribe = null;

export async function requestScan(purpose) {
    showNotification("جاري إرسال طلب المسح إلى الهاتف...", "info");
    try {
        await setDoc(scannerSessionDocRef, {
            status: 'scanRequested',
            purpose: purpose,
            requestedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Error requesting scan:", error);
        showNotification("فشل طلب المسح. تحقق من الاتصال.", "error");
    }
}

export function listenToScannerSession(callback) {
    if (scannerUnsubscribe) scannerUnsubscribe();

    scannerUnsubscribe = onSnapshot(scannerSessionDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'scanned' && data.scannedValue) {
                if (callback) {
                    callback(data.scannedValue, data.purpose);
                }
                // Reset the status so the phone knows the desktop received it
                await updateDoc(scannerSessionDocRef, {
                    status: 'readyForNextScan',
                    scannedValue: null
                });
            } else if (data.status === 'phoneReady') {
                showNotification("ماسح QR بالهاتف متصل وجاهز.", "success", 2000);
            }
        }
    }, (error) => {
        console.error("Error listening to scanner session:", error);
        showNotification("خطأ في الاتصال بالماسح.", "error");
    });
}
