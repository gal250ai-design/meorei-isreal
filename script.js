// ==========================================
// 1. הגדרות Firebase - חובה להכניס את הקוד שלך כאן!
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC5mTjRvWKThlVOIXppdfO9HFaihc6c0tc",
  authDomain: "meroreisrael.firebaseapp.com",
  projectId: "meroreisrael",
  storageBucket: "meroreisrael.firebasestorage.app",
  messagingSenderId: "344922413694",
  appId: "1:344922413694:web:344357a5418229aedb162f",
  measurementId: "G-FW3B3CNDVJ"
};

// אתחול Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// === הגדרת אימייל מנהל האתר ===
// הכנס כאן את המייל שאיתו תירשם לאתר. המערכת תזהה אותך ותיתן לך הרשאת מחיקת הודעות.
const ADMIN_EMAIL = "gal@example.com"; 

// ==========================================
// 2. פונקציות הפורום (קיר הקהילה)
// ==========================================
const authPanel = document.getElementById('authPanel');
const userPanel = document.getElementById('userPanel');
const loggedInUserEmail = document.getElementById('loggedInUserEmail');
const adminBadge = document.getElementById('adminBadge');
const messagesFeed = document.getElementById('messagesFeed');
const postError = document.getElementById('postError');

let currentUser = null;
let isAdmin = false;

// האזנה למצב התחברות (מי מחובר כרגע)
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authPanel.style.display = 'none';
        userPanel.style.display = 'flex';
        loggedInUserEmail.innerText = user.email;
        
        // בדיקת הרשאת מנהל
        if (user.email === ADMIN_EMAIL) {
            isAdmin = true;
            adminBadge.style.display = 'inline';
        } else {
            isAdmin = false;
            adminBadge.style.display = 'none';
        }
    } else {
        currentUser = null;
        isAdmin = false;
        authPanel.style.display = 'block';
        userPanel.style.display = 'none';
    }
    loadMessages(); // טעינת הודעות מחדש כדי להציג/להסתיר כפתורי מחיקה למנהל
});

// הרשמה
document.getElementById('registerBtn').addEventListener('click', () => {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.createUserWithEmailAndPassword(email, pass)
        .catch(error => document.getElementById('authError').innerText = "שגיאה בהרשמה: " + error.message)
        .then(() => { document.getElementById('authError').innerText = ""; });
    document.getElementById('authError').style.display = 'block';
});

// התחברות
document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .catch(error => document.getElementById('authError').innerText = "שגיאה בהתחברות: " + error.message)
        .then(() => { document.getElementById('authError').innerText = ""; });
    document.getElementById('authError').style.display = 'block';
});

// התנתקות
document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// פרסום הודעה לקיר (כולל הגבלת ספאם לאורחים)
document.getElementById('submitPostBtn').addEventListener('click', async () => {
    postError.style.display = 'none';
    const authorName = document.getElementById('postAuthorName').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!authorName || !content) {
        postError.innerText = "נא למלא שם ותוכן הודעה.";
        postError.style.display = 'block';
        return;
    }

    // בדיקת הגבלת 5 דקות לאורחים לא רשומים
    if (!currentUser) {
        const lastPostTime = localStorage.getItem('lastGuestPostTime');
        if (lastPostTime) {
            const timePassed = Date.now() - parseInt(lastPostTime);
            const minutesLeft = Math.ceil((300000 - timePassed) / 60000); // 300,000ms = 5 mins
            if (timePassed < 300000) {
                postError.innerText = `אורחים מוגבלים בפרסום. תוכל לפרסם שוב בעוד כ-${minutesLeft} דקות, או התחבר כדי לפרסם ללא הגבלה.`;
                postError.style.display = 'block';
                return;
            }
        }
    }

    try {
        await db.collection('messages').add({
            author: authorName,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            uid: currentUser ? currentUser.uid : 'guest'
        });

        // עדכון זמן פרסום אחרון לאורחים כדי למנוע ספאם
        if (!currentUser) {
            localStorage.setItem('lastGuestPostTime', Date.now().toString());
        }

        document.getElementById('postContent').value = '';
    } catch (error) {
        postError.innerText = "שגיאה בפרסום ההודעה. ודא שהגדרות ה-Firestore מאפשרות כתיבה.";
        postError.style.display = 'block';
        console.error(error);
    }
});

// טעינת הודעות בזמן אמת ממסד הנתונים
function loadMessages() {
    db.collection('messages').orderBy('timestamp', 'desc').limit(50)
      .onSnapshot(snapshot => {
          messagesFeed.innerHTML = '';
          if (snapshot.empty) {
              messagesFeed.innerHTML = '<p style="text-align:center;">אין עדיין הודעות בקיר. היה הראשון לכתוב!</p>';
              return;
          }

          snapshot.forEach(doc => {
              const msg = doc.data();
              const date = msg.timestamp ? msg.timestamp.toDate().toLocaleString('he-IL') : 'ממש עכשיו';
              
              let deleteBtnHtml = '';
              // אם המשתמש המחובר הוא המנהל, נציג לו כפתור מחיקה
              if (isAdmin) {
                  deleteBtnHtml = `<button class="delete-msg-btn" onclick="deleteMessage('${doc.id}')"><i class="fas fa-trash"></i> מחיקה (מנהל)</button>`;
              }

              messagesFeed.innerHTML += `
                  <div class="message-card">
                      <div class="msg-header">
                          <span class="msg-author"><i class="fas fa-user-circle"></i> ${msg.author}</span>
                          <span class="msg-date">${date}</span>
                      </div>
                      <p class="msg-content">${msg.content}</p>
                      ${deleteBtnHtml}
                  </div>
              `;
          });
      });
}

// פונקציית מחיקה (חשופה ל-window כדי שהכפתור ב-HTML יזהה אותה)
window.deleteMessage = function(docId) {
    if (confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) {
        db.collection('messages').doc(docId).delete()
          .catch(error => alert("שגיאה במחיקת הודעה: " + error));
    }
};


// ==========================================
// 3. תפריט מובייל
// ==========================================
document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('active');
    });
});

// ==========================================
// 4. זמני תפילה אוטומטיים (Hebcal API) 
// ==========================================
async function fetchHebcalData() {
    const cityId = '293703'; // רחובות
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    try {
        let res = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${d.getFullYear()}&gm=${d.getMonth()+1}&gd=${d.getDate()}&g2h=1`);
        document.getElementById('hebrewDateDisplay').innerText = `היום: ${(await res.json()).hebrew} | מעודכן לפי אופק רחובות`;
    } catch { document.getElementById('hebrewDateDisplay').innerText = "מציג זמנים משוערים"; }

    try {
        let shabbatData = await (await fetch(`https://www.hebcal.com/shabbat?cfg=json&geonameid=${cityId}&M=on&lg=h`)).json();
        let parasha="שבת קודש", candles="18:50 (משוער)", havdalah="19:45 (משוער)";
        
        shabbatData.items.forEach(i => {
            if (i.category === 'parashat') parasha = i.hebrew || i.title;
            if (i.category === 'candles') candles = (i.hebrew || i.title).match(/\d{1,2}:\d{2}/)?.[0] || candles;
            if (i.category === 'havdalah') havdalah = (i.hebrew || i.title).match(/\d{1,2}:\d{2}/)?.[0] || havdalah;
        });

        document.getElementById('parashaDisplay').innerText = parasha;
        document.getElementById('candleLightingDisplay').innerText = candles;
        document.getElementById('havdalahDisplay').innerText = havdalah;
    } catch {}

    try {
        let zData = await (await fetch(`https://www.hebcal.com/zmanim?cfg=json&geonameid=${cityId}&date=${ds}`)).json();
        if (zData.times?.sunset) document.getElementById('sunsetDisplay').innerText = new Date(zData.times.sunset).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
    } catch {}
}

document.addEventListener('DOMContentLoaded', fetchHebcalData);