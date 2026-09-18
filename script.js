// ==========================================
// 1. תפריט מובייל
// ==========================================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');

if(hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

if(navLinks) {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// ==========================================
// 2. זמני תפילה (Hebcal) - חסין שגיאות
// ==========================================
async function fetchHebcalData() {
    const cityId = '293703'; // רחובות
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    try {
        let res = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${d.getFullYear()}&gm=${d.getMonth()+1}&gd=${d.getDate()}&g2h=1`);
        let data = await res.json();
        if(document.getElementById('hebrewDateDisplay')) {
            document.getElementById('hebrewDateDisplay').innerText = `היום: ${data.hebrew} | מעודכן לפי אופק רחובות`;
        }
    } catch {
        if(document.getElementById('hebrewDateDisplay')) document.getElementById('hebrewDateDisplay').innerText = "מציג זמנים משוערים";
    }

    try {
        let shabbatRes = await fetch(`https://www.hebcal.com/shabbat?cfg=json&geonameid=${cityId}&M=on&lg=h`);
        let shabbatData = await shabbatRes.json();
        let parasha="שבת קודש", candles="18:50 (משוער)", havdalah="19:45 (משוער)";
        
        shabbatData.items.forEach(i => {
            if (i.category === 'parashat') parasha = i.hebrew || i.title;
            if (i.category === 'candles') candles = (i.hebrew || i.title).match(/\d{1,2}:\d{2}/)?.[0] || candles;
            if (i.category === 'havdalah') havdalah = (i.hebrew || i.title).match(/\d{1,2}:\d{2}/)?.[0] || havdalah;
        });

        if(document.getElementById('parashaDisplay')) document.getElementById('parashaDisplay').innerText = parasha;
        if(document.getElementById('candleLightingDisplay')) document.getElementById('candleLightingDisplay').innerText = candles;
        if(document.getElementById('havdalahDisplay')) document.getElementById('havdalahDisplay').innerText = havdalah;
    } catch {}

    try {
        let zRes = await fetch(`https://www.hebcal.com/zmanim?cfg=json&geonameid=${cityId}&date=${ds}`);
        let zData = await zRes.json();
        if (zData.times?.sunset && document.getElementById('sunsetDisplay')) {
            document.getElementById('sunsetDisplay').innerText = new Date(zData.times.sunset).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit', hour12:false});
        }
    } catch {}
}

// הפעלת הזמנים מיד כשנטען
document.addEventListener('DOMContentLoaded', fetchHebcalData);

// ==========================================
// 3. ניהול לוח מודעות (Local Storage Admin)
// ==========================================
let isLocalAdminLoggedIn = false;
const LOCAL_ADMIN_PASSWORD = "1234";

const initialUpdates = [
    { id: 1, title: "סליחות ותפילות חודש אלול", content: "המניינים מתקיימים כסדרם בבוקר ובערב.", link: "", date: "אלול" }
];

function getUpdates() {
    const stored = localStorage.getItem('maorei_updates');
    return stored ? JSON.parse(stored) : initialUpdates;
}

function saveUpdates(updates) {
    localStorage.setItem('maorei_updates', JSON.stringify(updates));
    renderUpdates();
}

function renderUpdates() {
    const updatesList = document.getElementById('updatesList');
    if(!updatesList) return;
    
    const updates = getUpdates();
    if (updates.length === 0) {
        updatesList.innerHTML = '<p style="text-align:center; color:#777;">אין הודעות חדשות כרגע.</p>';
        return;
    }

    updatesList.innerHTML = updates.map(item => `
        <div class="update-item">
            <div class="update-info">
                <h4>${item.title} <small style="color:#888;">(${item.date || ''})</small></h4>
                <p>${item.content}</p>
            </div>
            <div class="update-actions">
                ${item.link ? `<a href="${item.link}" target="_blank" class="btn"><i class="fas fa-download"></i> פתח</a>` : ''}
                ${isLocalAdminLoggedIn ? `<button onclick="window.deleteUpdate(${item.id})" class="btn" style="background:#dc3545; color:white;"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>
    `).join('');
}

window.deleteUpdate = function(id) {
    if (confirm("למחוק הודעה זו?")) {
        saveUpdates(getUpdates().filter(u => u.id !== id));
    }
};

const adminLoginBtn = document.getElementById('adminLoginBtn');
if(adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
        if (isLocalAdminLoggedIn) {
            isLocalAdminLoggedIn = false;
            document.getElementById('adminBtnText').innerText = "התחברות מנהל";
            document.getElementById('adminPanel').style.display = "none";
            renderUpdates();
        } else {
            document.getElementById('loginModal').style.display = "flex";
        }
    });
}

const closeModalBtn = document.getElementById('closeModal');
if(closeModalBtn) {
    closeModalBtn.addEventListener('click', () => document.getElementById('loginModal').style.display = "none");
}

const submitLoginBtn = document.getElementById('submitLoginBtn');
if(submitLoginBtn) {
    submitLoginBtn.addEventListener('click', () => {
        if (document.getElementById('adminPassword').value === LOCAL_ADMIN_PASSWORD) {
            isLocalAdminLoggedIn = true;
            document.getElementById('loginModal').style.display = "none";
            document.getElementById('adminBtnText').innerText = "התנתק ממצב מנהל";
            document.getElementById('adminPanel').style.display = "block";
            document.getElementById('loginError').style.display = "none";
            document.getElementById('adminPassword').value = "";
            renderUpdates();
        } else {
            document.getElementById('loginError').style.display = "block";
        }
    });
}

const addUpdateForm = document.getElementById('addUpdateForm');
if(addUpdateForm) {
    addUpdateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const updates = getUpdates();
        updates.unshift({
            id: Date.now(),
            title: document.getElementById('updateTitle').value,
            content: document.getElementById('updateContent').value,
            link: document.getElementById('updateLink').value,
            date: new Date().toLocaleDateString('he-IL')
        });
        saveUpdates(updates);
        addUpdateForm.reset();
        alert("פורסם!");
    });
}
renderUpdates();

// ==========================================
// 4. פורום Firebase 
// ==========================================

// --- חובה להכניס את מפתח ה-Firebase שלך כאן! ---
const firebaseConfig = {
    apiKey: "הכנס-את-שלך-כאן",
    authDomain: "הכנס-את-שלך-כאן",
    projectId: "הכנס-את-שלך-כאן",
    storageBucket: "הכנס-את-שלך-כאן",
    messagingSenderId: "הכנס-את-שלך-כאן",
    appId: "הכנס-את-שלך-כאן"
};

const ADMIN_EMAIL = "gal@example.com"; 

try {
    // בדיקה אם הוכנס מפתח תקין כדי לא להפיל את האתר
    if(firebaseConfig.apiKey !== "הכנס-את-שלך-כאן" && typeof firebase !== 'undefined') {
        
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();

        let currentUser = null;
        let isAdmin = false;

        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                document.getElementById('authPanel').style.display = 'none';
                document.getElementById('userPanel').style.display = 'flex';
                document.getElementById('loggedInUserEmail').innerText = user.email;
                isAdmin = (user.email === ADMIN_EMAIL);
                document.getElementById('adminBadge').style.display = isAdmin ? 'inline' : 'none';
            } else {
                isAdmin = false;
                document.getElementById('authPanel').style.display = 'block';
                document.getElementById('userPanel').style.display = 'none';
            }
            loadMessages();
        });

        document.getElementById('registerBtn').addEventListener('click', () => {
            const email = document.getElementById('userEmail').value;
            const pass = document.getElementById('userPass').value;
            auth.createUserWithEmailAndPassword(email, pass)
                .catch(err => document.getElementById('authError').innerText = err.message);
            document.getElementById('authError').style.display = 'block';
        });

        document.getElementById('loginBtn').addEventListener('click', () => {
            const email = document.getElementById('userEmail').value;
            const pass = document.getElementById('userPass').value;
            auth.signInWithEmailAndPassword(email, pass)
                .catch(err => document.getElementById('authError').innerText = err.message);
            document.getElementById('authError').style.display = 'block';
        });

        document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

        document.getElementById('submitPostBtn').addEventListener('click', async () => {
            const errEl = document.getElementById('postError');
            errEl.style.display = 'none';
            const author = document.getElementById('postAuthorName').value.trim();
            const content = document.getElementById('postContent').value.trim();

            if (!author || !content) { errEl.innerText = "חסר שם או תוכן"; errEl.style.display = 'block'; return; }

            if (!currentUser) {
                const lastPost = localStorage.getItem('lastGuestPostTime');
                if (lastPost && (Date.now() - parseInt(lastPost) < 300000)) {
                    errEl.innerText = `אורחים יכולים לפרסם פעם ב-5 דקות. המתן או התחבר.`;
                    errEl.style.display = 'block';
                    return;
                }
            }

            try {
                await db.collection('messages').add({
                    author: author, content: content,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    uid: currentUser ? currentUser.uid : 'guest'
                });
                if (!currentUser) localStorage.setItem('lastGuestPostTime', Date.now().toString());
                document.getElementById('postContent').value = '';
            } catch (err) {
                errEl.innerText = "שגיאת שמירה במסד הנתונים.";
                errEl.style.display = 'block';
            }
        });

        function loadMessages() {
            db.collection('messages').orderBy('timestamp', 'desc').limit(50)
              .onSnapshot(snapshot => {
                  const feed = document.getElementById('messagesFeed');
                  feed.innerHTML = snapshot.empty ? '<p style="text-align:center;">אין הודעות.</p>' : '';
                  snapshot.forEach(doc => {
                      const msg = doc.data();
                      const date = msg.timestamp ? msg.timestamp.toDate().toLocaleString('he-IL') : 'עכשיו';
                      const delBtn = isAdmin ? `<button class="delete-msg-btn" onclick="window.deleteForumMsg('${doc.id}')"><i class="fas fa-trash"></i></button>` : '';
                      feed.innerHTML += `
                          <div class="message-card">
                              <div class="msg-header"><strong><i class="fas fa-user-circle"></i> ${msg.author}</strong> <span>${date}</span></div>
                              <p class="msg-content">${msg.content}</p>
                              ${delBtn}
                          </div>`;
                  });
              });
        }

        window.deleteForumMsg = function(id) {
            if(confirm('למחוק?')) db.collection('messages').doc(id).delete();
        };

    } else {
        document.getElementById('messagesFeed').innerHTML = '<p style="text-align:center; color:red;">הפורום דורש חיבור ל-Firebase. אנא הכנס את המפתח בקובץ script.js</p>';
    }
} catch(e) { console.error("Firebase Error:", e); }
