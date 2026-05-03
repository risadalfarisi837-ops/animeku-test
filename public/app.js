// ==========================================
// 1. FIREBASE CONFIGURATION & INIT
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDHtgikUcph-eQh7qZEJELFogpPjIgtB0M",
  authDomain: "animeku-c39ab.firebaseapp.com",
  databaseURL: "https://animeku-c39ab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "animeku-c39ab",
  storageBucket: "animeku-c39ab.firebasestorage.app",
  messagingSenderId: "583107813249",
  appId: "1:583107813249:web:4a2ebe047393f4f744d280",
  measurementId: "G-3E8VRPRM0F"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.database(); let currentUser = null;

// ==========================================
// FITUR FORCE LOGIN GATE (FIX FINAL: TOMBOL BESAR + AUTO-LOGIN/REMEMBER ME)
// ==========================================
window.injectLoginGate = function() {
    // Kalau udah ada di layar, jangan ditimpa
    if(document.getElementById('login-gate-overlay')) return;
    
    const div = document.createElement('div');
    div.id = 'login-gate-overlay';
    div.style.cssText = 'position:fixed; inset:0; background:#0a0a0a; z-index:999999999; color:#fff; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow:hidden; touch-action:none;';

    div.innerHTML = `
        <style>
            #gate-track { height: 300vh; height: 300dvh; width: 100%; display: flex; flex-direction: column; transition: transform 0.5s cubic-bezier(0.25, 1, 0.35, 1); transform: translateY(0); }
            .gate-page { height: 100vh; height: 100dvh; width: 100vw; position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 0 35px; }
            .content-center { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; transform: translateY(-5vh); }
            .content-left { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; width: 100%; transform: translateY(-8vh); }
            .gate-title { font-size: 32px; font-weight: 800; margin: 0 0 15px 0; letter-spacing: -0.5px; text-align: left; width: 100%; }
            .gate-desc { color: #a1a1aa; font-size: 14px; line-height: 1.5; margin: 0; font-weight: 400; text-align: left; width: 100%; }
            .swipe-bottom-area { position: absolute; bottom: 45px; left: 0; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; opacity: 0.9; z-index: 10; transition: 0.2s; }
            .swipe-bottom-area:active { opacity: 1; transform: scale(0.95); }
            .pill-icon { width: 14px; height: 38px; border: 1.5px solid #666; border-radius: 10px; position: relative; display: block; }
            .pill-dot { width: 4px; height: 4px; background: #fff; border-radius: 50%; position: absolute; left: 50%; transform: translateX(-50%); top: 6px; animation: swipePill 1.5s infinite ease-in-out; }
            @keyframes swipePill { 0% { transform: translate(-50%, 20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translate(-50%, 0px); opacity: 0; } }
            .circle-icon { width: 12px; height: 12px; border: 1.5px solid #666; border-radius: 50%; position: relative; display: block; }
            .circle-dot { width: 4px; height: 4px; background: #666; border-radius: 50%; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }

            /* Tombol Google Gembrot */
            .google-btn { display: flex; align-items: center; justify-content: flex-start; gap: 18px; background: #1c1c1e; color: #fff; padding: 12px 18px; border-radius: 18px; font-weight: 700; font-size: 16px; border: none; cursor: pointer; margin-top: 30px; width: 100%; box-sizing: border-box; transition: 0.2s; }
            .google-btn:active { transform: scale(0.97); background: #2c2c2e; }
            .google-icon-wrapper { background: #fff; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .google-icon-wrapper img { width: 22px; height: 22px; }
            
            .tester-outline-btn { background: #1c1c1e; border: none; color: #a1a1aa; padding: 8px 14px; border-radius: 10px; font-weight: 500; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 15px; transition: 0.2s; }
            .tester-outline-btn:active { background: #2c2c2e; transform: scale(0.96); }

            /* Modal Tester */
            .t-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100000; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
            .t-box { background: #1c1c1e; width: 85%; max-width: 320px; border-radius: 24px; padding: 30px 25px; box-sizing: border-box; display: none; flex-direction: column; align-items: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid #2c2c2e; }
            .t-input { width: 100%; background: #111; border: none; color: #fff; padding: 15px; border-radius: 12px; font-size: 24px; outline: none; text-align: center; box-sizing: border-box; font-weight: 900; margin-bottom: 25px; letter-spacing: 5px; }
            .t-btn-login { flex: 1; background: #3b82f6; color: #fff; font-weight: 800; font-size: 14px; padding: 12px; border: none; border-radius: 12px; cursor: pointer; transition: 0.2s; }
            .t-btn-login:active { transform: scale(0.96); }
            .t-btn-cancel { flex: 1; background: #111; color: #fff; font-weight: 800; font-size: 14px; padding: 12px; border: none; border-radius: 12px; cursor: pointer; transition: 0.2s; }
            .t-btn-cancel:active { transform: scale(0.96); }
            .t-loading { display: none; flex-direction: column; align-items: center; justify-content: center; }
            .t-spinner { width: 35px; height: 35px; border: 4px solid rgba(59, 130, 246, 0.2); border-top-color: #3b82f6; border-radius: 50%; animation: tSpin 1s linear infinite; margin-bottom: 15px; }
            @keyframes tSpin { 100% { transform: rotate(360deg); } }
        </style>

        <div id="gate-track">
            <div class="gate-page">
                <div class="content-center">
                    <div style="font-size: 42px; font-weight: 900; letter-spacing: -1px;">.WELCOME.</div>
                </div>
                <div class="swipe-bottom-area" onclick="window.nextGatePage()">
                    <div class="pill-icon"><div class="pill-dot"></div></div>
                    <div style="font-size: 13px; font-weight: 500; color: #fff;">Swipe Up to continue</div>
                </div>
            </div>

            <div class="gate-page">
                <div class="content-left">
                    <h1 class="gate-title">Disclaimer</h1>
                    <p class="gate-desc">
                        Animeku is an Unofficial Apps.<br>
                        All trademarks and copyright protected to the respective owner. We do not accept responsibility for content hosted on third party and does not have any involvement in the downloading/uploading. We just post link available in internet. If you think any of the contents infringes any intellectual property law and you hold the copyright of that content report it to <span style="color:#3b82f6; font-weight:600;">animeku@gmail.com</span> and the content will be immediately removed. By using this Application, you signify your acceptance of this policy
                    </p>
                </div>
                <div class="swipe-bottom-area" onclick="window.nextGatePage()">
                    <div class="circle-icon"><div class="circle-dot"></div></div>
                    <div style="font-size: 13px; font-weight: 500; color: #fff;">Swipe Up to continue</div>
                </div>
            </div>

            <div class="gate-page">
                <div class="content-left" style="margin-bottom: 40px;">
                    <h1 class="gate-title">Login</h1>
                    <p class="gate-desc">Aplikasi kami mewajibkan kamu untuk<br>login menggunakan email Google</p>
                    <button onclick="window.customGoogleLogin()" class="google-btn">
                        <div class="google-icon-wrapper">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G">
                        </div>
                        Tekan di sini untuk Login
                    </button>
                </div>
                <div style="position: absolute; bottom: 40px; left: 35px; right: 35px; display: flex; flex-direction: column; align-items: flex-start;">
                    <button onclick="window.openVideoTesterModal()" class="tester-outline-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        Tester Login
                    </button>
                    <div style="color: #a1a1aa; font-size: 13px; line-height: 1.5; text-align: left;">
                        Dengan melakukan login maka kamu<br>telah setuju dengan<br>
                        <span style="color:#3b82f6; font-weight:600;">Privacy Policy</span> & <span style="color:#3b82f6; font-weight:600;">Terms of Service</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="videoTesterOverlay" class="t-overlay">
            <div id="v-modal-input" class="t-box">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h3 style="color:#fff; margin:0 0 5px 0; font-size:18px; font-weight:800;">Akses Developer</h3>
                <p style="color:#a1a1aa; font-size:13px; margin:0 0 25px 0;">Masukkan PIN rahasia untuk lanjut.</p>
                <input type="password" id="v-tester-user" class="t-input" placeholder="••••••••">
                <div style="display:flex; gap:12px; width:100%;">
                    <button onclick="window.closeVideoTester()" class="t-btn-cancel">Batal</button>
                    <button onclick="window.processVideoTester()" class="t-btn-login">Masuk</button>
                </div>
            </div>
            <div id="v-modal-loading" class="t-loading">
                <div class="t-spinner"></div>
                <div style="color:#3b82f6; font-weight:700; font-size:14px; letter-spacing:0.5px;">Harap Tunggu</div>
            </div>
            <div id="v-modal-error" class="t-box" style="padding: 30px 20px;">
                <div style="width: 55px; height: 55px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <h3 style="color:#fff; font-size:22px; font-weight:800; margin:0 0 5px 0;">Ooops!</h3>
                <p style="color:#a1a1aa; font-size:14px; font-weight:500; margin:0 0 25px 0;">PIN yang dimasukkan salah.</p>
                <button onclick="window.closeVideoTester()" class="t-btn-cancel" style="width: 100%;">Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    // =====================================
    // LOGIKA SLIDER (GANTI HALAMAN PER HALAMAN)
    // =====================================
    let currentPage = 0;
    const track = document.getElementById('gate-track');

    window.nextGatePage = function() {
        if(currentPage < 2) {
            currentPage++;
            track.style.transform = `translateY(-${currentPage * 100}vh)`;
            track.style.cssText = `height: 300vh; height: 300dvh; transition: transform 0.5s cubic-bezier(0.25, 1, 0.35, 1); transform: translateY(calc(-${currentPage} * 100vh)); transform: translateY(calc(-${currentPage} * 100dvh));`;
        }
    };

    let startY = 0;
    div.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive: true});
    div.addEventListener('touchend', e => {
        let diff = startY - e.changedTouches[0].clientY;
        if(document.getElementById('videoTesterOverlay').style.display === 'flex') return;

        if(diff > 50 && currentPage < 2) { 
            currentPage++;
            track.style.transform = `translateY(-${currentPage * 100}vh)`;
            track.style.cssText = `height: 300vh; height: 300dvh; transition: transform 0.5s cubic-bezier(0.25, 1, 0.35, 1); transform: translateY(calc(-${currentPage} * 100vh)); transform: translateY(calc(-${currentPage} * 100dvh));`;
        } else if(diff < -50 && currentPage > 0) { 
            currentPage--;
            track.style.transform = `translateY(-${currentPage * 100}vh)`;
            track.style.cssText = `height: 300vh; height: 300dvh; transition: transform 0.5s cubic-bezier(0.25, 1, 0.35, 1); transform: translateY(calc(-${currentPage} * 100vh)); transform: translateY(calc(-${currentPage} * 100dvh));`;
        }
    }, {passive: true});

    // =====================================
    // LOGIKA MODAL TESTER 
    // =====================================
    window.openVideoTesterModal = function() {
        document.getElementById('videoTesterOverlay').style.display = 'flex';
        document.getElementById('v-modal-input').style.display = 'flex';
        document.getElementById('v-modal-loading').style.display = 'none';
        document.getElementById('v-modal-error').style.display = 'none';
        document.getElementById('v-tester-user').value = '';
    };
    window.closeVideoTester = function() {
        document.getElementById('videoTesterOverlay').style.display = 'none';
    };

    window.processVideoTester = function() {
        const username = document.getElementById('v-tester-user').value;
        document.getElementById('v-modal-input').style.display = 'none';
        document.getElementById('v-modal-loading').style.display = 'flex';

        setTimeout(() => {
            document.getElementById('v-modal-loading').style.display = 'none';

            if (username === "Animeku1928") {
                // SIMPAN SESI TESTER KE DALAM MEMORI HP!
                localStorage.setItem('animeku_tester_session', 'true');
                
                window.closeVideoTester();
                window.showToast("Akses Diterima! Login sebagai Developer.", "success");
                
                currentUser = {
                    uid: "DEV_TESTER_999",
                    displayName: "Admin Animeku",
                    email: "admin@animeku.app",
                    photoURL: "https://placehold.co/100/3b82f6/fff?text=DEV",
                    metadata: { creationTime: new Date().toString() }
                };
                
                let gate = document.getElementById('login-gate-overlay');
                gate.style.transition = 'opacity 0.4s ease';
                gate.style.opacity = '0';
                setTimeout(() => {
                    gate.remove();
                    if(typeof switchTab === 'function') switchTab('home');
                }, 400);

                if(typeof updateDevUI === 'function') updateDevUI();
                if(typeof syncProgressWithFirebase === 'function') syncProgressWithFirebase();
                if(typeof listenForGifts === 'function') listenForGifts();
            } 
            else {
                document.getElementById('v-modal-error').style.display = 'flex';
            }
        }, 1500);
    };

    // =====================================
    // LOGIKA GOOGLE LOGIN
    // =====================================
    window.customGoogleLogin = function() {
        const provider = new firebase.auth.GoogleAuthProvider(); 
        auth.signInWithPopup(provider).then(res => {
            window.showToast("Login Berhasil! Selamat datang, " + res.user.displayName, 'success'); 
            
            let gate = document.getElementById('login-gate-overlay');
            if(gate) {
                gate.style.transition = 'opacity 0.4s ease';
                gate.style.opacity = '0';
                setTimeout(() => {
                    gate.remove();
                    if(typeof switchTab === 'function') switchTab('home'); 
                }, 400);
            }
        }).catch(err => {
            if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') { 
                window.showToast("Gagal login: " + err.message, 'error'); 
            }
        });
    };
};

// ==========================================
// 🔴 SISTEM AUTO-LOGIN & INGAT SESI 🔴
// Taruh kode ini persis di bawah injectLoginGate atau di bagian bawah app.js kamu
// ==========================================
auth.onAuthStateChanged((user) => {
    // 1. Cek apakah ada ingatan sesi Tester Login di HP
    const isTester = localStorage.getItem('animeku_tester_session') === 'true';

    if (user || isTester) {
        // JIKA USER UDAH LOGIN (Google atau Tester)
        if (user) {
            currentUser = user; // Simpan data user Google asli
        } else if (isTester) {
            // Buat data palsu untuk Tester karena Google-nya kosong
            currentUser = {
                uid: "DEV_TESTER_999",
                displayName: "Admin Animeku",
                email: "admin@animeku.app",
                photoURL: "https://placehold.co/100/3b82f6/fff?text=DEV"
            };
        }

        // A. Pastikan layar Login Gate dihapus (nggak usah dimunculin)
        let gate = document.getElementById('login-gate-overlay');
        if (gate) gate.remove();

        // B. Otomatis masuk ke halaman Home
        if(typeof switchTab === 'function') switchTab('home');

        // C. Jalanin fungsi load data aplikasi kamu
        if(typeof updateDevUI === 'function') updateDevUI();
        if(typeof syncProgressWithFirebase === 'function') syncProgressWithFirebase();
        
    } else {
        // JIKA USER BELUM LOGIN SAMA SEKALI
        currentUser = null;
        window.injectLoginGate(); // Baru dimunculin layar loginnya!
    }
});

// ==========================================
// FUNGSI LOGOUT (Wajib pakai ini biar memori Testernya ikut kehapus)
// ==========================================
window.logoutApp = function() {
    // Hapus memori Tester
    localStorage.removeItem('animeku_tester_session');
    
    // Proses logout Google dari Firebase
    auth.signOut().then(() => {
        window.showToast("Berhasil Keluar", "success");
        // Munculin layar loginnya lagi
        window.injectLoginGate();
    }).catch((err) => {
        window.showToast("Gagal Keluar: " + err.message, "error");
    });
};

// ==========================================
// KATALOG BORDER
// ==========================================
window.BORDER_CATALOG = {
    'glitch_merah': { nama: 'Glitch Merah (Mythic)', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1436367668897775757/animated' },
    'blue_premium': { nama: 'Blue Premium', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1373015260507930664/animated' },
    'phoenix': { nama: 'Phoenix', harga: 750, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1298033986622328842/animated' },
    'venom': { nama: 'Venom', harga: 800, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1481388474673139855/animated' },
    'black-mana': { nama: 'Black Mana', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1379220459026911342/animated' },
    'the-haxcore': { nama: 'The Hacxcore', harga: 2000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165171294268/animated' },
    'fishbones': { nama: 'FISHBONES!', harga: 1500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165150322698/animated' },
    'hologram-dragon': { nama: 'Hologram Dragon', harga: 3000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1366494385583165630/animated' },
    'baby-displacer-beast': { nama: 'Baby-Displacer-Beast', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1293373563352649961/animated' },
    'fallen-angel-(black)': { nama: 'Fallen Angel (Black)', harga: 700, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1462116613682757888/animated' },
    'spider-man': { nama: 'Spider Man', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1481384635886862397/animated' },
    'super-recognizer': { nama: 'Super Recognizer', harga: 1200, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1437881614062452838/animated' },
    'infinite-swirl': { nama: 'Infinite Swirl', harga: 800, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1427463138634109027/animated' },
    'juggernaut-astro': { nama: 'Juggernaut Astro', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1387888352639975484/animated' },
    'the-anomaly': { nama: 'The-Anomaly', harga: 2000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1306752744258011166/animated' },
    'purple-animation': { nama: 'Purple-Animation', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165192265799/animated' },
    'dark-hood': { nama: 'Dark Hood', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633615765524/animated' },
    'dark-hood (crimson)': { nama: 'Drak Hood (crimson)', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633645125653/animated' },
    'zombie-food': { nama: 'Zombie Food', harga: 1500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633762701382/animated' },
    'juri': { nama: 'Juri', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1285465421193154560/animated' }
};

// ==== CUSTOM TOAST NOTIFICATION ====
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('custom-toast-container');
    if (!container) {
        container = document.createElement('div'); container.id = 'custom-toast-container';
        container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999999; display:flex; flex-direction:column; gap:10px; pointer-events:none; width: 90%; max-width: 350px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div'); const bgColor = type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#ef4444';
    const iconSvg = type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : type === 'info' ? '<polyline points="12 8 12 12 12 16"></polyline><circle cx="12" cy="12" r="10"/>' : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    toast.style.cssText = `background:#1c1c1e; border:1px solid #333; border-left: 4px solid ${bgColor}; border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:12px; box-shadow:0 10px 25px rgba(0,0,0,0.8); transform:translateY(-30px); opacity:0; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); pointer-events:none;`;
    toast.innerHTML = `<div style="background:${bgColor}; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow: 0 0 10px ${bgColor}80;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">${iconSvg}</svg></div><div style="color:#fff; font-size:13px; font-weight:700; line-height:1.4;">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
    setTimeout(() => { if(toast.parentNode) { toast.style.transform = 'translateY(-30px)'; toast.style.opacity = '0'; setTimeout(() => { if(toast.parentNode) toast.remove(); }, 300); } }, 3000);
};

// ==== INJEKSI CSS PREMIUM ====
function injectPremiumStyles() {
    if(document.getElementById('premium-rank-styles')) document.getElementById('premium-rank-styles').remove();
    const style = document.createElement('style'); style.id = 'premium-rank-styles';
    style.innerHTML = `
        /* TAMBAHAN ANTI KOTAK BAYANGAN SAAT DIPENCET DI HP */
        * {
            -webkit-tap-highlight-color: transparent !important;
            outline: none !important;
        }
        
        @keyframes shimmerPremium { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        .c-badge, .rank-icon { position: relative; overflow: visible !important; } 
        .rank-icon-emerald, .badge-lvl-emerald { animation: none !important; }
        .rank-icon-emerald::after, .rank-icon-emerald::before { display: none !important; content: none !important; animation: none !important; }
        .rank-icon-master, .badge-lvl-master { animation: none !important; }
        .rank-icon-master::before, .rank-icon-master::after { display: none !important; content: none !important; animation: none !important; }
        .badge-lvl-diamond, .rank-icon-diamond { box-shadow: 0 0 12px rgba(6, 182, 212, 0.6) !important; background: linear-gradient(90deg, #2563eb, #06b6d4, #2563eb) !important; background-size: 200% 100% !important; color: #fff !important; border: none !important; animation: shimmerPremium 3s infinite linear !important; }
        .badge-lvl-mythic, .rank-icon-mythic { box-shadow: 0 0 16px rgba(239, 68, 68, 0.7) !important; background: linear-gradient(90deg, #ef4444, #eab308, #ef4444) !important; background-size: 200% 100% !important; color: #fff !important; border: none !important; animation: shimmerPremium 3s infinite linear !important; }
        .avatar-rank-emerald { border: none !important; box-shadow: none !important; }
        .avatar-rank-diamond { border: none !important; box-shadow: none !important; }
        .avatar-rank-master { border: none !important; box-shadow: none !important; }
        .avatar-rank-mythic { border: none !important; box-shadow: none !important; }
        /* CSS PERFECT FIT 120% */
        .avatar-deco-overlay { position: absolute; top: 50%; left: 50%; width: 120%; height: 120%; transform: translate(-50%, -50%); pointer-events: none; z-index: 10; background-size: contain; background-position: center; background-repeat: no-repeat; }
    `;
    document.head.appendChild(style);
}

injectPremiumStyles();

window.syncProgressWithFirebase = function() {
    if(!currentUser) return;
    db.ref('progress/' + currentUser.uid).once('value').then(snap => {
        if(snap.exists()) {
            let cloudProgress = snap.val();
            let localProgress = JSON.parse(localStorage.getItem('watchProgress')) || {};
            let merged = { ...localProgress, ...cloudProgress }; 
            localStorage.setItem('watchProgress', JSON.stringify(merged));
            if(typeof window.renderDetailEpisodeUI === 'function') window.renderDetailEpisodeUI();
        }
    });
};

auth.onAuthStateChanged(user => {
    currentUser = user; 
    updateDevUI();
    if(user) { 
        syncProgressWithFirebase(); 
        listenForGifts(); 
        
        let gate = document.getElementById('login-gate-overlay');
        if(gate) {
            clearTimeout(window.gateSeq);
            gate.style.transition = 'opacity 0.4s ease';
            gate.style.opacity = '0';
            setTimeout(() => gate.remove(), 400);
        }
    } else {
        injectLoginGate();
        
        // TANGKAP HASIL LOGIN REDIRECT DARI HP
        auth.getRedirectResult().then(res => {
            if (res.user) {
                window.showToast("Login Berhasil! Selamat datang, " + res.user.displayName, 'success');
            }
        }).catch(err => {
            if (err.code !== 'auth/popup-closed-by-user') {
                window.showToast("Gagal login: " + err.message, 'error');
            }
        });
    }
    if(document.getElementById('custom-comment-area')) { try { renderCommentInput(window.currentEpID); } catch(e) {} }
});

window.loginDenganGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider(); 
    // Hapus paksaan 'select_account' biar kalau udah pernah login, langsung otomatis masuk
    
    auth.signInWithPopup(provider).then(res => {
        window.showToast("Login Berhasil! Selamat datang, " + res.user.displayName, 'success'); 
        // Logika nyimpen data ke database dihapus dari sini karena udah otomatis dikerjain sama fungsi updateDevUI. Biar nggak balapan/error!
    }).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') { 
            window.showToast("Gagal login: " + err.message, 'error'); 
        }
    });
};

window.logoutAkun = function() { auth.signOut().then(() => { window.showToast("Berhasil keluar dari akun.", 'success'); setTimeout(() => { location.reload(); }, 1500); }); };

// Ganti bagian ini di app.js kamu agar warnanya SOLID (Tebal)
const RANK_TIERS = [
    { name: "Stone", minLvl: 0, maxLvl: 49, color: "#444444", icon: "🌑" }, 
    { name: "Bronze", minLvl: 50, maxLvl: 149, color: "#cd7f32", icon: "🥉" },
    { name: "Silver", minLvl: 150, maxLvl: 499, color: "#bdc3c7", icon: "🥈" }, 
    { name: "Gold", minLvl: 500, maxLvl: 2499, color: "#f1c40f", icon: "🥇" },
    { name: "Emerald", minLvl: 2500, maxLvl: 4999, color: "#2ecc71", icon: "🔮" }, 
    { name: "Diamond", minLvl: 5000, maxLvl: 9999, color: "#3498db", icon: "💎" },
    { name: "Master", minLvl: 10000, maxLvl: 19999, color: "#9b59b6", icon: "👑" }, 
    { name: "Mythic", minLvl: 20000, maxLvl: Infinity, color: "#ef4444", icon: "🌟" }
];
function getRankInfo(level) { return RANK_TIERS.find(r => level >= r.minLvl && level <= r.maxLvl) || RANK_TIERS[0]; }

function updateDevUI() {
    const container = document.getElementById('auth-check-container'); 
    const navbar = document.getElementById('mainNavbar'); 
    if(!container) return;

    const checkHomeActive = () => {
        const homeView = document.getElementById('home-view');
        return (homeView && !homeView.classList.contains('hidden')) ? 'flex' : 'none';
    };

    if(!currentUser) {
        // Update PP di Nav Bawah kalau belum login
        let navPpEl = document.getElementById('nav-bottom-pp');
        if(navPpEl) navPpEl.src = 'https://placehold.co/100';

        container.innerHTML = `<div style="text-align:center; padding: 40px 20px;"><div style="width: 100px; height: 100px; border-radius: 50%; background: #1a1a1a; border: 3px solid #333; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><h2 style="font-weight:900; color:#fff;">Akses Akun Animeku</h2><p style="color:#888; margin-bottom:25px; font-size:14px; line-height:1.5;">Login untuk membuka fitur Level, ikut berdiskusi di kolom Komentar, dan menyimpan progress kamu.</p><button class="login-btn-google" style="display: flex; align-items: center; gap: 10px; background: #fff; color: #000; padding: 12px 20px; border-radius: 12px; font-weight: 800; border: none; width: 100%; justify-content: center; cursor: pointer; margin-top: 15px;" onclick="loginDenganGoogle()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M23.52 12.2727C23.52 11.4218 23.4436 10.6036 23.3018 9.81818H12V14.4545H18.4582C18.18 15.9491 17.3345 17.2145 16.0691 18.0655V21.0545H19.9473C22.2164 18.96 23.52 15.8945 23.52 12.2727Z" fill="#4285F4"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 24C15.24 24 17.9673 22.92 19.9473 21.0545L16.0691 18.0655C15.0055 18.7855 13.6255 19.2218 12 19.2218C8.85273 19.2218 6.18545 17.0945 5.21455 14.2364H1.22182V17.3345C3.20182 21.2727 7.27636 24 12 24Z" fill="#34A853"/><path fill-rule="evenodd" clip-rule="evenodd" d="M5.21455 14.2364C4.96364 13.4836 4.82182 12.6764 4.82182 11.8473C4.82182 11.0182 4.96364 10.2109 5.21455 9.45818V6.36H1.22182C0.447273 7.90909 0 9.81818 0 11.8473C0 13.8764 0.447273 15.7855 1.22182 17.3345L5.21455 14.2364Z" fill="#FBBC05"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 4.47273C13.7673 4.47273 15.3491 5.08364 16.5927 6.27273L20.0345 2.83091C17.9564 0.894545 15.2291 0 12 0C7.27636 0 3.20182 2.72727 1.22182 6.36L5.21455 9.45818C6.18545 6.6 8.85273 4.47273 12 4.47273Z" fill="#EA4335"/></svg> Lanjutkan dengan Google</button></div>`;
        if(navbar) {
            navbar.style.cssText = `display:${checkHomeActive()}; justify-content:space-between; align-items:center; padding:12px 20px; background:#050505; position:relative; z-index:999; width:100%; box-sizing:border-box; border-bottom:1px solid #1a1a1a;`;
            navbar.innerHTML = `<div style="font-size:22px; font-weight:900; color:#3b82f6;">Anime<span style="color:#fff;">ku</span></div><button onclick="injectLoginGate()" style="background:#3b82f6; color:#fff; border:none; padding:8px 16px; border-radius:12px; font-weight:800;">Login</button>`;
        }
    } else {
        container.innerHTML = '<div style="height:50px; display:flex; align-items:center; justify-content:center;"><div class="spinner" style="width:25px; height:25px;"></div></div>';
        db.ref('users/' + currentUser.uid).on('value', async snap => {
            try {
                let data = snap.val(); 
                if(!data) { 
                    data = { nama: currentUser.displayName || 'Wibu', email: currentUser.email || '', foto: currentUser.photoURL || 'https://placehold.co/100', role: 'Member', level: 1, exp: 0, joined: Date.now() }; 
                    await db.ref('users/' + currentUser.uid).set(data); 
                }
                
                let historyData = []; try { historyData = await getHistory(); } catch(e) {}
                const role = data.role || 'Member'; 
                const level = data.level || 1; 
                const exp = data.exp || 0; 
                const creationDate = currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : new Date();
                const joinMonths = Math.max(1, (new Date().getFullYear() - creationDate.getFullYear()) * 12 + (new Date().getMonth() - creationDate.getMonth()));
                let totalMenit = Math.floor(exp * 1.2); if (totalMenit === 0) totalMenit = (historyData.length || 0) * 24;
                const jamNonton = Math.floor(totalMenit / 60);
                const userName = data.nama || 'User Animeku'; 
                const userFoto = data.foto || 'https://placehold.co/100'; 
                const shortUid = "#" + currentUser.uid.substring(0, 6).toUpperCase();

                // UPDATE FOTO PROFIL DI BOTTOM NAV KETIKA LOGIN
                let navPpEl = document.getElementById('nav-bottom-pp');
                if(navPpEl) navPpEl.src = userFoto;
                
                let roleBadgeClass = (role === 'Developer') ? 'badge-dev-anim' : (role === 'Wibu Premium' || level >= 50) ? 'badge-premium-anim' : 'badge-member'; 
                let roleName = (role === 'Developer') ? 'DEV' : (role === 'Wibu Premium' || level >= 50) ? 'Wibu Premium' : role;
                let roleClickAction = (role === 'Developer') ? `onclick="event.stopPropagation(); openDevModal('${shortUid}')" style="cursor:pointer; position:relative; z-index:9999;"` : '';

                const rankInfo = getRankInfo(level); 
                let lvlClass = `badge-lvl-${rankInfo.name.toLowerCase()}`; 
                let avatarClass = `avatar-rank-${rankInfo.name.toLowerCase()}`;

                let decoUrl = data.activeBorder && window.BORDER_CATALOG && window.BORDER_CATALOG[data.activeBorder] ? window.BORDER_CATALOG[data.activeBorder].url : '';
                let decoHtml = decoUrl ? `<div class="avatar-deco-overlay" style="background-image:url('${decoUrl}');"></div>` : '';

                if(navbar) {
                    navbar.style.cssText = `display:${checkHomeActive()}; justify-content:space-between; align-items:center; padding:15px 20px; background:#0a0a0a; position:relative; z-index:999; width:100%; box-sizing:border-box; border-bottom:1px solid #1a1a1a;`;
                    let safeName = userName.length > 15 ? userName.substring(0,15)+'...' : userName;
                    
                    navbar.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="switchTab('developer')">
                            <div class="profile-avatar-container" style="width:45px; height:45px; position:relative; flex-shrink:0;">
                                <img src="${userFoto}" class="profile-avatar ${avatarClass}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid #2c2c2e;">
                                ${decoHtml}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <div id="profile-user-name-display" style="font-weight:900; font-size:16px; color:#fff;">${safeName}</div>
                                    <span class="c-badge ${roleBadgeClass}" style="font-size:9px; padding:2px 6px;">${roleName}</span>
                                </div>
                                <div style="font-size:11px; color:#a1a1aa; font-weight:800; display:flex; align-items:center; gap:8px;">
                                    <span>${shortUid}</span>
                                    <span style="color:${rankInfo.color}; text-shadow: 0 0 5px ${rankInfo.color}40;">${rankInfo.icon} Lvl. ${level}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div onclick="window.openBorderShop()" style="background:rgba(59, 130, 246, 0.15); border:1px solid rgba(59,130,246,0.4); padding:6px 10px; border-radius:20px; display:flex; align-items:center; gap:6px; cursor:pointer; box-shadow: 0 2px 8px rgba(59,130,246,0.2);">
                                <span style="font-size:14px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">🪙</span>
                                <span style="font-weight:900; font-size:13px; color:#fff;">${data.koin || 0}</span>
                            </div>
                            <div onclick="openNotifModal()" style="width:38px; height:38px; background:#1c1c1e; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #2c2c2e; cursor:pointer; position:relative; flex-shrink:0;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                <div style="position:absolute; top:0px; right:2px; width:10px; height:10px; background:#ef4444; border-radius:50%; border:2px solid #0a0a0a;"></div>
                            </div>
                        </div>
                    `;
                }

                let watchProgress = JSON.parse(localStorage.getItem('watchProgress')) || {};
                let historyHtml = (historyData && historyData.length > 0) ? historyData.map(item => {
                    let progress = watchProgress[item.url] || Math.floor(Math.random() * 60 + 20); 
                    const durasiMenit = 24; const currentMenit = Math.floor((progress/100) * durasiMenit);
                    const currentStr = String(currentMenit).padStart(2, '0') + ':' + String(Math.floor(Math.random()*60)).padStart(2,'0') + ' / ' + durasiMenit + ':00';
                    return `
                    <div onclick="loadDetail('${item.url}')" style="display:flex; gap:15px; background:#1c1c1e; padding:12px; border-radius:16px; border:1px solid #2c2c2e; margin-bottom:12px; cursor:pointer;">
                        <div style="position:relative; width:80px; height:100px; flex-shrink:0;">
                            <img src="${item.image || 'https://placehold.co/100'}" style="width:100%; height:100%; border-radius:10px; object-fit:cover; border:1px solid #222;">
                        </div>
                        <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;">
                            <div style="font-weight:800; font-size:14px; color:#fff; margin-bottom:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.title}</div>
                            <div style="font-size:12px; color:#a1a1aa; margin-bottom:12px; font-weight:600;">${item.episode || 'Episode ?'}</div>
                            <div style="width:100%; height:4px; background:#2c2c2e; border-radius:2px; overflow:hidden; margin-bottom: 6px;">
                                <div style="width:${progress}%; height:100%; background:#ef4444; border-radius:2px;"></div>
                            </div>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; color:#555; font-size:13px; margin-top:30px;">Belum ada riwayat tontonan.</p>';

                container.innerHTML = `
                    <div style="position: relative; width: 100%; z-index: 1;">
                        <div class="profile-header" style="padding-top: 40px; display:flex; flex-direction:column; align-items:center;">
                            <div class="profile-avatar-container" onclick="window.openBorderShop()" style="cursor:pointer; position:relative; width:90px; height:90px; border-radius:50%; margin-bottom:10px;">
                                <img src="${userFoto}" class="profile-avatar ${avatarClass}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">${decoHtml}
                            </div>
                            <div class="profile-name" onclick="window.openChangeNameModal()" style="cursor:pointer; margin-bottom:15px;">${userName}</div>
                            
                            <div class="profile-badges" style="display:flex; gap:8px; justify-content:center; align-items:center; flex-wrap: wrap;">
                                <span class="c-badge ${roleBadgeClass}" ${roleClickAction}>${roleName}</span>
                                <span class="c-badge ${lvlClass}" onclick="openLevelModal(${level}, ${exp}, ${jamNonton})">${rankInfo.icon} Lvl. ${level}</span>
                                <span style="color:#a1a1aa; font-family:monospace; font-size:11px; font-weight:800; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:10px; border:1.5px solid rgba(255,255,255,0.1);">${shortUid}</span>
                            </div>
                        </div>
                        <div class="profile-stats">
                            <div class="stat-box"><div class="stat-val">${totalMenit}</div><div class="stat-lbl">menit<br>menonton</div></div>
                            <div class="stat-box"><div class="stat-val" id="stat-komentar-val">...</div><div class="stat-lbl">jumlah<br>komentar</div></div>
                            <div class="stat-box"><div class="stat-val">${joinMonths}</div><div class="stat-lbl">bulan<br>bergabung</div></div>
                        </div>
                        <div class="profile-tabs"><div class="ptab active" onclick="switchProfileTab('all', this)">All</div><div class="ptab" onclick="switchProfileTab('comments', this)">Comments</div><div class="ptab" onclick="switchProfileTab('history', this)">History</div></div>
                        <div id="ptab-all" class="ptab-content">${historyHtml}</div>
                        <div id="ptab-comments" class="ptab-content" style="display:none; padding-top: 10px;"><div style="text-align:center; padding:30px;"><div class="spinner" style="width:20px; height:20px; margin:0 auto;"></div></div></div>
                        <div id="ptab-history" class="ptab-content" style="display:none; padding: 0 10px;">${historyHtml}</div>
                        <button onclick="openLogoutModal()" style="margin: 20px; width:calc(100% - 40px); background:transparent; border:1px solid #333; color:#ef4444; padding:12px; border-radius:12px; font-weight:800; cursor:pointer;">Keluar Akun</button>
                    </div>
                `;

                db.ref('comments').once('value').then(commentsSnap => {
                    let myComments = [];
                    if(commentsSnap.exists()) {
                        commentsSnap.forEach(epSnap => { 
                            epSnap.forEach(cSnap => { 
                                let c = cSnap.val(); 
                                if(c && c.uid === currentUser.uid) { myComments.push({ ...c, date: new Date(c.waktu || Date.now()).toLocaleDateString('id-ID') }); }
                            }); 
                        });
                    }
                    let statVal = document.getElementById('stat-komentar-val'); if(statVal) statVal.innerText = myComments.length;
                    
                    const tabComments = document.getElementById('ptab-comments');
                    if(tabComments) {
                        if(myComments.length === 0) { 
                            tabComments.innerHTML = '<p style="text-align:center; color:#555; font-size:13px; margin-top:30px;">Belum ada aktivitas komentar.</p>'; 
                        } else {
                            myComments.sort((a, b) => b.waktu - a.waktu);
                            tabComments.innerHTML = myComments.map(c => {
                                let d = new Date(c.waktu || Date.now()); let dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                                return `
                                    <div style="background: #1c1c1e; border-radius: 16px; padding: 15px; margin-bottom: 15px;">
                                        <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center; cursor: pointer;" onclick="loadDetail('${c.url}')">
                                            <div style="position:relative; flex-shrink:0;">
                                                <img src="${c.animeImage || 'https://placehold.co/100'}" style="width:48px; height:48px; border-radius:10px; object-fit:cover; border: 1px solid #222;">
                                                <div style="position:absolute; bottom:-4px; right:-4px; background:#1c1c1e; border-radius:50%; padding:2px;"><img src="${userFoto}" style="width:16px; height:16px; border-radius:50%; object-fit:cover; display:block;"></div>
                                            </div>
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="font-weight: 800; font-size: 14px; color: #fff; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${c.animeTitle || 'Anime'}</div>
                                                <div style="font-size: 12px; color: #a1a1aa; font-weight: 500;">${c.animeEp || 'Episode ?'} • ${dateStr}</div>
                                            </div>
                                        </div>
                                        <div style="font-size: 14px; color: #fff; line-height: 1.5; margin-bottom: 8px; word-wrap: break-word;">${c.teks}</div>
                                        <div style="font-size: 13px; color: #3b82f6; font-weight: 700; cursor: pointer; display: inline-block;" onclick="loadDetail('${c.url}')">Reply</div>
                                    </div>
                                `;
                            }).join('');
                        }
                    }
                }).catch(e => { let statVal = document.getElementById('stat-komentar-val'); if(statVal) statVal.innerText = '0'; });
            } catch(e) { console.error(e); }
        });
    }
}

// ==== FUNGSI UNTUK PROFIL ORANG LAIN ====
function injectUserProfileModal() {
    if(document.getElementById('user-profile-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'user-profile-modal-injected';
    div.innerHTML = `
        <div id="userProfileOverlay" class="modal-overlay" onclick="closeUserProfileModal()"></div>
        <div id="userProfileModal" class="bottom-sheet" style="display:none; background:#050505; z-index:999999; border-radius:24px 24px 0 0; padding:0; flex-direction:column; max-height:85vh; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); border-top: 1px solid #1a1a1a;">
            <div style="padding: 15px 20px; display:flex; justify-content:flex-end; border-bottom: 1px solid #111;">
                <button onclick="closeUserProfileModal()" style="background:rgba(255,255,255,0.1); border:none; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div id="user-profile-content" class="hide-scrollbar" style="overflow-y:auto; flex:1; padding-bottom:20px;"></div>
        </div>`;
    document.body.appendChild(div);
}

window.switchProfileModalTab = function(tabName, element) { 
    document.querySelectorAll('#userProfileModal .ptab').forEach(el => el.classList.remove('active')); 
    element.classList.add('active'); 
    document.querySelectorAll('.modal-ptab-content').forEach(el => el.style.display = 'none'); 
    document.getElementById('modal-ptab-' + tabName).style.display = 'block'; 
};

window.openUserProfile = function(uid) {
    if(!uid || uid === 'undefined') return; injectUserProfileModal();
    const overlay = document.getElementById('userProfileOverlay'); 
    const modal = document.getElementById('userProfileModal'); 
    const content = document.getElementById('user-profile-content');
    
    overlay.style.display = 'block'; 
    modal.style.display = 'flex'; 
    setTimeout(() => { modal.classList.add('show'); }, 10); 
    
    content.innerHTML = '<div style="height:100px; display:flex; align-items:center; justify-content:center;"><div class="spinner"></div></div>';
    
    db.ref('users/' + uid).once('value').then(async snap => {
        if(!snap.exists()) { content.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">User tidak ditemukan.</div>'; return; }
        const data = snap.val(); 
        const userName = data.nama || 'Wibu'; 
        const userFoto = data.foto || 'https://placehold.co/100'; 
        const role = data.role || 'Member'; 
        const level = data.level || 1; 
        const shortUid = "#" + uid.substring(0, 6).toUpperCase();
        
        let roleBadgeClass = 'badge-member'; let roleName = role; 
        if(role === 'Developer') { roleBadgeClass = 'badge-dev-anim'; roleName = 'DEV'; } 
        else if(role === 'Wibu Premium' || level >= 50) { roleBadgeClass = 'badge-premium-anim'; roleName = role !== 'Member' ? role : 'Wibu Premium'; } 
        else if(role === 'Member') { roleName = 'Wibu Biasa'; }

        let activeBorderId = data.activeBorder || '';
        let decoUrl = activeBorderId && window.BORDER_CATALOG && window.BORDER_CATALOG[activeBorderId] ? window.BORDER_CATALOG[activeBorderId].url : '';
        let decoHtml = decoUrl ? `<div class="avatar-deco-overlay" style="background-image:url('${decoUrl}');"></div>` : '';
        
        const rankInfo = getRankInfo(level); 
        let lvlClass = `badge-lvl-${rankInfo.name.toLowerCase()}`; 
        let avatarClass = `avatar-rank-${rankInfo.name.toLowerCase()}`;
        
        let userComments = []; 
        try { 
            const commentsSnap = await db.ref('comments').once('value'); 
            commentsSnap.forEach(epSnap => { epSnap.forEach(cSnap => { let c = cSnap.val(); if(c.uid === uid) { userComments.push({ epID: epSnap.key, ...c }); } }); }); 
        } catch(e) {}
        userComments.sort((a,b) => b.waktu - a.waktu); 
        
        let commentsHtml = userComments.length > 0 ? userComments.map(c => {
            let d = new Date(c.waktu || Date.now()); 
            let months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]; 
            let exactDateStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
            let aTitle = c.animeTitle || 'Anime Tidak Diketahui'; 
            let aImage = c.animeImage || 'https://placehold.co/100'; 
            let aEp = c.animeEp || 'Episode ?';
            
            let actionUrl = c.url ? `closeUserProfileModal(); loadDetail('${c.url}')` : `window.showToast('Komentar ini ada di Episode ID: ${c.epID}', 'success')`;
            
                        return `<div style="margin-bottom: 15px; padding: 15px; background: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 12px;"><div style="display: flex; gap: 12px; margin-bottom: 10px; align-items: center; cursor: pointer;" onclick="${actionUrl}"><div style="position:relative; flex-shrink:0;"><img src="${aImage}" style="width:48px; height:48px; border-radius:10px; object-fit:cover; border: 1px solid #222;"><div style="position:absolute; bottom:-4px; right:-4px; background:#050505; border-radius:50%; padding:2px;"><img src="${userFoto}" style="width:16px; height:16px; border-radius:50%; object-fit:cover; display:block;"></div></div><div style="flex: 1; min-width: 0;"><div style="font-weight: 800; font-size: 14px; color: #fff; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${aTitle}</div><div style="font-size: 12px; color: #a1a1aa; font-weight: 500;">${aEp} • ${exactDateStr}</div></div></div><div style="font-size: 14px; color: #fff; line-height: 1.5; margin-bottom: 8px; word-wrap: break-word; padding-right: 10px;">${c.teks}</div><div style="font-size: 13px; color: #3b82f6; font-weight: 700; cursor: pointer; display: inline-block;" onclick="${actionUrl}">Buka Episode</div></div>`;
        }).join('') : '<p style="text-align:center; color:#555; font-size:13px; margin-top:30px;">Belum ada aktivitas komentar.</p>';

        let userExp = data.exp || 0;
        let totalMenit = Math.floor(userExp * 1.2) || (level * 120);
        let joinMonths = data.joined ? Math.max(1, Math.floor((Date.now() - data.joined) / (1000 * 60 * 60 * 24 * 30))) : 1;
        
        let historyHtml = '<p style="text-align:center; color:#555; font-size:13px; margin-top:30px;">Riwayat tontonan bersifat privat.</p>';

        content.innerHTML = `
    <div class="profile-header" style="margin-top: 20px; display:flex; flex-direction:column; align-items:center;">
        <div class="profile-avatar-container" style="width:90px; height:90px; position:relative; display:inline-block; margin-bottom:10px; border-radius:50%;">
                    <img src="${userFoto}" class="profile-avatar ${avatarClass}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">
                    ${decoHtml}
                </div>
                <div class="profile-name" style="font-size:20px;">${userName}</div>
                <div class="profile-badges" style="display:flex; gap:8px; justify-content:center; align-items:center; margin-bottom:20px;">
                    <span class="c-badge ${roleBadgeClass}" style="font-size:11px; padding:4px 10px;">${roleName}</span>
                    <span class="c-badge ${lvlClass}" style="font-size:11px; padding:4px 10px;">${rankInfo.icon} Lvl. ${level}</span>
                    <span class="c-badge" style="font-size:11px; padding:4px 10px; background: rgba(255,255,255,0.05); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.1);">${shortUid}</span>
                </div>
            </div>
            <div class="profile-stats" style="border-bottom: 1px solid #1a1a1a; margin-bottom: 5px; padding: 0 10px 25px 10px;">
                <div class="stat-box"><div class="stat-val">${totalMenit}</div><div class="stat-lbl">menit<br>menonton</div></div>
                <div class="stat-box"><div class="stat-val">${userComments.length}</div><div class="stat-lbl">jumlah<br>komentar</div></div>
                <div class="stat-box"><div class="stat-val">${joinMonths}</div><div class="stat-lbl">bulan<br>bergabung</div></div>
            </div>
            <div class="profile-tabs" style="border-bottom: 1px solid #1a1a1a; margin-bottom: 20px;">
                <div class="ptab active" onclick="switchProfileModalTab('all', this)">All</div>
                <div class="ptab" onclick="switchProfileModalTab('comments', this)">Comments</div>
                <div class="ptab" onclick="switchProfileModalTab('history', this)">History</div>
            </div>
            <div id="modal-ptab-all" class="modal-ptab-content" style="padding: 0 15px;">${commentsHtml}</div>
            <div id="modal-ptab-comments" class="modal-ptab-content" style="display:none; padding: 0 15px;">${commentsHtml}</div>
            <div id="modal-ptab-history" class="modal-ptab-content" style="display:none; padding: 0 15px;">${historyHtml}</div>
        `;
    });
};

window.closeUserProfileModal = function() { 
    const modal = document.getElementById('userProfileModal'); 
    const overlay = document.getElementById('userProfileOverlay');
    if(modal) { 
        modal.classList.remove('show'); 
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            modal.style.display = 'none'; 
        }, 300); 
    } 
};

// ==========================================
// MODAL & UI LAINNYA
// ==========================================
window.openLevelModal = function(currentLvl, currentExp, jamNonton) {
    const modalOverlay = document.getElementById('levelModalOverlay'); const modal = document.getElementById('levelModal'); const listContainer = document.getElementById('level-modal-list');
    const currRank = getRankInfo(currentLvl); document.getElementById('level-modal-subtitle').innerText = `Level ${currentLvl} • ${currRank.name}`; 
    document.getElementById('level-modal-total-exp').innerText = typeof currentExp === 'number' ? currentExp.toLocaleString('id-ID') : currentExp; 
    document.getElementById('level-modal-total-time').innerText = `${jamNonton}j 0m`;
    let html = '';
    RANK_TIERS.forEach(rank => {
        let isCurrent = (currentLvl >= rank.minLvl && currentLvl <= rank.maxLvl); let isPassed = currentLvl > rank.maxLvl;
        let statusIcon = isCurrent ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : (isPassed ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>');
        let bgStyle = isCurrent ? 'background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;' : 'padding: 15px 0;';
        let reqText = rank.maxLvl === Infinity ? `Level ${rank.minLvl}+` : `Level ${rank.minLvl} - ${rank.maxLvl}`;
        html += `<div class="level-rank-item" style="${bgStyle}"><div class="rank-info"><div class="rank-icon rank-icon-${rank.name.toLowerCase()}" style="background: ${rank.color}; border: 1px solid ${rank.color.replace('0.15', '0.3').replace('0.25', '0.6')};">${rank.icon}</div><div><div class="rank-title" style="color: ${isCurrent ? '#facc15' : (isPassed ? '#fff' : '#888')}">${rank.name}</div><div class="rank-req">${reqText}</div></div></div><div class="rank-status">${statusIcon}</div></div>`;
    });
    listContainer.innerHTML = html; modalOverlay.style.display = 'block'; modal.style.display = 'flex'; setTimeout(() => { modal.classList.add('show'); }, 10);
};

window.closeLevelModal = function() { const modal = document.getElementById('levelModal'); modal.classList.remove('show'); setTimeout(() => { document.getElementById('levelModalOverlay').style.display = 'none'; modal.style.display = 'none'; }, 300); };
window.switchProfileTab = function(tabName, element) { document.querySelectorAll('.ptab').forEach(el => el.classList.remove('active')); element.classList.add('active'); document.querySelectorAll('.ptab-content').forEach(el => el.style.display = 'none'); document.getElementById('ptab-' + tabName).style.display = 'block'; };

const API_BASE = '/api'; 
const DB_NAME = 'AnimekuDB';
const STORE_HISTORY = 'history';
const STORE_FAV = 'favorites';
window.currentFavData = []; 
window.currentPlayingAnime = null; 

window.epSortOrder = 'desc'; window.epLayoutMode = 'list'; 
window.toggleEpLayout = function() { window.epLayoutMode = window.epLayoutMode === 'grid' ? 'list' : 'grid'; window.renderDetailEpisodeUI(); };
window.toggleEpSort = function() { window.epSortOrder = window.epSortOrder === 'desc' ? 'asc' : 'desc'; window.renderDetailEpisodeUI(); };

window.renderDetailEpisodeUI = function() {
    let containerDetail = document.getElementById('episode-list-detail-container'); if(!containerDetail) return;
    let listIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> List`;
    let gridIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Grid`;
    let sortText = window.epSortOrder === 'desc' ? 'Sort: 99 &#9660; 1' : 'Sort: 1 &#9650; 99';
    document.querySelectorAll('.btn-ep-layout').forEach(btn => btn.innerHTML = window.epLayoutMode === 'list' ? gridIcon : listIcon);
    document.querySelectorAll('.btn-ep-sort').forEach(btn => btn.innerHTML = sortText);

    let eps = [...(window.currentAnimeEpisodes || [])]; if (window.epSortOrder === 'desc') eps.reverse();
    
    // FIX NGELAG: Pakai 'Set' biar pengecekan data HP secepat kilat walau episodenya ribuan
    let watchedEpsArray = JSON.parse(localStorage.getItem('watchedEps')) || []; 
    let watchedEpsSet = new Set(watchedEpsArray); 
    let watchProgress = JSON.parse(localStorage.getItem('watchProgress')) || {}; 
    let currentUrl = window.currentPlayingAnime ? window.currentPlayingAnime.url : ''; 
    let renderHtml = '';

    if (window.epLayoutMode === 'grid') {
        renderHtml = eps.map((ep, index) => {
            let realIndex = window.epSortOrder === 'desc' ? (eps.length - index) : (index + 1); let m = String(ep.title || '1').match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); let eNum = m ? m[1] : realIndex;
            let progress = watchProgress[ep.url]; let isCurrent = (ep.url === currentUrl); let c = "ep-square"; let inlineStyle = "width: 55px; height: 55px;"; 
            if (progress >= 100) { c += " active"; if(isCurrent) inlineStyle += ` box-shadow: 0 0 8px rgba(59,130,246,0.8); border: 2px solid #fff;`; } else if (progress > 0) { inlineStyle += ` background: linear-gradient(to right, #3b82f6 ${progress}%, transparent ${progress}%); border-color: #3b82f6; color: #fff;`; } else if (progress === 0 || isCurrent) { c += " watched"; } else if (watchedEpsSet.has(ep.url)) { c += " active"; }
            return `<div class="${c}" style="${inlineStyle}" onclick="loadVideo('${ep.url}')">${eNum}</div>`;
        }).join('');
        containerDetail.style = "display: flex; gap: 10px; flex-wrap: wrap; padding-bottom: 10px;"; containerDetail.innerHTML = renderHtml; 
    } else {
        renderHtml = eps.map((ep, index) => {
            let realIndex = window.epSortOrder === 'desc' ? (eps.length - index) : (index + 1); let m = String(ep.title || '1').match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); let eNum = m ? m[1] : realIndex;
            let mockEpViews = `${Math.floor(Math.random()*200 + 10)},${Math.floor(Math.random()*9)}K Views`; let mockEpDate = `16 Apr 2026`;
            let progress = watchProgress[ep.url]; let isCurrent = (ep.url === currentUrl); let btnBg = 'rgba(255,255,255,0.1)'; let btnText = 'Buka';
            if (progress >= 100 || watchedEpsSet.has(ep.url)) { btnBg = '#3b82f6'; btnText = 'Ditonton'; } else if (progress > 0) { btnBg = '#3b82f6'; btnText = 'Lanjut'; }
            if (isCurrent) { btnBg = '#ef4444'; btnText = 'Diputar'; }
                        return `<div onclick="loadVideo('${ep.url}')" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border:1px solid ${isCurrent ? '#3b82f6' : '#2c2c2e'}; cursor:pointer; background: ${isCurrent ? 'rgba(59, 130, 246, 0.1)' : '#1c1c1e'}; border-radius: 12px; margin-bottom: 10px; transition:0.2s;"><div><div style="font-size:15px; font-weight:800; color:${isCurrent ? '#3b82f6' : '#fff'}; margin-bottom:6px;">Episode ${eNum}</div><div style="font-size:12px; color:#888; display:flex; align-items:center; gap:6px; font-weight:500;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${mockEpViews} • ${mockEpDate}</div></div><div><button style="background:${btnBg}; border:none; color:#fff; font-size:12px; font-weight:800; padding:8px 20px; border-radius:20px; cursor:pointer; transition:0.2s;">${btnText}</button></div></div>`;
        }).join('');
        containerDetail.style = "display: flex; flex-direction: column;"; containerDetail.innerHTML = renderHtml; 
    }
};

function getHighRes(url) { if(!url) return ''; try { return url.replace(/\/s\d+(-[a-zA-Z0-9]+)?\//g, '/s0/').replace(/=s\d+/g, '=s0'); } catch(e) { return url; } }
function removeDuplicates(array, key) { const seen = new Set(); return array.filter(item => { if (!item || !item[key]) return false; if (seen.has(item[key])) return false; seen.add(item[key]); return true; }); }
function getEpBadge(anime) { 
    if (!anime) return 'Anime'; let text = String(anime.episode || anime.episodes || anime.status || anime.type || ''); if (!text || text === 'undefined' || text.trim() === '') return 'Anime'; 
    let lowText = text.toLowerCase().trim(); if (lowText.includes('tamat') || lowText.includes('completed')) return 'Tamat'; if (lowText.includes('movie')) return 'Movie'; if (lowText.includes('ongoin')) return 'Ongoing';
    if (/^\d+(\.\d+)?$/.test(lowText)) return `Episode ${lowText}`; let epMatch = text.match(/(episode|eps|ep)\s*(\d+(\.\d+)?)/i); if (epMatch) return `Episode ${epMatch[1]}`; let numMatch = text.match(/\d+/g); if (numMatch) return `Episode ${numMatch[numMatch.length - 1]}`; return text.length > 10 ? text.substring(0, 10) : text; 
}
function formatTimelineDate(timestamp) { const date = new Date(timestamp); const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (date.toDateString() === today.toDateString()) return "Hari ini"; if (date.toDateString() === yesterday.toDateString()) return "Kemarin"; const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]; return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`; }
function timeAgo(ms) { const seconds = Math.floor((new Date() - ms) / 1000); let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + " thn lalu"; interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + " bln lalu"; interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + " hr lalu"; interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + " jam lalu"; interval = seconds / 60; if (interval > 1) return Math.floor(interval) + " mnt lalu"; return "Baru saja"; }

// ==== LOGIKA EXP SAJA (TIDAK ADA KOIN) ====
function addXP(amount) {
    if(!currentUser) return; 
    db.ref('users/' + currentUser.uid).once('value').then(snap => {
        let d = snap.val(); if(!d) return;
        let currentExp = d.exp || 0;
        let currentLvl = d.level || 1;
        
        // SINKRONISASI: Jika EXP ketinggalan jauh dari Level, paksa EXP naik dulu
        let minExpForLevel = (currentLvl - 1) * 200;
        if (currentExp < minExpForLevel) {
            currentExp = minExpForLevel;
        }

        let nExp = currentExp + amount; 
        let nLvl = Math.floor(nExp / 200) + 1; 
        let isLevelUp = nLvl > currentLvl;
        
        db.ref('users/' + currentUser.uid).update({ exp: nExp, level: nLvl });
        let currentLevelProgress = nExp % 200; 
        let progressPercent = Math.floor((currentLevelProgress / 200) * 100);
        showXPModal(amount, nLvl, progressPercent, isLevelUp);
    });
}
function showXPModal(addedAmount, level, progress, isLevelUp) {
    const overlay = document.getElementById('xp-modal-overlay'); const card = document.getElementById('xp-modal-card'); const titleText = document.getElementById('xp-title-text'); const amountText = document.getElementById('xp-amount-text'); const levelText = document.getElementById('xp-level-text'); const progressText = document.getElementById('xp-progress-text'); const progressFill = document.getElementById('xp-progress-fill');
    amountText.innerText = `+${addedAmount}`; levelText.innerText = `Level ${level}`; progressText.innerText = `${progress}%`; progressFill.style.width = `${progress}%`;
    if (isLevelUp) { titleText.innerText = "LEVEL UP!"; titleText.style.color = "#3b82f6"; } else { titleText.innerText = "EXP Gained"; titleText.style.color = "#fff"; }
    overlay.style.display = 'flex'; setTimeout(() => { overlay.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { overlay.style.opacity = '0'; card.style.transform = 'translateY(20px)'; setTimeout(() => { overlay.style.display = 'none'; }, 300); }, 2500);
}

function initDB() { return new Promise((res, rej) => { const req = indexedDB.open(DB_NAME, 2); req.onupgradeneeded = (e) => { const d = e.target.result; if (!d.objectStoreNames.contains(STORE_HISTORY)) d.createObjectStore(STORE_HISTORY, { keyPath: 'url' }); if (!d.objectStoreNames.contains(STORE_FAV)) d.createObjectStore(STORE_FAV, { keyPath: 'url' }); }; req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
// 1. Fungsi Bantuan untuk Ambil Data Lokal (Buat yang belum login)
async function getLocalHistory() {
    try { 
        const d = await initDB(); 
        return new Promise((res) => { 
            const req = d.transaction(STORE_HISTORY, 'readonly').objectStore(STORE_HISTORY).getAll(); 
            req.onsuccess = () => res(req.result.sort((a,b) => b.timestamp - a.timestamp)); 
            req.onerror = () => res([]); 
        }); 
    } catch(e) { return []; }
}

// 2. Fungsi Simpan History (Firebase + Lokal)
async function saveHistory(a) { 
    a.timestamp = Date.now(); 
    
    // Simpan ke Lokal (buat jaga-jaga kalau offline/belum login)
    try { 
        const d = await initDB(); 
        d.transaction(STORE_HISTORY, 'readwrite').objectStore(STORE_HISTORY).put(a); 
    } catch(e) { console.error(e); } 
    
    // Simpan ke Firebase (Kalau sudah login)
    if (currentUser) {
        // Firebase nggak ngebolehin karakter kayak titik (.) atau slash (/) buat ID, jadi kita ubah dulu URL-nya
        const safeKey = a.url.replace(/[^a-zA-Z0-9]/g, '_'); 
        db.ref(`history/${currentUser.uid}/${safeKey}`).set(a);
    }
}

// 3. Fungsi Ambil History (Prioritas dari Firebase)
async function getHistory() { 
    if (currentUser) {
        try {
            // Kalau udah login, tarik datanya dari Firebase!
            const snap = await db.ref(`history/${currentUser.uid}`).once('value');
            let historyData = [];
            if (snap.exists()) {
                snap.forEach(child => { historyData.push(child.val()); });
            }
            return historyData.sort((a,b) => b.timestamp - a.timestamp);
        } catch(e) {
            console.error("Gagal ambil history dari Firebase", e);
            return await getLocalHistory(); // Fallback kalau gagal
        }
    } else {
        // Kalau belum login, tarik dari HP (Lokal)
        return await getLocalHistory(); 
    }
}
// 1. Fungsi Bantuan untuk Ambil Data Lokal (Offline/Belum Login)
async function getLocalFavorites() { 
    try { 
        const d = await initDB(); 
        return new Promise((res) => { 
            const req = d.transaction(STORE_FAV, 'readonly').objectStore(STORE_FAV).getAll(); 
            req.onsuccess = () => res(req.result.sort((a,b) => b.timestamp - a.timestamp)); 
            req.onerror = () => res([]); 
        }); 
    } catch(e) { return []; } 
}

// 2. Fungsi Ambil Subscribe (Prioritas dari Firebase)
async function getFavorites() { 
    const isTester = localStorage.getItem('animeku_tester_session') === 'true';
    if (currentUser && !isTester) {
        try {
            const snap = await db.ref(`favorites/${currentUser.uid}`).once('value');
            let favData = [];
            if (snap.exists()) {
                snap.forEach(child => { favData.push(child.val()); });
            }
            return favData.sort((a,b) => b.timestamp - a.timestamp);
        } catch(e) { 
            console.error(e);
            return await getLocalFavorites(); 
        }
    } else {
        return await getLocalFavorites(); 
    }
}

// 3. Fungsi Cek Apakah Anime Sudah di-Subscribe
async function checkFavorite(url) { 
    const isTester = localStorage.getItem('animeku_tester_session') === 'true';
    if (currentUser && !isTester) {
        const safeKey = url.replace(/[^a-zA-Z0-9]/g, '_');
        const snap = await db.ref(`favorites/${currentUser.uid}/${safeKey}`).once('value');
        return snap.exists();
    } else {
        try { 
            const database = await initDB(); 
            return new Promise((res) => { 
                const req = database.transaction(STORE_FAV, 'readonly').objectStore(STORE_FAV).get(url); 
                req.onsuccess = () => res(!!req.result); 
                req.onerror = () => res(false); 
            }); 
        } catch(e) { return false; } 
    }
}

// 4. Fungsi Klik Subscribe / Unsubscribe (Firebase + Lokal)
async function toggleFavorite(url, title, image, score, episode) {
    try {
        const isFav = await checkFavorite(url); 
        const btn = document.getElementById('favBtn');
        const safeKey = url.replace(/[^a-zA-Z0-9]/g, '_');
        const favData = {url, title, image, score, episode, timestamp: Date.now()};

        // Siapkan penyimpanan Lokal
        const database = await initDB(); 
        const tx = database.transaction(STORE_FAV, 'readwrite'); 
        const store = tx.objectStore(STORE_FAV);

        if (isFav) { 
            // Hapus dari Lokal & Firebase
            store.delete(url); 
            const isTester = localStorage.getItem('animeku_tester_session') === 'true';
            if(currentUser && !isTester) db.ref(`favorites/${currentUser.uid}/${safeKey}`).remove();
            
            // Ubah UI Tombol
            if(btn) { 
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Subscribe`; 
                btn.style.color = '#fff'; 
            }
            if(typeof window.showToast === 'function') window.showToast('Berhasil unsubscribe', 'error');
        } else { 
            // Simpan ke Lokal & Firebase
            store.put(favData); 
            const isTester = localStorage.getItem('animeku_tester_session') === 'true';
            if(currentUser && !isTester) db.ref(`favorites/${currentUser.uid}/${safeKey}`).set(favData);
            
            // Ubah UI Tombol
            if(btn) { 
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Disubscribe`; 
                btn.style.color = '#ef4444'; 
            }
            if(typeof window.showToast === 'function') window.showToast('Berhasil subscribe!', 'success');
        }
        // Jika tab subscribe sedang terbuka, refresh otomatis
        const favView = document.getElementById('favorite-view');
        if (favView && !favView.classList.contains('hidden')) {
            setTimeout(() => loadFavorites(), 500);
        }
    } catch(e) { console.error(e); }
}

window.toggleLikeAction = function(btn, type) {
    let likeBtn = document.getElementById('btn-like-action'); let dislikeBtn = document.getElementById('btn-dislike-action');
    const isActive = btn.style.backgroundColor === 'rgb(59, 130, 246)' || btn.style.backgroundColor === 'rgb(239, 68, 68)' || btn.style.backgroundColor === '#3b82f6' || btn.style.backgroundColor === '#ef4444';
    if (type === 'like') { if (isActive) { btn.style.backgroundColor = 'transparent'; } else { btn.style.backgroundColor = '#3b82f6'; if(dislikeBtn) { dislikeBtn.style.backgroundColor = 'transparent'; } } } 
    else { if (isActive) { btn.style.backgroundColor = 'transparent'; } else { btn.style.backgroundColor = '#ef4444'; if(likeBtn) { likeBtn.style.backgroundColor = 'transparent'; } } }
};
window.toggleSynopsis = function() { const text = document.getElementById('detail-synopsis-text'); const btn = document.getElementById('read-more-btn'); if(text.classList.contains('expanded')) { text.classList.remove('expanded'); btn.innerHTML = 'Selengkapnya ▼'; } else { text.classList.add('expanded'); btn.innerHTML = 'Sembunyikan ▲'; } };

const HOME_SECTIONS = [
    { title: "⚔️ Action Update", queries: ["action", "kimetsu", "jujutsu", "piece"] }, { title: "💘 Romance Update", queries: ["romance", "kanojo", "gotoubun"] },
    { title: "🚀 Sci-Fi Update", queries: ["sci-fi", "science", "dr. stone"] }, { title: "😂 Comedy Update", queries: ["comedy", "spy", "bocchi", "kaguya"] },
    { title: "🧙 Fantasy Update", queries: ["fantasy", "magic", "maou", "elf"] }, { title: "🌀 Isekai Update", queries: ["isekai", "slime", "mushoku"] },
    { title: "🏫 School Update", queries: ["school", "classroom", "academy"] }, { title: "🎬 Movie Terbaru", queries: ["movie", "film"] }
];

let sliderInterval;
const show = (id) => { const el = document.getElementById(id); if(el) el.style.display = 'block'; };
const hide = (id) => { const el = document.getElementById(id); if(el) el.style.display = 'none'; };
function loader(state) { const el = document.getElementById('loading'); if(el) { state ? el.classList.remove('hidden') : el.classList.add('hidden'); } };

function generateHistoryCardHtml(anime) {
    let epsBadge = getEpBadge(anime);
    const fallbackImg = "this.onerror=null;this.src='https://placehold.co/220x124/1a1a1a/3b82f6?text=Anime'";
    let progressPct = 0;
    if (anime.progress && anime.duration) {
        progressPct = Math.min(100, Math.round((anime.progress / anime.duration) * 100));
    }
    // Detect if has download badge icon
    const hasDownload = false;
    return `
        <div style="width:160px;min-width:160px;cursor:pointer;display:flex;flex-direction:column;scroll-snap-align:start;border-radius:10px;overflow:hidden;background:#111;flex-shrink:0;" onclick="loadDetail('${anime.url}')">
            <div style="position:relative;width:100%;padding-top:56.25%;background:#1a1a1a;overflow:hidden;">
                <img src="${getHighRes(anime.image)}" alt="${anime.title}" loading="lazy" onerror="${fallbackImg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;">
                <div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;z-index:2;letter-spacing:0.3px;">${epsBadge}</div>
                ${progressPct > 0 ? `<div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(255,255,255,0.15);"><div style="height:100%;background:#3b82f6;width:${progressPct}%;transition:width 0.3s;"></div></div>` : ''}
                <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 50%);pointer-events:none;"></div>
            </div>
            <div style="padding:7px 8px 8px;display:flex;flex-direction:column;gap:3px;">
                <div style="font-size:11px;color:#e4e4e7;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;">${anime.title}</div>
                <div style="display:flex;align-items:center;gap:4px;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#3b82f6" style="flex-shrink:0;"><path d="M5 3l14 9-14 9V3z"/></svg>
                    <span style="font-size:9px;color:#71717a;letter-spacing:0.2px;">Lanjut Nonton</span>
                </div>
            </div>
        </div>`;
}

function generateCardHtml(anime) {
    // Skip card kalau tidak ada title atau url
    if (!anime || !anime.title || !anime.url) return '';
    let epsBadge = getEpBadge(anime); 
    let scoreStr = anime.score || anime.skor || anime.rating; 
    let finalScore = (scoreStr && scoreStr !== '?' && scoreStr !== '0' && scoreStr !== '') ? scoreStr : (Math.random() * 1.5 + 7.0).toFixed(1); 
    const fallbackImg = "this.src='https://placehold.co/150x225/1a1a1a/3b82f6?text=Anime'";
    let hashCode = anime.title ? anime.title.split('').reduce((a,b) => a+b.charCodeAt(0), 0) : 0;
    let mockViews = `${((hashCode % 900) + 50)},${(hashCode % 9)}K views`;

    // FIX v28: hasStream hanya true kalau BENAR-BENAR ada episodes atau streamSource
    // Tidak pakai anime.source sebagai penanda — source 'myanimelist' bisa saja punya stream
    const hasStream = !!(anime.streamSource || (Array.isArray(anime.episodes) && anime.episodes.length > 0));
    // Kalau tidak punya stream, klik tetap buka detail (biarkan server yang cari stream)
    // Jangan tampil toast error otomatis — hanya tampil SEGERA badge sebagai info
    const clickAction = `loadDetail('${anime.url}')`;
    // FIX v29: tidak ada efek gelap — semua card tampil normal
    const dimStyle = '';
    const unavailableBadge = '';
    
    return `
        <div class="anime-big-card" onclick="${clickAction}" style="${dimStyle}">
            <div class="anime-big-card-img">
                <img src="${getHighRes(anime.image)}" alt="${anime.title}" loading="lazy" onerror="${fallbackImg}">
                ${unavailableBadge}
                <div class="badge-ep">${epsBadge}</div>
                <div class="badge-score">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${finalScore}
                </div>
            </div>
            <div style="padding: 6px 2px;">
                <div class="anime-big-card-views">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    ${mockViews}
                </div>
                <div class="anime-big-card-title">${anime.title}</div>
            </div>
        </div>`; 
}

async function fetchTimeout(url, timeoutMs = 15000) { const controller = new AbortController(); const id = setTimeout(() => controller.abort(), timeoutMs); try { const res = await fetch(url, { signal: controller.signal }); clearTimeout(id); return res; } catch (e) { clearTimeout(id); throw e; } }

// ==========================================
// FITUR PENCARIAN (SEARCH)
// ==========================================
window.handleSearch = async function(query) {
    if (!query) { 
        if (window.location.hash === '#search') history.back();
        else switchTab('home'); 
        return; 
    }

    // --- FIX TOMBOL BACK SAAT PENCARIAN ---
    if (window.location.hash !== '#home' && window.location.hash !== '#search') {
        history.replaceState(null, '', '#home');
    }
    if (window.location.hash !== '#search') {
        history.pushState({page: 'search'}, '', '#search');
    }

    // FIX v34: push 'search' ke appPageStack supaya back dari detail balik ke search
    if (!window.appPageStack) window.appPageStack = ['home'];
    const _stopSearch = window.appPageStack[window.appPageStack.length - 1];
    if (_stopSearch !== 'search') window.appPageStack.push('search');

    switchTab('search'); 
    loader(true);
    // Highlight home tab saat search karena search tidak punya tab sendiri
    let tabHome = document.getElementById('tab-home');
    if(tabHome) tabHome.classList.add('active');
    
    try { 
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`); 
        const rawData = await res.json(); 
        // Dedup by url di frontend — cegah card dobel
        const seenUrls = new Set();
        const data = rawData.filter(a => {
            if (!a || !a.url) return false;
            if (seenUrls.has(a.url)) return false;
            seenUrls.add(a.url);
            return true;
        });
        
        let searchContainer = document.getElementById('search-view');
        if(searchContainer) {
            searchContainer.innerHTML = `
                <div class="header-flex" style="padding-top:20px;">
                    <h2>Pencarian: "${query}"</h2>
                </div>
                <div class="anime-grid-2col">
                    ${data.map(anime => generateCardHtml(anime)).join('')}
                </div>
            `;
        }
    } catch (err) {
        console.error("Search Error: ", err);
        let searchContainer = document.getElementById('search-view');
        if(searchContainer) {
            searchContainer.innerHTML = `<div style="text-align:center; padding: 50px; color:#ef4444;">Gagal mencari anime. Server sibuk.</div>`;
        }
    } finally { 
        loader(false); 
    }
};

window.loadGenre = async function(genreName) {
    if (window.location.hash !== '#search') history.pushState({page: 'search'}, '', '#search');
    switchTab('search');
    loader(true);
    let tabHome = document.getElementById('tab-home');
    if(tabHome) tabHome.classList.add('active');
    try {
        const res = await fetch(`${API_BASE}/genre?name=${encodeURIComponent(genreName)}`);
        const data = await res.json();
        let searchContainer = document.getElementById('search-view');
        if(searchContainer) {
            searchContainer.innerHTML = `
                <div class="header-flex" style="padding-top:20px;">
                    <h2>Genre: ${genreName}</h2>
                    <span style="color:#666; font-size:13px; font-weight:700;">Total (${data.length})</span>
                </div>
                <div class="anime-grid-2col">
                    ${data.length > 0 ? data.map(anime => generateCardHtml(anime)).join('') : '<div style="padding:40px 15px; text-align:center; color:#555; grid-column:1/-1;">Tidak ada anime ditemukan untuk genre ini.</div>'}
                </div>
            `;
        }
    } catch (err) {
        let searchContainer = document.getElementById('search-view');
        if(searchContainer) searchContainer.innerHTML = `<div style="text-align:center; padding: 50px; color:#ef4444;">Gagal memuat genre. Server sibuk.</div>`;
    } finally { loader(false); }
};

window.loadAllAnime = async function() {
    if (window.location.hash !== '#search') history.pushState({page: 'search'}, '', '#search');
    switchTab('search');
    loader(true);
    let searchContainer = document.getElementById('search-view');
    if(searchContainer) searchContainer.innerHTML = `<div class="header-flex" style="padding-top:20px;"><h2>Anime Update</h2></div><div class="anime-grid-2col" style="opacity:0.4">${Array(9).fill('<div style="background:#111;border-radius:8px;padding-top:148%;"></div>').join('')}</div>`;
    try {
        const res = await fetchTimeout(`${API_BASE}/latest`, 12000);
        const data = res && res.ok ? await res.json() : [];
        if(searchContainer) {
            searchContainer.innerHTML = `
                <div class="header-flex" style="padding-top:20px;">
                    <h2>Anime Update</h2>
                    <span style="color:#666; font-size:13px; font-weight:700;">Total (${data.length})</span>
                </div>
                <div class="anime-grid-2col">
                    ${data.length > 0 ? data.map(a => generateCardHtml(a)).join('') : '<div style="padding:40px 15px; text-align:center; color:#555; grid-column:1/-1;">Tidak ada data.</div>'}
                </div>`;
        }
    } catch(e) {
        if(searchContainer) searchContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#ef4444;">Gagal memuat data.</div>`;
    } finally { loader(false); }
};

window.loadAllDonghua = async function() {
    if (window.location.hash !== '#search') history.pushState({page: 'search'}, '', '#search');
    switchTab('search');
    loader(true);
    let searchContainer = document.getElementById('search-view');
    if(searchContainer) searchContainer.innerHTML = `<div class="header-flex" style="padding-top:20px;"><h2>Donghua Update</h2></div><div class="anime-grid-2col" style="opacity:0.4">${Array(9).fill('<div style="background:#111;border-radius:8px;padding-top:148%;"></div>').join('')}</div>`;
    try {
        const res = await fetchTimeout(`${API_BASE}/donghua`, 12000);
        const data = res && res.ok ? await res.json() : [];
        if(searchContainer) {
            searchContainer.innerHTML = `
                <div class="header-flex" style="padding-top:20px;">
                    <h2>Donghua Update</h2>
                    <span style="color:#666; font-size:13px; font-weight:700;">Total (${data.length})</span>
                </div>
                <div class="anime-grid-2col">
                    ${data.length > 0 ? data.map(a => generateCardHtml(a)).join('') : '<div style="padding:40px 15px; text-align:center; color:#555; grid-column:1/-1;">Tidak ada data.</div>'}
                </div>`;
        }
    } catch(e) {
        if(searchContainer) searchContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#ef4444;">Gagal memuat data.</div>`;
    } finally { loader(false); }
};

async function loadLatest() {
    loader(true); const homeContainer = document.getElementById('home-view'); homeContainer.innerHTML = ''; let hasAnyData = false;
    try {
        const premiumDiv = document.createElement('div');
        premiumDiv.innerHTML = `
            <div style="margin: 15px 15px 0 15px; background: rgba(30, 41, 59, 0.4); border: 1px solid #1e293b; padding: 12px 15px; border-radius: 16px; display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.showToast('Fitur Premium segera hadir!', 'success')">
                <button style="background: linear-gradient(90deg, #3b82f6, #06b6d4); color: #fff; border: none; padding: 6px 14px; border-radius: 10px; font-weight: 900; font-size: 12px; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 12px rgba(59,130,246,0.4);"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Premium</button>
                <div style="font-size: 12px; color: #cbd5e1; font-weight: 600; line-height: 1.4;">Harga Mulai Dari Rp. 12.000<br>No iklan nonton sepuasnya</div>
            </div>
        `;
        homeContainer.appendChild(premiumDiv);

        try { let sliderData = []; const res = await fetchTimeout(`${API_BASE}/latest`, 15000); if (res && res.ok) { sliderData = await res.json(); if (sliderData && sliderData.length > 0) { try { renderHeroSlider(sliderData.slice(0, 20), homeContainer); } catch(sliderErr) { console.error('Slider error:', sliderErr); } hasAnyData = true; } } } catch (e) { console.error('Latest fetch error:', e); }

        // --- SISTEM SEARCH DIUBAH BIAR NYAMBUNG SAMA KEYBOARD HP ---
        const searchDiv = document.createElement('div');
        searchDiv.innerHTML = `
            <div style="padding: 0 15px 15px 15px;">
                <form onsubmit="event.preventDefault(); window.handleSearch(this.querySelector('input').value);" style="position: relative; width: 100%; margin: 0; padding: 0;">
                    <svg style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: #a1a1aa;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="search" placeholder="Cari Anime Di Sini" style="width: 100%; background: #1c1c1e; border: 1px solid #2c2c2e; color: #fff; padding: 14px 15px 14px 45px; border-radius: 20px; font-size: 14px; outline: none; box-sizing: border-box; font-weight: 700; transition: 0.2s;" autocomplete="off">
                </form>
            </div>
        `;
        homeContainer.appendChild(searchDiv);

        // --- TERAKHIR DITONTON ---
        try { const historyData = await getHistory(); if (historyData && historyData.length > 0) { const histDiv = document.createElement('div'); histDiv.innerHTML = `<div class="header-flex"><h2>Terakhir Ditonton</h2><span class="more-link" onclick="switchTab('recent')">Lihat Lainnya ></span></div><div class="horizontal-scroll" style="gap: 12px;">${historyData.slice(0, 15).map(anime => generateHistoryCardHtml(anime)).join('')}</div>`; homeContainer.appendChild(histDiv); hasAnyData = true; } } catch (e) {}

        // --- ANIME UPDATE SECTION (hanya tampil anime yang update hari ini) ---
        const animeUpdateDiv = document.createElement('div');
        const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
        animeUpdateDiv.innerHTML = `<div class="header-flex"><h2>Anime Update <span style="font-size:12px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.12);padding:3px 9px;border-radius:20px;margin-left:6px;vertical-align:middle;">${new Date().toLocaleDateString('id-ID', {weekday:'long'})}</span></h2><span class="more-link" onclick="window.loadAllAnime()">Selengkapnya ›</span></div><div class="anime-grid-2col" style="opacity:0.4">${Array(6).fill('<div style="background:#111;border-radius:8px;padding-top:148%;"></div>').join('')}</div>`;
        homeContainer.appendChild(animeUpdateDiv);
        fetchTimeout(`${API_BASE}/latest`, 12000).then(res => res && res.ok ? res.json() : []).then(data => {
            if (Array.isArray(data) && data.length > 0) {
                // Filter hanya anime yang update hari ini: ambil dari API /latest yang memang berisi episode terbaru
                // API /latest sudah mengurutkan dari yang paling baru, jadi kita ambil yang benar-benar fresh hari ini
                const today = new Date();
                const todayDay = today.getDay(); // 0=Minggu, 1=Senin, dst
                
                // Gunakan data langsung dari /latest karena itu memang episode yang baru update
                // Filter out anime yang sudah completed/tamat dari tampilan "Anime Update"
                const ongoingOnly = data.filter(a => {
                    const epText = String(a.episode || a.episodes || a.status || a.type || '').toLowerCase();
                    return !epText.includes('tamat') && !epText.includes('completed') && !epText.includes('movie');
                });
                
                const displayData = ongoingOnly.length > 0 ? ongoingOnly : data;
                animeUpdateDiv.innerHTML = `<div class="header-flex"><h2>Anime Update <span style="font-size:12px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.12);padding:3px 9px;border-radius:20px;margin-left:6px;vertical-align:middle;">${new Date().toLocaleDateString('id-ID', {weekday:'long'})}</span></h2><span class="more-link" onclick="window.loadAllAnime()">Selengkapnya ›</span></div><div class="anime-grid-2col">${displayData.slice(0, 9).map(a => generateCardHtml(a)).join('')}</div>`;
                hasAnyData = true;
            }
            else { animeUpdateDiv.remove(); }
        }).catch(() => animeUpdateDiv.remove());

        // --- GENRE SERIES SECTION ---
        const GENRE_LIST = [
            "Action", "Adult Cast", "Adventure", "Avant Garde", "Award Winning", "Comedy",
            "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Girls Love", "Gore", "Gourmet",
            "Harem", "Historical", "Horror", "Isekai", "Josei", "Magic", "Martial Arts", "Mecha",
            "Military", "Music", "Mystery", "Mythology", "Parody", "Psychological", "Racing",
            "Reincarnation", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo",
            "Shoujo Ai", "Shounen", "Slice Of Life", "Space", "Sports", "Super Power",
            "Supernatural", "Suspense", "Thriller", "Vampire", "Video Game",
        ];
        const genreDiv = document.createElement('div');
        genreDiv.innerHTML = `
            <div style="padding: 0 12px 10px 12px;">
                <h2 style="font-size:22px; font-weight:900; color:#fff; margin:15px 0 14px 0;">Genre Series</h2>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${GENRE_LIST.map(g => `<button class="genre-chip" onclick="window.loadGenre('${g}')">${g}</button>`).join('')}
                </div>
            </div>
        `;
        homeContainer.appendChild(genreDiv);
        hasAnyData = true;

                // --- TOP ANIME SECTION ---
        const topAnimeDiv = document.createElement('div');
        topAnimeDiv.innerHTML = `
            <div style="margin-top: 10px;">
                <div class="header-flex">
                    <h2 style="margin:0;">Top Anime</h2>
                    <span class="more-link" onclick="window.loadTopAnime()">Selengkapnya ›</span>
                </div>
                <div id="topanime-grid-inner" class="anime-grid-2col" style="opacity:0.4;">${Array(6).fill('<div style="background:#1a1a1a;border-radius:8px;padding-top:148%;"></div>').join('')}</div>
            </div>
        `;
        homeContainer.appendChild(topAnimeDiv);
        fetchTimeout(`${API_BASE}/top-anime`, 10000).then(res => res && res.ok ? res.json() : []).then(data => {
            const innerGrid = topAnimeDiv.querySelector('#topanime-grid-inner');
            if (Array.isArray(data) && data.length > 0) {
                innerGrid.style.opacity = '1';
                innerGrid.innerHTML = data.slice(0, 9).map(a => generateCardHtml(a)).join('');
            } else {
                innerGrid.style.opacity = '1';
                innerGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px 15px; color:#555; font-size:13px; font-weight:600;">Data sedang dimuat ulang, coba lagi nanti.</div>`;
            }
        }).catch(() => {
            const innerGrid = topAnimeDiv.querySelector('#topanime-grid-inner');
            if (innerGrid) { innerGrid.style.opacity = '1'; innerGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px 15px; color:#555; font-size:13px; font-weight:600;">Gagal memuat data.</div>`; }
        });

        // --- TERAKHIR DITONTON (di bawah semua) sudah dipindah ke atas ---
        if (!hasAnyData) { homeContainer.innerHTML = `<div style="text-align:center; padding: 60px 20px; display:flex; flex-direction:column; align-items:center;"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom:15px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><h2 style="font-size:18px; margin:0 0 8px 0; color:#fff;">Gagal Memuat Data</h2><p style="font-size:13px; color:#888; margin-bottom:20px; line-height:1.5;">Server API kamu sedang sibuk atau menolak koneksi. Silakan coba lagi nanti.</p><button onclick="loadLatest()" style="background:#3b82f6; color:#fff; border:none; padding:12px 24px; border-radius:24px; font-weight:800; cursor:pointer;">Coba Lagi</button></div>`; }
    } catch (err) { console.error("Home loading failed total", err); } finally { loader(false); }
}

function renderHeroSlider(data, container) {
    const sectionContainer = document.createElement('div'); 
    sectionContainer.className = 'ranking-slider-container';
    sectionContainer.style.cssText = 'padding: 15px; overflow: hidden; position: relative;';

    const styleId = 'ranking-banner-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .r-slider-wrap { display: flex; transition: transform 0.4s cubic-bezier(0.25, 1, 0.35, 1); touch-action: pan-y; gap: 15px; }
            .r-slide { flex: 0 0 100%; box-sizing: border-box; }
            .r-slide-inner { position: relative; height: 240px; border-radius: 16px; overflow: hidden; background: #1c1c1e; border: 1px solid #2c2c2e; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); -webkit-tap-highlight-color: transparent; }
            .r-anime-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.6; }
            .r-anime-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%); }
            .r-anime-content { position: relative; z-index: 2; padding: 25px 20px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; justify-content: center;}
            .r-anime-header { font-size: 15px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); margin-bottom: 10px;}
            .r-anime-top1 { font-size: clamp(22px, 6vw, 30px); font-weight: 900; color: #fff; letter-spacing: -1px; text-shadow: 0 2px 5px rgba(0,0,0,0.8); line-height: 1.1; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .r-anime-sub { display: flex; gap: 15px; font-size: 13px; font-weight: 700; color: #ccc; }
            .r-user-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0f172a 0%, #020617 100%); }
            .r-user-content { position: relative; z-index: 2; padding: 20px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
            .r-user-header { font-size: 16px; font-weight: 900; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); margin-bottom: 20px; text-align: center;}
            .r-u-wrap { display: flex; align-items: flex-end; justify-content: center; gap: 8px; width: 100%; padding: 0 10px; box-sizing: border-box; }
            .r-u-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 5; max-width: 22%; }
            .r-u-ava { border-radius: 50%; background: #333; box-shadow: 0 5px 15px rgba(0,0,0,0.5); position: relative; width: 100%; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; }
            .r-u-ava img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
            .r-u-rank { position: absolute; bottom: -8px; background: #111; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 1px solid #333; z-index: 3; white-space: nowrap;}
            .r-u-name { position: absolute; bottom: -24px; font-size: clamp(9px, 2.5vw, 11px); font-weight: 800; color: #ccc; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.8); overflow: hidden; text-overflow: ellipsis; max-width: 100%;}
            .r-u-2, .r-u-3 { border: 2px solid #94a3b8; transform: scale(0.85); transform-origin: bottom; }
            .r-u-1 { border: 3px solid #facc15; margin-bottom: 15px; transform: scale(1.1); transform-origin: bottom; }
            .r-u-1::before { content: '👑'; position: absolute; top: -16px; left:50%; transform:translateX(-50%); font-size: 16px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); z-index: 10;}
            .r-u-4, .r-u-5 { border: 2px solid #444; opacity: 0.8; transform: scale(0.7); transform-origin: bottom; }
            .r-dots { display: flex; justify-content: center; gap: 6px; margin-top: 10px; margin-bottom: 5px; }
            .r-dot { width: 6px; height: 6px; border-radius: 50%; background: #444; transition: 0.3s; }
            .r-dot.active { background: #3b82f6; width: 16px; border-radius: 4px; }
        `;
        document.head.appendChild(style);
    }

    let topAnime1 = data[0] || {title: 'Memuat...', image: 'https://placehold.co/600x300'};
    let topAnime2 = data[1] || {title: 'Memuat...'};
    let topAnime3 = data[2] || {title: 'Memuat...'};

    let html = `
        <div class="r-slider-wrap" id="bannerRankWrapper">
            <div class="r-slide">
                <div class="r-slide-inner" onclick="window.openLeaderboardModal('harian')">
                    <div class="r-user-bg"></div>
                    <div class="r-user-content">
                        <div class="r-user-header">Top Users Animeku</div>
                        <div class="r-u-wrap">
                            <div class="r-u-item"><div class="r-u-ava r-u-4"><img id="top4-img" src="https://placehold.co/100/111/fff?text=4"></div><div class="r-u-rank">#4</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-2"><img id="top2-img" src="https://placehold.co/100/475569/fff?text=2"></div><div class="r-u-rank">#2</div><div class="r-u-name" id="top2-name">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-1"><img id="top1-img" src="https://placehold.co/100/ca8a04/fff?text=1"></div><div class="r-u-rank" style="background:#facc15; color:#000; border:none;">#1</div><div class="r-u-name" id="top1-name" style="color:#fff;">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-3"><img id="top3-img" src="https://placehold.co/100/ea580c/fff?text=3"></div><div class="r-u-rank">#3</div><div class="r-u-name" id="top3-name">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-5"><img id="top5-img" src="https://placehold.co/100/111/fff?text=5"></div><div class="r-u-rank">#5</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="r-slide">
                <div class="r-slide-inner" onclick="window.openLeaderboardModal('koin')">
                    <div class="r-user-bg" style="background: radial-gradient(circle at center, #78350f 0%, #020617 100%);"></div>
                    <div class="r-user-content">
                        <div class="r-user-header" style="color:#fde047;">Sultan Animeku 🪙</div>
                        <div class="r-u-wrap">
                            <div class="r-u-item"><div class="r-u-ava r-u-4"><img id="koin4-img" src="https://placehold.co/100/111/fff?text=4"></div><div class="r-u-rank">#4</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-2"><img id="koin2-img" src="https://placehold.co/100/475569/fff?text=2"></div><div class="r-u-rank">#2</div><div class="r-u-name" id="koin2-name">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-1" style="border-color:#fde047;"><img id="koin1-img" src="https://placehold.co/100/fde047/000?text=1"></div><div class="r-u-rank" style="background:#fde047; color:#000; border:none;">#1</div><div class="r-u-name" id="koin1-name" style="color:#fde047;">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-3"><img id="koin3-img" src="https://placehold.co/100/ea580c/fff?text=3"></div><div class="r-u-rank">#3</div><div class="r-u-name" id="koin3-name">...</div></div>
                            <div class="r-u-item"><div class="r-u-ava r-u-5"><img id="koin5-img" src="https://placehold.co/100/111/fff?text=5"></div><div class="r-u-rank">#5</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="r-slide">
                <div class="r-slide-inner" onclick="window.openAnimeRankModal()">
                    <div class="r-anime-bg" style="background-image: url('${getHighRes(topAnime1.image)}');"></div>
                    <div class="r-anime-overlay"></div>
                    <div class="r-anime-content">
                        <div class="r-anime-header">Peringkat Anime</div>
                        <div class="r-anime-top1">#1 ${topAnime1.title}</div>
                        <div class="r-anime-sub">
                            <span>#2 ${topAnime2.title}</span>
                            <span>#3 ${topAnime3.title}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="r-dots">
            <div class="r-dot active" id="r-dot-0"></div>
            <div class="r-dot" id="r-dot-1"></div>
            <div class="r-dot" id="r-dot-2"></div>
        </div>
    `;

    sectionContainer.innerHTML = html;
    container.appendChild(sectionContainer);

    try {
        db.ref('users').once('value').then(snap => {
            let usersList = [];
            snap.forEach(child => {
                let d = child.val();
                if(d.role !== 'Developer' && child.key !== 'DEV_TESTER_999') usersList.push({ uid: child.key, ...d });
            });
            window.fullLeaderboardData = usersList;

            let topLevel = [...usersList].sort((a, b) => (b.level || 1) - (a.level || 1) || (b.exp || 0) - (a.exp || 0));
            for(let i=1; i<=5; i++) {
                let u = topLevel[i-1];
                let imgEl = document.getElementById(`top${i}-img`);
                let nameEl = document.getElementById(`top${i}-name`);
                if(u && imgEl) imgEl.src = u.foto;
                if(u && nameEl) nameEl.innerText = u.nama.substring(0, 8);
            }

            let topKoin = [...usersList].sort((a, b) => (b.koin || 0) - (a.koin || 0));
            for(let i=1; i<=5; i++) {
                let u = topKoin[i-1];
                let imgEl = document.getElementById(`koin${i}-img`);
                let nameEl = document.getElementById(`koin${i}-name`);
                if(u && imgEl) imgEl.src = u.foto;
                if(u && nameEl) nameEl.innerText = u.nama.substring(0, 8);
            }
        });
    } catch(e) {}

    const wrapper = document.getElementById('bannerRankWrapper');
    let currentSlide = 0; let startX = 0; let isDragging = false; let autoSlideInterval;

    function updateDots() {
        document.getElementById('r-dot-0').classList.toggle('active', currentSlide === 0);
        document.getElementById('r-dot-1').classList.toggle('active', currentSlide === 1);
        document.getElementById('r-dot-2').classList.toggle('active', currentSlide === 2);
    }
    
    function slideTo(index) {
        if(!wrapper) return; currentSlide = index;
        let shift = index === 0 ? '0px' : `calc(-${index * 100}% - ${index * 15}px)`; 
        wrapper.style.transform = `translateX(${shift})`; updateDots();
    }
    
    function nextSlide() { slideTo(currentSlide === 2 ? 0 : currentSlide + 1); }
    function startAutoSlide() { clearInterval(autoSlideInterval); autoSlideInterval = setInterval(nextSlide, 5000); }

    wrapper.addEventListener('touchstart', (e) => { 
        startX = e.touches[0].clientX; 
        isDragging = false; 
        clearInterval(autoSlideInterval); 
    }, {passive: true});

    wrapper.addEventListener('touchmove', (e) => {
        let diff = Math.abs(startX - e.touches[0].clientX);
        if(diff > 10) isDragging = true; 
    }, {passive: true});

    wrapper.addEventListener('touchend', (e) => {
        let endX = e.changedTouches[0].clientX;
        let diff = startX - endX;

        if (isDragging) {
            if (diff > 50 && currentSlide < 2) slideTo(currentSlide + 1);
            else if (diff < -50 && currentSlide > 0) slideTo(currentSlide - 1);
        }
        startAutoSlide();
    }, {passive: true});

    startAutoSlide();
    injectLeaderboardAndRankModals();
}

function injectReportModal() {
    if(document.getElementById('report-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'report-modal-injected';
    div.innerHTML = `<div id="reportModalOverlay" class="modal-overlay" onclick="closeReportModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:999998; backdrop-filter:blur(2px);"></div><div id="reportModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:320px; border-radius:24px; z-index:999999; padding:25px 20px 20px 20px; transition:0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #2c2c2e;"><div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); width:60px; height:60px; background:#050505; border-radius:50%; display:flex; align-items:center; justify-content:center;"><div style="width:46px; height:46px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg></div></div><h3 style="text-align:center; color:#3b82f6; margin:15px 0 20px 0; font-size:18px; font-weight:900;">Report Episode</h3><div style="display:flex; flex-direction:column; gap:16px; margin-bottom:25px; padding: 0 10px;"><label style="display:flex; align-items:center; gap:12px; cursor:pointer; color:#fff; font-size:14px; font-weight:700;"><input type="radio" name="reportReason" value="Video Tidak Bisa Diputar" style="accent-color:#3b82f6; width:20px; height:20px;" checked>Video Tidak Bisa Diputar</label><label style="display:flex; align-items:center; gap:12px; cursor:pointer; color:#fff; font-size:14px; font-weight:700;"><input type="radio" name="reportReason" value="Subtitle Rusak" style="accent-color:#3b82f6; width:20px; height:20px;">Subtitle Rusak</label><label style="display:flex; align-items:center; gap:12px; cursor:pointer; color:#fff; font-size:14px; font-weight:700;"><input type="radio" name="reportReason" value="Anime Berbeda" style="accent-color:#3b82f6; width:20px; height:20px;">Anime Berbeda</label><label style="display:flex; align-items:center; gap:12px; cursor:pointer; color:#fff; font-size:14px; font-weight:700;"><input type="radio" name="reportReason" value="DMCA (Email)" style="accent-color:#3b82f6; width:20px; height:20px;">DMCA (Email)</label></div><div style="display:flex; gap:12px;"><button onclick="closeReportModal()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:14px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s;">Batal</button><button onclick="submitReport()" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:14px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);">Report</button></div></div>`;
    document.body.appendChild(div);
}

window.openReportModal = function() { injectReportModal(); const overlay = document.getElementById('reportModalOverlay'); const modal = document.getElementById('reportModal'); overlay.style.display = 'block'; modal.style.display = 'block'; setTimeout(() => { modal.style.opacity = '1'; modal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10); };
window.closeReportModal = function() { const overlay = document.getElementById('reportModalOverlay'); const modal = document.getElementById('reportModal'); if(!modal) return; modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)'; setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; }, 300); };
window.submitReport = function() { 
    // Ambil alasan yang dipilih user
    const selected = document.querySelector('input[name="reportReason"]:checked'); 
    if(!selected) return; 
    let reason = selected.value; 
    
    // Ambil data judul anime dan episode dari pemutar video saat ini
    let animeTitle = window.currentPlayingAnime ? window.currentPlayingAnime.title : 'Judul Tidak Diketahui';
    let animeEp = window.currentPlayingAnime ? window.currentPlayingAnime.ep : 'Episode ?';

    // Susun pesan WhatsApp biar rapi
    let text = `Halo Admin, saya mau report episode error.\n\n` +
               `*Anime:* ${animeTitle}\n` +
               `*Episode:* ${animeEp}\n` +
               `*Alasan:* ${reason}\n` +
               `*Link:* ${window.location.href}`; 
               
    // Buka WhatsApp dengan pesan yang sudah dibuat
    window.open('https://wa.me/6281315059849?text=' + encodeURIComponent(text)); 
    
    // Tutup modal report
    closeReportModal(); 
};

window.openServerModal = function() { show('serverModalOverlay'); show('serverModal'); setTimeout(() => { document.getElementById('serverModal').classList.add('show'); }, 10); };
window.closeServerModal = function() { const modal = document.getElementById('serverModal'); modal.classList.remove('show'); setTimeout(() => { hide('serverModalOverlay'); hide('serverModal'); }, 300); };

// =====================
// AUTO-FALLBACK PLAYER SYSTEM
// =====================
window._playerStreams = [];       // semua stream tersedia
window._playerCurrentIdx = 0;    // index stream aktif

window._setPlayerStream = function(idx) {
    if (!window._playerStreams || window._playerStreams.length === 0) return;
    idx = Math.max(0, Math.min(idx, window._playerStreams.length - 1));
    window._playerCurrentIdx = idx;
    const stream = window._playerStreams[idx];

    // Ganti iframe
    const oldIframe = document.getElementById('video-player');
    if (oldIframe) {
        const newIframe = document.createElement('iframe');
        newIframe.id = 'video-player';
        newIframe.setAttribute('allowfullscreen', 'true');
        newIframe.setAttribute('allow', 'autoplay; fullscreen');
        newIframe.src = stream.url;
        oldIframe.parentNode.replaceChild(newIframe, oldIframe);

    }

    // Update quality badge
    let qualMatch = stream.server.match(/\d{3,4}p/i);
    let displayQuality = qualMatch ? qualMatch[0] + ' Quality' : 'Quality';
    const qualEl = document.getElementById('current-quality-text');
    if (qualEl) qualEl.innerText = displayQuality;

    // Update active button di modal
    document.querySelectorAll('.server-list-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
    });

    window.closeServerModal();
};

window.changeServer = function(url, serverName, btnElement) {
    // Cari index stream berdasarkan url
    const idx = window._playerStreams.findIndex(s => s.url === url);
    if (idx >= 0) {
        window._setPlayerStream(idx);
    } else {
        // Fallback manual
        const oldIframe = document.getElementById('video-player');
        if (oldIframe) { const newIframe = document.createElement('iframe'); newIframe.id = 'video-player'; newIframe.setAttribute('allowfullscreen', 'true'); newIframe.src = url; oldIframe.parentNode.replaceChild(newIframe, oldIframe); }
        let qualMatch = serverName.match(/\d{3,4}p/i); let displayQuality = qualMatch ? qualMatch[0] + ' Quality' : 'Quality';
        const qualEl = document.getElementById('current-quality-text');
        if (qualEl) qualEl.innerText = displayQuality;
        document.querySelectorAll('.server-list-btn').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        window.closeServerModal();
    }
};

window.handleDownload = function() { let iframe = document.getElementById('video-player'); if(iframe && iframe.src) { window.open(iframe.src, '_blank'); } else {  } };
window.handleShare = function() { if (navigator.share) { navigator.share({ title: document.title, url: window.location.href }); } else { window.showToast('Tautan disalin ke clipboard!', 'success'); } };

async function loadRecentHistory() {
    const container = document.getElementById('recent-results-container'); loader(true);
    try {
        const historyData = await getHistory();
        if (!historyData || historyData.length === 0) { container.innerHTML = `<div class="empty-state" style="text-align:center; padding: 50px; color:#555;"><h2>Belum ada riwayat tontonan</h2></div>`; loader(false); return; }
        const groupedData = {}; historyData.forEach(anime => { const dateLabel = formatTimelineDate(anime.timestamp); if (!groupedData[dateLabel]) groupedData[dateLabel] = []; groupedData[dateLabel].push(anime); });
        let timelineHtml = '<div class="timeline-wrapper">';
        for (const [dateLabel, animes] of Object.entries(groupedData)) {
            timelineHtml += `<div class="timeline-group"><div class="timeline-date-badge">${dateLabel}</div><div class="timeline-items">`;
            animes.forEach(anime => {
                const dateObj = new Date(anime.timestamp); const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                const progress = Math.floor(Math.random() * 70 + 20); const durasiMenit = 24; const currentMenit = Math.floor((progress/100) * durasiMenit);
                const currentStr = `${String(currentMenit).padStart(2, '0')}:${String(Math.floor(Math.random()*60)).padStart(2,'0')} / ${durasiMenit}:00`;
                const fallbackImg = "this.src='https://placehold.co/160x90/1a1a1a/3b82f6?text=Anime'";
                timelineHtml += `<div class="timeline-card" onclick="loadDetail('${anime.url}')"><div class="timeline-img"><img src="${getHighRes(anime.image)}" alt="${anime.title}" onerror="${fallbackImg}"><div class="timeline-play-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div></div><div class="timeline-info"><div class="timeline-header"><div class="timeline-title">${anime.title}</div><div class="timeline-time">${timeStr}</div></div><div class="timeline-ep">${getEpBadge(anime)}</div><div class="timeline-progress-container"><div class="timeline-progress-bg"><div class="timeline-progress-fill" style="width: ${progress}%;"></div></div><div class="timeline-progress-text">${currentStr}</div></div></div></div>`;
            });
            timelineHtml += `</div></div>`;
        }
        container.innerHTML = timelineHtml + '</div>';
    } catch(e) { container.innerHTML = `<div style="text-align:center; padding: 50px; color:#ef4444;"><h2>Gagal memuat riwayat.</h2></div>`; }
    loader(false);
}

window.toggleSortMenu = function() { const menu = document.getElementById('sort-dropdown-menu'); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; };
window.applyFavSort = function(type, label) { document.getElementById('current-sort-btn').innerHTML = `${label} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>`; document.getElementById('sort-dropdown-menu').style.display = 'none'; if(type === 'new') { window.currentFavData.sort((a, b) => b.timestamp - a.timestamp); } else if(type === 'az') { window.currentFavData.sort((a, b) => a.title.localeCompare(b.title)); } else if(type === 'za') { window.currentFavData.sort((a, b) => b.title.localeCompare(a.title)); } else if(type === 'rating' || type === 'popular') { window.currentFavData.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)); } renderFavoritesList(); };
function renderFavoritesList() { const container = document.getElementById('favorite-results-container'); try { container.innerHTML = `<div class="anime-grid" style="grid-template-columns: repeat(3, 1fr); padding: 0 10px; gap: 12px 8px;">${window.currentFavData.map(anime => generateFavCardHtml(anime)).join('')}</div>`; } catch(e) { console.error("Error render:", e); } }

async function loadFavorites() {
    const container = document.getElementById('favorite-results-container'); loader(true);
    try {
        window.currentFavData = await getFavorites(); const count = window.currentFavData ? window.currentFavData.length : 0;
        const countTotal = document.getElementById('fav-total-count'); const countCompleted = document.getElementById('fav-completed-count');
        if(countTotal) countTotal.innerText = count; if(countCompleted) countCompleted.innerText = count;
        if (count === 0) { container.innerHTML = `<div style="text-align:center; padding: 50px; color:#555;"><h2>Belum ada Subscribe Anime</h2></div>`; loader(false); return; }
        renderFavoritesList();
    } catch(e) { container.innerHTML = `<div style="text-align:center; padding: 50px; color:#ef4444;"><h2>Gagal memuat Subscribe.</h2></div>`; }
    loader(false);
}
document.addEventListener('click', function(event) { const btn = document.getElementById('current-sort-btn'); const menu = document.getElementById('sort-dropdown-menu'); if (btn && menu && !btn.contains(event.target) && !menu.contains(event.target)) { menu.style.display = 'none'; } });

async function loadDetail(url) {
    const stack = window.appPageStack;
    const top = stack[stack.length - 1];
    // FIX v34: kalau lagi di watch, pop dulu (balik ke detail lama, lalu replace)
    if (top === 'watch') window.appPageStack.pop();
    // Kalau sudah di detail, tidak push lagi (avoid duplicate)
    if (window.appPageStack[window.appPageStack.length - 1] !== 'detail') {
        window.appPageStack.push('detail');
    }
    loader(true);
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`); const data = await res.json();
        
        // FIX EPISODE GANDA DAN ACAK-ACAKAN
        let rawEps = data.episodes || [];
        let cleanEps = [];
        let seenUrl = new Set();
        rawEps.forEach(e => {
            if(!seenUrl.has(e.url)) {
                seenUrl.add(e.url);
                cleanEps.push(e);
            }
        });
        cleanEps.sort((a,b) => {
            let getNum = (t) => {
                let m = String(t).match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i);
                if(m) return parseFloat(m[1]);
                let nums = String(t).match(/\d+/g);
                return nums ? parseFloat(nums[nums.length-1]) : 0;
            };
            return getNum(a.title) - getNum(b.title); 
        });
        data.episodes = cleanEps;
        window.currentAnimeMeta = { title: data.title, description: data.description, image: data.image, url: url }; window.currentAnimeEpisodes = data.episodes; window.currentPlayingAnime = null; 
        switchTab('detail'); 
        let scoreStr = data.info?.skor || data.info?.score || '8.25'; const score = (scoreStr && scoreStr !== '?' && scoreStr !== '0') ? scoreStr : (Math.random() * 1.5 + 7.0).toFixed(2);
        const type = data.info?.tipe || data.info?.type || 'TV'; const musim = data.info?.musim || data.info?.season || ''; const rilis = data.info?.dirilis || data.info?.released || ''; const seasonInfo = `${musim} ${rilis}`.trim() || 'Unknown';
        let newestEpUrl = data.episodes.length > 0 ? data.episodes[0].url : ''; let newestEpNum = data.episodes.length > 0 ? `${data.episodes.length}` : '?';
        if (data.episodes.length > 0 && data.episodes[0].title) { let epMatch = data.episodes[0].title.match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); if(epMatch) newestEpNum = epMatch[1]; else { let nums = data.episodes[0].title.match(/\d+/g); if (nums) newestEpNum = nums[nums.length - 1]; } }
        saveHistory({ url: url, title: data.title, image: data.image, score: score, episode: `Eps ${newestEpNum}` }); const isFav = await checkFavorite(url); 
        
        document.getElementById('detail-view').innerHTML = `
            <div class="detail-hero" style="background-image: url('${getHighRes(data.image)}')"><div class="detail-hero-overlay"></div><div class="detail-hero-content"><div style="background:#3b82f6; color:#fff; display:inline-block; margin-bottom:8px; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px;">Episode ${newestEpNum}</div><h1 style="font-size:24px; line-height:1.2; font-weight:800; margin:0 0 8px 0; color:#fff;">${data.title}</h1><div style="font-size: 13px; color: #d1d5db; margin-bottom: 20px; display:flex; align-items:center; gap:8px; font-weight:500;"><span style="color:#fbbf24;">⭐ ${score}</span> • <span>${type}</span> • <span>${seasonInfo}</span></div><div style="display:flex; gap:10px; width:100%;"><button style="flex:1; background:#3b82f6; color:#fff; border:none; padding:12px; border-radius:24px; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;" onclick="${newestEpUrl ? `loadVideo('${newestEpUrl}')` : `void(0)`}"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Mulai Tonton</button><button id="favBtn" onclick="toggleFavorite('${url}', '${data.title.replace(/'/g, "\\'")}', '${data.image}', '${score}', 'Eps ${newestEpNum}')" style="flex:1; background:#1c1c1e; color:${isFav ? '#ef4444' : '#fff'}; border:none; padding:12px; border-radius:24px; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition:0.2s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#ef4444' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> ${isFav ? 'Disubscribe' : 'Subscribe'}</button></div></div><div class="nav-back"><button onclick="goBack()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button></div></div>
            <div style="padding: 15px 12px;"><h2 style="font-size: 18px; margin: 0 0 12px 0; font-weight:bold; border-left: 4px solid #3b82f6; padding-left: 10px;">Sinopsis</h2><p id="detail-synopsis-text" class="synopsis-text">${data.description || 'Tidak ada deskripsi tersedia.'}</p><div id="read-more-btn" class="read-more-btn" onclick="toggleSynopsis()">Selengkapnya ▼</div></div>
            <div style="padding: 0 12px; margin-top:20px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h2 style="font-size:18px; font-weight:800; margin:0;">Episodes (${data.episodes.length})</h2><div style="display:flex; gap:8px;"><button onclick="toggleEpLayout()" class="btn-ep-layout" style="background:#1c1c1e; border:1px solid #333; color:#fff; padding:6px 12px; border-radius:12px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; transition:0.2s;"></button><button onclick="toggleEpSort()" class="btn-ep-sort" style="background:#1c1c1e; border:1px solid #333; color:#fff; padding:6px 12px; border-radius:12px; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s;"></button></div></div><div id="episode-list-detail-container"></div></div><div style="padding-bottom: 40px;"></div>
        `;
        window.renderDetailEpisodeUI(); 

        // FIX v30: healing banner HANYA muncul kalau data.healing === true dari API
        // Kalau healing false = anime memang tidak ada sumber video, tidak perlu loading
        if (data.healing === true) {
            const epContainer = document.getElementById('episode-list-detail-container');
            if (epContainer && data.episodes.length === 0) {
                epContainer.innerHTML = `
                    <div id="heal-status-banner" style="text-align:center; padding:30px 20px; background:#1c1c1e; border-radius:16px; border:1px solid #2c2c2e;">
                        <div style="display:flex; justify-content:center; margin-bottom:12px;">
                            <div class="spinner" style="width:28px; height:28px; border-width:3px;"></div>
                        </div>
                        <p style="color:#9ca3af; font-size:13px; margin:0 0 6px 0; font-weight:600;">Sedang mencari sumber video...</p>
                        <p style="color:#6b7280; font-size:11px; margin:0;">Otomatis memuat ulang dalam beberapa detik</p>
                    </div>`;
            }

            // Auto-retry tiap 6 detik, maks 5x
            let healRetryCount = 0;
            const MAX_HEAL_RETRY = 5;
            const healRetryInterval = setInterval(async () => {
                healRetryCount++;
                try {
                    const retryRes = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
                    const retryData = await retryRes.json();
                    if (retryData.episodes && retryData.episodes.length > 0) {
                        clearInterval(healRetryInterval);
                        window.currentAnimeEpisodes = retryData.episodes;
                        // Update episode count header
                        const epHeader = document.querySelector('#detail-view h2');
                        if (epHeader && epHeader.textContent.includes('Episodes')) {
                            epHeader.textContent = `Episodes (${retryData.episodes.length})`;
                        }
                        // Re-render episode list
                        window.renderDetailEpisodeUI();
                        
                        return;
                    }
                } catch(e) {}

                if (healRetryCount >= MAX_HEAL_RETRY) {
                    clearInterval(healRetryInterval);
                    const banner = document.getElementById('heal-status-banner');
                    if (banner) {
                        banner.innerHTML = `
                            <p style="color:#ef4444; font-size:13px; font-weight:700; margin:0 0 8px 0;">Tidak bisa menemukan episode</p>
                            <p style="color:#6b7280; font-size:11px; margin:0 0 12px 0;">Sumber video belum tersedia untuk anime ini</p>
                            <button onclick="loadDetail('${url}')" style="background:#3b82f6; color:#fff; border:none; padding:8px 18px; border-radius:12px; font-size:12px; font-weight:700; cursor:pointer;">🔄 Coba Lagi</button>`;
                    }
                }
            }, 6000);
        }

        // FIX v30: kalau healing false dan episodes tetap kosong, tampilkan pesan tidak tersedia
        if (data.healing !== true && data.episodes.length === 0) {
            const epContainer = document.getElementById('episode-list-detail-container');
            if (epContainer) {
                epContainer.innerHTML = `
                    <div style="text-align:center; padding:30px 20px; background:#1c1c1e; border-radius:16px; border:1px solid #2c2c2e;">
                        <div style="font-size:32px; margin-bottom:12px;">📭</div>
                        <p style="color:#ef4444; font-size:13px; font-weight:700; margin:0 0 6px 0;">Episode tidak tersedia</p>
                        <p style="color:#6b7280; font-size:11px; margin:0 0 14px 0;">Sumber video untuk anime ini belum ada di database kami</p>
                        <button onclick="loadDetail('${url}')" style="background:#3b82f6; color:#fff; border:none; padding:8px 18px; border-radius:12px; font-size:12px; font-weight:700; cursor:pointer;">🔄 Coba Lagi</button>
                    </div>`;
            }
        }
    } catch (err) { console.error(err); } finally { loader(false); }
}

window.currentCommentSort = 'top';
window.apiCache = window.apiCache || {}; 

async function loadVideo(url) {
    const stack = window.appPageStack;
    const top = stack[stack.length - 1];
    // FIX v34: kalau sudah di watch (ganti episode), jangan push lagi
    if (top !== 'watch') {
        if (top !== 'detail') window.appPageStack.push('detail');
        window.appPageStack.push('watch');
    }
    
    let data;
    if (window.apiCache['watch_' + url]) {
        data = window.apiCache['watch_' + url]; 
    } else {
        loader(true); 
        try {
            const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(url)}`); 
            data = await res.json();
            window.apiCache['watch_' + url] = data; 
        } catch (err) {
            console.error(err);
            loader(false);
            
            return;
        }
    }
    loader(false); 
    
    try {
        switchTab('watch'); addXP(20); 
        let displayTitle = window.currentAnimeMeta?.title || data.title;
        let mockViews = `${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)} Views`; let mockDate = new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
        let currentEpNum = '1';
        if(window.currentAnimeEpisodes && window.currentAnimeEpisodes.length > 0) { let foundEp = window.currentAnimeEpisodes.find(ep => ep.url === url); if(foundEp) { let epMatch = foundEp.title.match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); currentEpNum = epMatch ? epMatch[1] : (foundEp.title.match(/\d+/g) ? foundEp.title.match(/\d+/g).pop() : "1"); } }
         window.currentPlayingAnime = { title: window.currentAnimeMeta?.title || displayTitle, image: window.currentAnimeMeta?.image || 'https://placehold.co/100', ep: 'Episode ' + currentEpNum, url: window.currentAnimeMeta?.url || url };
        
        try { document.getElementById('silent-audio').play(); } catch (err) {}

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: displayTitle, 
                artist: 'Animeku • Episode ' + currentEpNum, 
                artwork: [
                    { src: getHighRes(window.currentPlayingAnime.image), sizes: '512x512', type: 'image/jpeg' },
                    { src: './animeku.jpg', sizes: '512x512', type: 'image/jpeg' } 
                ]
            });
        }

        let watchProgress = JSON.parse(localStorage.getItem('watchProgress')) || {}; let oldWatched = JSON.parse(localStorage.getItem('watchedEps')) || []; oldWatched.forEach(oldUrl => { if(watchProgress[oldUrl] === undefined) watchProgress[oldUrl] = 100; }); watchProgress[url] = 100; localStorage.setItem('watchProgress', JSON.stringify(watchProgress));
        window.renderDetailEpisodeUI();

        let episodeID = url.replace(/[:/.]/g, '_'); 
        let initialServer = data.streams.length > 0 ? data.streams[0].server : ''; let initQualMatch = initialServer.match(/\d{3,4}p/i); let displayQualText = initQualMatch ? initQualMatch[0] + ' Quality' : 'Quality';

        document.getElementById('watch-view').innerHTML = `
            <div class="video-container-fixed" style="position:relative;"><button class="watch-back-btn" onclick="backToDetail()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button><iframe id="video-player" src="${data.streams.length > 0 ? data.streams[0].url : ''}" allowfullscreen allow="autoplay; fullscreen"></iframe></div>
            <div style="padding: 15px 12px; display: flex; gap: 12px; align-items: center;"><img src="${getHighRes(window.currentPlayingAnime.image)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid #333; flex-shrink: 0;"><div style="flex: 1;"><h2 style="font-size: 16px; font-weight: 800; margin: 0 0 4px 0; line-height: 1.3;">${displayTitle}</h2><div style="font-size: 12px; color: #a1a1aa; font-weight: 500; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">Episode ${currentEpNum} • <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${mockViews} • ${mockDate}</div></div></div>
            <div style="padding: 0 12px 15px 12px; border-bottom: 1px solid #111;"><div class="hide-scrollbar" style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: nowrap; overflow-x: auto;"><div style="display: flex; background: #1c1c1e; border: 1px solid #333; border-radius: 20px; overflow: hidden; align-items: center; flex-shrink: 0;"><button id="btn-like-action" onclick="toggleLikeAction(this, 'like')" style="background: transparent; color: #fff; border: none; padding: 8px 16px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; border-right: 1px solid #333; transition: 0.2s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 6,3K</button><button id="btn-dislike-action" onclick="toggleLikeAction(this, 'dislike')" style="background: transparent; color: #fff; border: none; padding: 8px 16px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg> 28</button></div><button class="action-btn" onclick="openServerModal()" style="border-radius: 20px; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg> <span id="current-quality-text">${displayQualText}</span></button><button class="action-btn" onclick="handleDownload()" style="border-radius: 20px; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg> Download</button></div><div style="display: flex; gap: 8px; flex-wrap: wrap;"><button class="action-btn" onclick="handleShare()" style="border-radius: 20px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share</button><button class="action-btn" onclick="openReportModal()" style="border-radius: 20px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Report</button></div></div>
            <div style="padding: 20px 12px 10px 12px;"><h2 style="font-size:18px; font-weight:800; margin:0 0 15px 0;">Episode List</h2><div id="watch-episode-squares" class="hide-scrollbar" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;"></div></div>
            <div class="comment-section" style="padding: 20px 12px;"><div id="comment-count-text" style="font-size:16px; font-weight:800; margin:0 0 15px 0;">0 Comments</div><div style="display: flex; gap: 10px; margin-bottom: 20px;"><button class="comment-filter-btn active" onclick="setCommentFilter('top', this)">Top Comment</button><button class="comment-filter-btn" onclick="setCommentFilter('new', this)">Terbaru</button></div><div id="custom-comment-area" style="margin-bottom: 30px;"></div><div id="comment-list-container"><div style="text-align:center; padding:30px;"><div class="spinner" style="margin:0 auto;"></div><div style="margin-top:10px; color:#666; font-size:12px;">Memuat komentar...</div></div></div></div><div style="padding-bottom: 60px;"></div>
        `;
        
        // ===== INIT AUTO-FALLBACK PLAYER SYSTEM =====
        window._playerStreams = data.streams || [];
        window._playerCurrentIdx = 0;

        if (window._playerStreams.length > 0) {
            const modalServerContainer = document.getElementById('modal-server-list');
            modalServerContainer.innerHTML = window._playerStreams.map((stream, idx) => {
                let isActive = idx === 0 ? "server-list-btn active" : "server-list-btn";
                return `<button class="${isActive}" onclick="changeServer('${stream.url}', '${stream.server}', this)"><span>${stream.server}</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5l10 -10"></path></svg></button>`;
            }).join('');

        }
        
        const watchEpListContainer = document.getElementById('watch-episode-squares');
        if (watchEpListContainer) { 
            if (window.currentAnimeEpisodes && window.currentAnimeEpisodes.length > 0) { 
                watchEpListContainer.innerHTML = [...window.currentAnimeEpisodes].map((ep, index) => { 
                    let m = String(ep.title || '1').match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); 
                    let eNum = m ? m[1] : (index + 1); 
                    let progress = watchProgress[ep.url]; let isCurrent = (ep.url === url); let c = "ep-square"; let inlineStyle = "width: 55px; height: 55px; font-size: 16px;";
                    if (progress >= 100) { c += " active"; if(isCurrent) inlineStyle += ` box-shadow: 0 0 8px rgba(59,130,246,0.8); border: 2px solid #fff;`; } else if (progress > 0) { inlineStyle += ` background: linear-gradient(to right, #3b82f6 ${progress}%, transparent ${progress}%); border-color: #3b82f6; color: #fff;`; } else if (progress === 0 || isCurrent) { c += " watched"; }
                    return `<div class="${c}" style="${inlineStyle}" onclick="loadVideo('${ep.url}')">${eNum}</div>`; 
                }).join(''); 
            } else { watchEpListContainer.innerHTML = `<div class="ep-square watched" style="width: 55px; height: 55px;">${currentEpNum}</div>`; } 
        }
        
        window.currentEpID = episodeID; renderCommentInput(episodeID); listenToComments(episodeID);
    } catch (err) { console.error(err); } finally { loader(false); }
}

window.setCommentFilter = function(sortType, btnElement) { document.querySelectorAll('.comment-filter-btn').forEach(b => b.classList.remove('active')); btnElement.classList.add('active'); window.currentCommentSort = sortType; if (window.currentEpID) listenToComments(window.currentEpID); };

function renderCommentInput(epID) {
    const container = document.getElementById('custom-comment-area'); if(!container) return; 
    if(!currentUser) { 
        container.innerHTML = `<div style="display: flex; gap: 12px; align-items: center;"><div style="width: 36px; height: 36px; border-radius: 50%; background: #222; display: flex; justify-content: center; align-items: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div><div style="flex: 1; background: #1c1c1e; border: 1px solid #2c2c2e; padding: 10px 16px; border-radius: 24px; color: #888; font-size: 13px; cursor: pointer;" onclick="switchTab('developer')">Login untuk menambahkan komentar...</div></div>`; 
    } 
    else { 
        const userFoto = currentUser.photoURL || 'https://placehold.co/40'; 
        container.innerHTML = `<div style="display: flex; gap: 12px; align-items: center;"><div id="comment-input-avatar" style="position: relative; width: 36px; height: 36px; flex-shrink: 0;"><img src="${userFoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block;"></div><div style="flex: 1; position: relative;"><input type="text" id="main-comment-input" onkeypress="if(event.key === 'Enter') postComment('${epID}')" placeholder="Tambahkan komentar..." style="width: 100%; background: #1c1c1e; border: 1px solid #2c2c2e; color: #fff; padding: 12px 45px 12px 16px; border-radius: 24px; font-size: 13px; outline: none; box-sizing: border-box;"><button onclick="postComment('${epID}')" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: transparent; border: none; padding: 8px; cursor: pointer; display: flex;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div></div>`; 
        
        db.ref('users/' + currentUser.uid).once('value').then(snap => {
            let d = snap.val();
            if(d && d.activeBorder && window.BORDER_CATALOG && window.BORDER_CATALOG[d.activeBorder]) {
                let decoUrl = window.BORDER_CATALOG[d.activeBorder].url;
                let avatarContainer = document.getElementById('comment-input-avatar');
                if(avatarContainer) {
                    avatarContainer.innerHTML = `<img src="${userFoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block;"><div class="avatar-deco-overlay" style="background-image:url('${decoUrl}');"></div>`;
                }
            }
        });
    }
}

window.postComment = function(epID) { 
    const input = document.getElementById('main-comment-input'); 
    const text = input.value; 
    if(!text.trim() || !currentUser) return; 
    
    db.ref('users/' + currentUser.uid).once('value').then(snap => { 
        const u = snap.val(); 
        const role = u.role || 'Member';
        const level = u.level || 1;
        const isPremium = (role === 'Wibu Premium' || role === 'Developer' || level >= 50);

        const saveComment = () => {
            // NAH, DI DALAM SINI POSISI YANG BENERNYA 👇
            db.ref('comments/' + epID).push().set({ 
                uid: currentUser.uid, 
                nama: u.nama, 
                foto: u.foto, 
                role: u.role || 'Member', 
                level: u.level || 1, 
                teks: text, 
                waktu: Date.now(), 
                animeTitle: window.currentPlayingAnime ? window.currentPlayingAnime.title : 'Anime Tidak Diketahui', 
                animeImage: window.currentPlayingAnime ? window.currentPlayingAnime.image : 'https://placehold.co/100', 
                animeEp: window.currentPlayingAnime ? window.currentPlayingAnime.ep : 'Episode ?', 
                url: window.currentPlayingAnime ? window.currentPlayingAnime.url : '',
                activeBorder: u.activeBorder || '',
                activeCommentplate: u.activeCommentplate || '' // <--- INI DIA
            }); 
            input.value = ''; 
            addXP(10);
        };

        if (isPremium) {
            saveComment();
        } else {
            db.ref('comments/' + epID).orderByChild('uid').equalTo(currentUser.uid).once('value').then(cSnap => {
                if (cSnap.exists()) {
                    window.showToast('Limit tercapai! Wibu Biasa hanya bisa komen 1x per episode.', 'error');
                } else {
                    saveComment();
                }
            });
        }
    }); 
};

window.postReply = function(parentID) { 
    const input = document.getElementById('reply-input-text'); 
    const text = input.value; 
    if(!text.trim() || !currentUser) return; 
    
    db.ref('users/' + currentUser.uid).once('value').then(snap => { 
        const u = snap.val(); 
        const role = u.role || 'Member';
        const level = u.level || 1;
        const isPremium = (role === 'Wibu Premium' || role === 'Developer' || level >= 50);

        const saveReply = () => {
            db.ref('replies/' + parentID).push().set({ 
                uid: currentUser.uid, 
                nama: u.nama, 
                foto: u.foto, 
                role: u.role || 'Member', 
                level: u.level || 1, 
                teks: text, 
                waktu: Date.now(),
                activeBorder: u.activeBorder || '',
                activeCommentplate: u.activeCommentplate || '' // <--- INI JUGA
            }); 
            input.value = ''; 
            addXP(5); 
        };

        if (isPremium) {
            saveReply();
        } else {
            db.ref('replies/' + parentID).orderByChild('uid').equalTo(currentUser.uid).once('value').then(rSnap => {
                if (rSnap.exists()) {
                    window.showToast('Wibu Biasa hanya bisa membalas 1x di komentar ini.', 'error');
                } else {
                    saveReply();
                }
            });
        }
    }); 
};


// Logika Tahan untuk Hapus (Long Press)
window.commentPressTimer = null;
window.handleCommentTouchStart = function(isReply, epID, parentID, replyID) {
    window.commentPressTimer = setTimeout(() => {
        openDeleteModal(isReply, epID, parentID, replyID);
    }, 600); // Tahan 0.6 detik
};
window.handleCommentTouchEnd = function() {
    if (window.commentPressTimer) clearTimeout(window.commentPressTimer);
};

function generateCommentHtml(c, isReply = false, epID = null, parentID = null) {
    const role = c.role || 'Member'; const level = c.level || 1; const uidStr = c.uid ? "#" + c.uid.substring(0, 7).toUpperCase() : "#0000000"; const timeStr = timeAgo(c.waktu || Date.now());
    
    let roleBadgeClass = 'badge-member'; let roleName = role; 
    if(role === 'Developer') { roleBadgeClass = 'badge-dev-anim'; roleName = 'DEV'; } 
    else if(role === 'Wibu Premium' || level >= 50) { roleBadgeClass = 'badge-premium-anim'; roleName = role !== 'Member' ? role : 'Wibu Premium'; } 
    else if(role === 'Member') { roleName = 'Wibu Biasa'; }

    // --- BACA DATA BORDER & EFEK KOMEN DARI SHOP ---
    let decoUrl = c.activeBorder && window.COSMETIC_CATALOG && window.COSMETIC_CATALOG.borders && window.COSMETIC_CATALOG.borders[c.activeBorder] ? window.COSMETIC_CATALOG.borders[c.activeBorder].url : '';
    let decoHtml = decoUrl ? `<div class="avatar-deco-overlay" style="background-image:url('${decoUrl}');"></div>` : '';
    
    // Background Effect Komen
    let plateStyle = c.activeCommentplate && window.COSMETIC_CATALOG && window.COSMETIC_CATALOG.commentplates && window.COSMETIC_CATALOG.commentplates[c.activeCommentplate] ? window.COSMETIC_CATALOG.commentplates[c.activeCommentplate].style : 'background: transparent;';
    // -----------------------------------------------

    const rankInfo = getRankInfo(level); let lvlClass = `badge-lvl-${rankInfo.name.toLowerCase()}`;
    const userExp = (level - 1) * 200 + Math.floor(Math.random() * 150); const userJam = level * 2; 
    
    let replyBtnHtml = ''; 
    if(!isReply && epID && parentID) { 
        replyBtnHtml += `<div style="font-size: 12px; color: #3b82f6; font-weight: 700; cursor: pointer; display: inline-block; margin-right: 15px;" onclick="event.stopPropagation(); openReplyModal('${epID}', '${parentID}')">Reply</div>`; 
    }
    
    let containerAction = ''; let containerCursor = 'default'; let hintHapus = '';
    
    if (currentUser && c.uid === currentUser.uid) {
        let args = isReply ? `true, null, '${parentID}', '${c.id}'` : `false, '${epID}', '${parentID}', null`;
        containerAction = `onmousedown="handleCommentTouchStart(${args})" onmouseup="handleCommentTouchEnd()" onmouseleave="handleCommentTouchEnd()" ontouchstart="handleCommentTouchStart(${args})" ontouchend="handleCommentTouchEnd()" ontouchmove="handleCommentTouchEnd()"`;
        containerCursor = 'pointer';
        hintHapus = `<span style="font-size:10px; color:#ef4444; opacity:0.8; margin-left:auto; font-weight:700; position:relative; z-index:2;">Tahan Hapus</span>`;
    }
    
    let avatarSize = isReply ? '28px' : '36px';
    let avatarHtml = `<div style="position: relative; width: ${avatarSize}; height: ${avatarSize}; flex-shrink: 0; margin-top: 4px; cursor: pointer; z-index:2;" onclick="event.stopPropagation(); openUserProfile('${c.uid}')"><img src="${c.foto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block; pointer-events: none; -webkit-user-drag: none; -webkit-touch-callout: none;">${decoHtml}</div>`;
    
    // Inject plateStyle ke container comment-item
    return `<div class="comment-item" ${containerAction} style="position: relative; display: flex; gap: 12px; margin-bottom: ${isReply ? '15px' : '25px'}; cursor: ${containerCursor}; transition: 0.2s; padding: 10px; border-radius: 12px; ${plateStyle}">
        ${avatarHtml}
        <div style="flex: 1; min-width: 0; position: relative; z-index: 2;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span style="font-weight: 700; font-size: ${isReply ? '12px' : '13px'}; color:#fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor:pointer;" onclick="event.stopPropagation(); openUserProfile('${c.uid}')">${c.nama}</span>
                <span style="font-size: 10px; color: #888; flex-shrink: 0;">• ${timeStr}</span>
                ${hintHapus}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                <span class="c-badge ${lvlClass}" onclick="event.stopPropagation(); openLevelModal(${level}, '${userExp}', ${userJam})" style="cursor: pointer;">${rankInfo.icon} Lvl. ${level}</span>
                <span class="c-badge ${roleBadgeClass}">${roleName}</span>
                <span style="font-size: 10px; color: #666; font-family: monospace; letter-spacing: 0.5px;">${uidStr}</span>
            </div>
            <div style="font-size: ${isReply ? '12px' : '13px'}; color: #d1d5db; line-height: 1.5; word-wrap: break-word; margin-bottom: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${c.teks}</div>
            <div style="margin-top: 4px;">${replyBtnHtml}</div>
        </div>
    </div>`;
}

function listenToComments(epID) { db.ref('comments/' + epID).on('value', snap => { const list = document.getElementById('comment-list-container'); const countEl = document.getElementById('comment-count-text'); if(!snap.exists()) { if(countEl) countEl.innerText = "0 Comments"; if(list) list.innerHTML = '<div style="text-align:center; padding:30px 0;"><p style="color:#555; font-size:13px;">Belum ada komentar.</p></div>'; return; } let commentsArr = []; snap.forEach(child => { commentsArr.push({ id: child.key, ...child.val() }); }); if(countEl) { let total = commentsArr.length; countEl.innerText = total > 1000 ? (total/1000).toFixed(1) + 'K Comments' : total + ' Comments'; } if(window.currentCommentSort === 'new') { commentsArr.sort((a, b) => b.waktu - a.waktu); } else { commentsArr.sort((a, b) => a.waktu - b.waktu); } if(list) list.innerHTML = commentsArr.map(c => generateCommentHtml(c, false, epID, c.id)).join(''); }); }

window.openReplyModal = function(epID, parentID) {
    document.getElementById('replyModalOverlay').style.display = 'block'; document.getElementById('replyModal').style.display = 'block'; setTimeout(() => { document.getElementById('replyModal').classList.add('show'); }, 10);
    
    db.ref(`comments/${epID}/${parentID}`).once('value').then(snap => { 
        if(snap.exists()) {
            let pData = { id: snap.key, ...snap.val() };
            document.getElementById('reply-parent-content').innerHTML = generateCommentHtml(pData, false, epID, snap.key); 
        }
    });
    
    db.ref(`replies/${parentID}`).on('value', snap => { 
        const list = document.getElementById('reply-list-container'); 
        if(!snap.exists()) { list.innerHTML = '<div style="font-size:12px; color:#666; padding:10px 0;">Jadilah yang pertama membalas...</div>'; return; } 
        
        let repliesArr = []; 
        snap.forEach(child => repliesArr.push({ id: child.key, ...child.val() })); 
        repliesArr.sort((a, b) => a.waktu - b.waktu); 
        list.innerHTML = repliesArr.map(r => generateCommentHtml(r, true, null, parentID)).join(''); 
    });
    
    const inputArea = document.getElementById('reply-input-area'); 
    if(!currentUser) { 
        inputArea.innerHTML = `<div style="text-align:center; padding:10px; color:#888; font-size:12px; cursor:pointer;" onclick="closeReplyModal(); switchTab('developer')">Login untuk membalas...</div>`; 
    } 
    else { 
        const userFoto = currentUser.photoURL || 'https://placehold.co/40'; 
        inputArea.innerHTML = `<div style="display: flex; gap: 10px; align-items: center; margin-top: 15px;"><div id="reply-input-avatar" style="position: relative; width: 32px; height: 32px; flex-shrink: 0;"><img src="${userFoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block;"></div><div style="flex: 1; position: relative;"><input type="text" id="reply-input-text" onkeypress="if(event.key === 'Enter') postReply('${parentID}')" placeholder="Balas komentar..." style="width: 100%; background: #1c1c1e; border: 1px solid #2c2c2e; color: #fff; padding: 10px 40px 10px 15px; border-radius: 20px; font-size: 13px; outline: none; box-sizing: border-box;"><button onclick="postReply('${parentID}')" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: transparent; border: none; padding: 6px; cursor: pointer; display: flex;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div></div>`; 
        
        db.ref('users/' + currentUser.uid).once('value').then(snap => {
            let d = snap.val();
            if(d && d.activeBorder && window.BORDER_CATALOG && window.BORDER_CATALOG[d.activeBorder]) {
                let decoUrl = window.BORDER_CATALOG[d.activeBorder].url;
                let avatarContainer = document.getElementById('reply-input-avatar');
                if(avatarContainer) {
                    avatarContainer.innerHTML = `<img src="${userFoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display:block;"><div class="avatar-deco-overlay" style="background-image:url('${decoUrl}');"></div>`;
                }
            }
        });
    }
};

window.closeReplyModal = function() { const modal = document.getElementById('replyModal'); modal.classList.remove('show'); setTimeout(() => { document.getElementById('replyModalOverlay').style.display = 'none'; modal.style.display = 'none'; }, 300); };

window.postReply = function(parentID) { 
    const input = document.getElementById('reply-input-text'); 
    const text = input.value; 
    if(!text.trim() || !currentUser) return; 
    
    db.ref('users/' + currentUser.uid).once('value').then(snap => { 
        const u = snap.val(); 
        const role = u.role || 'Member';
        const level = u.level || 1;
        const isPremium = (role === 'Wibu Premium' || role === 'Developer' || level >= 50);

        const saveReply = () => {
            db.ref('replies/' + parentID).push().set({ 
                uid: currentUser.uid, 
                nama: u.nama, 
                foto: u.foto, 
                role: u.role || 'Member', 
                level: u.level || 1, 
                teks: text, 
                waktu: Date.now() 
            }); 
            input.value = ''; 
            addXP(5); 
        };

        if (isPremium) {
            saveReply();
        } else {
            db.ref('replies/' + parentID).orderByChild('uid').equalTo(currentUser.uid).once('value').then(rSnap => {
                if (rSnap.exists()) {
                    window.showToast('Wibu Biasa hanya bisa membalas 1x di komentar ini.', 'error');
                } else {
                    saveReply();
                }
            });
        }
    }); 
};


window.allowExitApp = false; 
// ==========================================
// CAPACITOR BACK BUTTON HANDLER (Android Native)
// Intercept tombol back HP di level native via Capacitor
// Ini lebih reliable dari popstate di browser
// ==========================================
function setupCapacitorBack() {
    if (!window.Capacitor) return; // tidak jalan di browser biasa

    const { App } = window.Capacitor.Plugins;
    if (!App) return;

    App.addListener('backButton', () => {
        const stack = window.appPageStack || ['home'];
        const currentPage = stack[stack.length - 1];

        // Stop video
        const p = document.getElementById('video-player');
        if (p) p.src = '';

        if (currentPage === 'home' && stack.length <= 1) {
            // Di home → exit modal
            if (typeof openExitModal === 'function') openExitModal();
        } else {
            // Pop halaman sekarang, tampilkan sebelumnya
            window.appPageStack.pop();
            const prevPage = window.appPageStack[window.appPageStack.length - 1] || 'home';
            if (window.appPageStack.length === 0) window.appPageStack = ['home'];
            if (typeof switchTab === 'function') switchTab(prevPage);
        }
    });
}

// Jalankan setelah DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCapacitorBack);
} else {
    setupCapacitorBack();
}
// Juga coba setelah Capacitor ready
document.addEventListener('deviceready', setupCapacitorBack);


function setupHistoryTrap() { 
    if (!window.historyTrapSet) {
        history.replaceState({type: 'sentinel'}, '', location.pathname);
        history.pushState({type: 'app'}, '', location.pathname);
        window.historyTrapSet = true;
        window.appPageStack = ['home'];
    }
}

setupHistoryTrap();

window.addEventListener('popstate', (e) => { 
    if (window.allowExitApp) return;

    const state = e.state;
    const isSentinel = !state || state.type === 'sentinel';

    // Stop video
    const p = document.getElementById('video-player');
    if (p) p.src = '';

    if (isSentinel) {
        const stack = window.appPageStack;
        const currentPage = stack[stack.length - 1];

        if (currentPage === 'home' && stack.length <= 1) {
            // Di home, back lagi → exit modal
            // go(1) balik ke #app tanpa trigger popstate
            history.go(1);
            setTimeout(() => openExitModal(), 50);
        } else {
            // Pop halaman sekarang
            window.appPageStack.pop();
            const prevPage = window.appPageStack[window.appPageStack.length - 1] || 'home';
            if (window.appPageStack.length === 0) window.appPageStack = ['home'];
            // go(1) balik ke entry app tanpa trigger popstate baru
            history.go(1);
            setTimeout(() => switchTab(prevPage), 50);
        }
        return;
    }

    // state.type === 'app'
    const cur = window.appPageStack[window.appPageStack.length - 1] || 'home';
    switchTab(cur);
});

window.goBack = function() {
    // FIX v34: back yang cerdas — kalau dari search, balik ke search; dari home ke home
    const stack = window.appPageStack;
    if (stack[stack.length - 1] === 'detail') window.appPageStack.pop();
    const prev = window.appPageStack[window.appPageStack.length - 1] || 'home';
    if (window.appPageStack.length === 0) window.appPageStack = ['home'];
    switchTab(prev);
};
window.goHome = function() { 
    window.appPageStack = ['home'];
    switchTab('home');
};
window.backToDetail = function() { 
    window.currentPlayingAnime = null;
    window.renderDetailEpisodeUI();
    // Pop 'watch' dari stack, balik ke 'detail'
    const stack = window.appPageStack;
    if (stack[stack.length - 1] === 'watch') window.appPageStack.pop();
    switchTab('detail');
};

window.injectExitModal = function() {
    if(document.getElementById('exit-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'exit-modal-injected';
    div.innerHTML = `<div id="exitModalOverlay" class="modal-overlay" onclick="cancelExit()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div><div id="exitModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:300px; border-radius:24px; z-index:9999999; padding:25px 20px 20px 20px; transition:0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #2c2c2e; text-align: center;"><div style="width:50px; height:50px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: -40px auto 15px auto; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div><h3 style="color:#fff; margin:0 0 10px 0; font-size:18px; font-weight:900;">Yakin ingin keluar?</h3><p style="color:#888; font-size:13px; margin-bottom:20px; line-height:1.5;">Apakah kamu yakin ingin menutup aplikasi Animeku?</p><div style="display:flex; gap:10px;"><button onclick="cancelExit()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s;">Tidak</button><button onclick="confirmExit()" style="flex:1; background:#ef4444; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); transition:0.2s;">Ya, Keluar</button></div></div>`;
    document.body.appendChild(div);
};
window.openExitModal = function() { document.getElementById('exitModalOverlay').style.display = 'block'; document.getElementById('exitModal').style.display = 'block'; setTimeout(() => { document.getElementById('exitModal').style.opacity = '1'; document.getElementById('exitModal').style.transform = 'translate(-50%, -50%) scale(1)'; }, 10); };
window.cancelExit = function() { document.getElementById('exitModal').style.opacity = '0'; document.getElementById('exitModal').style.transform = 'translate(-50%, -50%) scale(0.9)'; setTimeout(() => { document.getElementById('exitModalOverlay').style.display = 'none'; document.getElementById('exitModal').style.display = 'none'; }, 300); };
window.confirmExit = function() { window.allowExitApp = true; window.history.go(-2); setTimeout(() => { window.close(); }, 300); };

// ==========================================
// FITUR MODAL HAPUS KOMENTAR
// ==========================================
let commentToDelete = null;

window.injectDeleteModal = function() {
    if(document.getElementById('delete-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'delete-modal-injected';
    div.innerHTML = `<div id="deleteModalOverlay" class="modal-overlay" onclick="closeDeleteModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div><div id="deleteModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:300px; border-radius:24px; z-index:9999999; padding:25px 20px 20px 20px; transition:0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #2c2c2e; text-align: center;"><div style="width:50px; height:50px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: -40px auto 15px auto; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div><h3 style="color:#fff; margin:0 0 10px 0; font-size:18px; font-weight:900;">Hapus Komentar?</h3><p style="color:#888; font-size:13px; margin-bottom:20px; line-height:1.5;">Komentar ini akan dihapus secara permanen dan tidak bisa dikembalikan.</p><div style="display:flex; gap:10px;"><button onclick="closeDeleteModal()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s;">Batal</button><button onclick="confirmDeleteComment()" style="flex:1; background:#ef4444; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); transition:0.2s;">Ya, Hapus</button></div></div>`;
    document.body.appendChild(div);
};

window.openDeleteModal = function(isReply, epID, parentID, replyID) {
    commentToDelete = { isReply, epID, parentID, replyID };
    injectDeleteModal();
    document.getElementById('deleteModalOverlay').style.display = 'block'; 
    document.getElementById('deleteModal').style.display = 'block'; 
    setTimeout(() => { 
        document.getElementById('deleteModal').style.opacity = '1'; 
        document.getElementById('deleteModal').style.transform = 'translate(-50%, -50%) scale(1)'; 
    }, 10);
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteModal'); const overlay = document.getElementById('deleteModalOverlay');
    if(modal) {
        modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)'; 
        setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; commentToDelete = null; }, 300);
    }
};

window.confirmDeleteComment = function() {
    if (!commentToDelete) return;
    const { isReply, epID, parentID, replyID } = commentToDelete;
    
    if (isReply) {
        db.ref(`replies/${parentID}/${replyID}`).remove().then(() => {
            window.showToast("Balasan berhasil dihapus!", "success");
            closeDeleteModal();
        });
    } else {
        db.ref(`comments/${epID}/${parentID}`).remove().then(() => {
            db.ref(`replies/${parentID}`).remove();
            window.showToast("Komentar berhasil dihapus!", "success");
            closeDeleteModal();
            
            const replyModal = document.getElementById('replyModal');
            if (replyModal && replyModal.classList.contains('show')) { closeReplyModal(); }
        });
    }
};

// ==========================================
// FITUR JADWAL RILIS ANIME
// ==========================================
window.cachedScheduleData = null; 

function injectScheduleStyles() {
    if(document.getElementById('schedule-styles')) return;
    const style = document.createElement('style'); style.id = 'schedule-styles';
    style.innerHTML = `
        .sched-day-scroll { display: flex; overflow-x: auto; gap: 15px; padding: 15px 20px; background: #050505; border-bottom: 1px solid #1a1a1a; position: sticky; top: 0; z-index: 10; }
        .sched-day-scroll::-webkit-scrollbar { display: none; }
        .sched-day-item { display: flex; flex-direction: column; align-items: center; gap: 5px; color: #666; font-weight: 700; cursor: pointer; min-width: 40px; transition: 0.2s; }
        .sched-day-item .s-name { font-size: 12px; }
        .sched-day-item .s-date { font-size: 16px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .sched-day-item.active { color: #3b82f6; }
        .sched-day-item.active .s-date { background: #3b82f6; color: #fff; box-shadow: 0 4px 10px rgba(59,130,246,0.4); }
        .sched-card { display: flex; gap: 12px; padding: 12px; border: 1px solid #2c2c2e; border-radius: 12px; cursor: pointer; transition: 0.2s; background: #1c1c1e; align-items: center; margin: 0 15px 15px 15px; box-sizing: border-box; }
        .sched-card:hover { border-color: #3b82f6; }
        .sched-time { font-size: 16px; font-weight: 900; color: #fff; width: 50px; text-align: center; flex-shrink: 0; }
        .sched-img { width: 75px; height: 100px; border-radius: 8px; object-fit: cover; border: 1px solid #222; flex-shrink: 0; background: #111;}
        .sched-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .sched-title { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sched-ep { font-size: 12px; color: #d1d5db; margin-bottom: 6px; font-weight: 600; }
        .sched-stats { font-size: 11px; color: #a1a1aa; display: flex; align-items: center; gap: 8px; font-weight: 500; margin-bottom: 6px; }
        .sched-status { font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
        .status-wait { color: #a1a1aa; } .status-wait::before { content: ''; display: inline-block; width: 6px; height: 6px; background: #555; border-radius: 50%; }
        .status-done { color: #10b981; } .status-done::before { content: ''; display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 5px #10b981; }
        .sched-float-nav { display: flex; justify-content: space-between; padding: 15px 20px; background: linear-gradient(transparent, #050505 40%); position: fixed; bottom: 110px; width: 100%; max-width: 500px; box-sizing: border-box; pointer-events: none; z-index: 10; }
        .sched-btn { pointer-events: auto; background: #1c1c1e; color: #fff; border: 1px solid #333; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
    `;
    document.head.appendChild(style);
}

window.currentJadwalDay = new Date().getDay(); 
const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

window.initJadwal = async function() {
    injectScheduleStyles();
    if (document.getElementById('sched-list-container').innerHTML === '') {
        renderJadwalDays(window.currentJadwalDay); await loadJadwalData(window.currentJadwalDay);
    }
};

window.changeJadwalDay = function(direction) { let newDay = window.currentJadwalDay + direction; if(newDay > 6) newDay = 0; if(newDay < 0) newDay = 6; window.currentJadwalDay = newDay; renderJadwalDays(newDay); loadJadwalData(newDay); };
window.setJadwalDay = function(dayIndex) { window.currentJadwalDay = dayIndex; renderJadwalDays(dayIndex); loadJadwalData(dayIndex); };

function renderJadwalDays(activeDay) {
    const container = document.getElementById('sched-days-container'); const today = new Date(); const currentDayOfWeek = today.getDay(); 
    let html = '';
    for(let i = 0; i < 7; i++) {
        let diff = i - currentDayOfWeek; let dateOfThisDay = new Date(today); dateOfThisDay.setDate(today.getDate() + diff); let tgl = dateOfThisDay.getDate();
        let isActive = (i === activeDay) ? 'active' : '';
        html += `<div class="sched-day-item ${isActive}" onclick="setJadwalDay(${i})"><div class="s-name">${NAMA_HARI[i]}</div><div class="s-date">${tgl}</div></div>`;
    }
    container.innerHTML = html;
    let prevDay = activeDay - 1; if(prevDay < 0) prevDay = 6; let nextDay = activeDay + 1; if(nextDay > 6) nextDay = 0;
    document.getElementById('sched-text-prev').innerText = NAMA_HARI_FULL[prevDay]; document.getElementById('sched-text-next').innerText = NAMA_HARI_FULL[nextDay];
}

async function loadJadwalData(dayIndex) {
    const container = document.getElementById('sched-list-container'); 
    if (!window.cachedScheduleData) { loader(true); }

    try {
        let data;
        if (window.cachedScheduleData) { 
            data = window.cachedScheduleData; 
        } else { 
            const res = await fetchTimeout(`${API_BASE}/latest`, 10000); 
            data = await res.json(); 
            if(!data || data.length === 0) throw new Error("No data"); 
            window.cachedScheduleData = data; 
        }

        // 1. HAPUS DUPLIKAT, FILTER ONGOING, & TENTUKAN JADWAL PERMANEN
        let uniqueAnimeMap = new Map();
        
        // Filter hanya anime yang sedang ongoing (bukan tamat/completed/movie)
        const ongoingData = data.filter(anime => {
            const epText = String(anime.episode || anime.episodes || anime.status || anime.type || '').toLowerCase().trim();
            // Hapus yang sudah tamat atau movie dari jadwal
            if (epText.includes('tamat') || epText.includes('completed')) return false;
            if (epText.includes('movie') || epText.includes('film')) return false;
            return true;
        });
        
        // Gunakan ongoingData jika ada, fallback ke semua data
        const jadwalSource = ongoingData.length > 0 ? ongoingData : data;

        jadwalSource.forEach(anime => {
            // Bersihkan judul dari embel-embel "Episode X" biar ketahuan anime aslinya dan nggak double
            let cleanTitle = anime.title.replace(/(?:\s*-?\s*(?:Episode|Eps|Ep)\s*\d+.*)$/i, '').trim();
            
            if (!uniqueAnimeMap.has(cleanTitle)) {
                // Bikin rumus Hash: Kunci hari & jam berdasarkan nama anime biar nggak berubah-ubah
                let hash = 0;
                for (let i = 0; i < cleanTitle.length; i++) { 
                    hash = cleanTitle.charCodeAt(i) + ((hash << 5) - hash); 
                }
                hash = Math.abs(hash);

                let schedDay = hash % 7; // Mengubah hash jadi hari (0 = Minggu, 6 = Sabtu)
                let hour = (hash % 15) + 8; // Rilis antara jam 08:00 pagi sampai 22:00 malam
                let minute = (hash % 12) * 5; // Menit kelipatan 5 (00, 05, 10... 55)
                
                anime.schedDay = schedDay;
                anime.releaseHour = hour;
                anime.releaseTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                
                uniqueAnimeMap.set(cleanTitle, anime);
            }
        });

        // Ubah Map kembali jadi Array
        let jadwalAnime = Array.from(uniqueAnimeMap.values());

        // 2. FILTER SESUAI HARI YANG DIPILIH
        let todaysAnime = jadwalAnime.filter(a => a.schedDay === dayIndex);
        
        // 3. URUTKAN DARI PAGI KE MALAM BIAR RAPI
        todaysAnime.sort((a, b) => a.releaseHour - b.releaseHour);

        let html = ''; 
        let currentHour = new Date().getHours(); 
        let isToday = dayIndex === new Date().getDay();
        
        todaysAnime.forEach((anime, idx) => {
            let isReleased = isToday ? (anime.releaseHour <= currentHour) : (dayIndex < new Date().getDay());
            let statusText = isReleased ? `<span class="status-done">Sudah Update Rilis</span>` : `<span class="status-wait">Menunggu Update Baru</span>`;
            
            // Bikin views dan score palsu tapi konsisten berdasarkan jam tayang
            let pseudoRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
            let mockViews = `${Math.floor(pseudoRandom(anime.releaseHour) * 200 + 10)},${Math.floor(pseudoRandom(anime.releaseHour+1)*9)}K`; 
            let mockScore = (pseudoRandom(anime.releaseHour+2) * 2 + 6.0).toFixed(2); 
            let epBadge = getEpBadge(anime) || "Episode ?";
            
            html += `
            <div class="sched-card" onclick="loadDetail('${anime.url}')">
                <div class="sched-time">${anime.releaseTime}</div>
                <img src="${getHighRes(anime.image)}" class="sched-img" onerror="this.src='https://placehold.co/70x100/1a1a1a/3b82f6?text=Anime'">
                <div class="sched-info">
                    <div class="sched-title">${anime.title}</div>
                    <div class="sched-ep">${epBadge}</div>
                    <div class="sched-stats">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${mockViews} 
                        <span style="color:#fbbf24; margin-left:8px;">⭐ ${mockScore}</span>
                    </div>
                    <div class="sched-status">${statusText}</div>
                </div>
            </div>`;
        });
        
        if(todaysAnime.length === 0) { 
            html = `<div style="text-align:center; padding: 50px; color:#555;">Tidak ada jadwal rilis hari ini.</div>`; 
        }
        container.innerHTML = html;
    } catch(e) { 
        container.innerHTML = `<div style="text-align:center; padding: 50px; color:#ef4444;">Gagal memuat jadwal. Server sedang sibuk.</div>`; 
    }
    loader(false);
}

function showUpdateNotification(updates) {
    if (!document.getElementById('in-app-notif-container')) { const container = document.createElement('div'); container.id = 'in-app-notif-container'; container.style.cssText = 'position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:9999999; display:flex; flex-direction:column; gap:10px; width:90%; max-width:350px; pointer-events:none;'; document.body.appendChild(container); }
    const container = document.getElementById('in-app-notif-container');
    updates.forEach((update, idx) => {
        setTimeout(() => {
            const notif = document.createElement('div');
            notif.style.cssText = 'pointer-events:auto; background:#1c1c1e; border:1px solid #3b82f6; border-radius:16px; padding:12px; display:flex; gap:12px; align-items:center; box-shadow:0 10px 25px rgba(0,0,0,0.8); transform:translateY(-30px) scale(0.95); opacity:0; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer;';
            notif.innerHTML = `<img src="${getHighRes(update.image)}" style="width:45px; height:45px; border-radius:10px; object-fit:cover; border:1px solid #333;"><div style="flex:1; min-width:0;"><div style="color:#3b82f6; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Update Rilis!</div><div style="color:#fff; font-size:14px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${update.title}</div><div style="color:#a1a1aa; font-size:12px; font-weight:500;">Episode ${update.newEp} sudah tersedia.</div></div><div style="background:rgba(59,130,246,0.15); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></div>`;
            notif.onclick = () => { notif.style.opacity = '0'; notif.style.transform = 'translateY(-20px) scale(0.95)'; setTimeout(() => notif.remove(), 300); loadDetail(update.url); };
            container.appendChild(notif); setTimeout(() => { notif.style.transform = 'translateY(0) scale(1)'; notif.style.opacity = '1'; }, 10);
            setTimeout(() => { if(notif.parentNode) { notif.style.opacity = '0'; notif.style.transform = 'translateY(-20px) scale(0.95)'; setTimeout(() => { if(notif.parentNode) notif.remove(); }, 300); } }, 6000);
        }, idx * 1200); 
    });
}

async function checkAnimeUpdates() {
    try {
        const favorites = await getFavorites(); if (!favorites || favorites.length === 0) return;
        const res = await fetchTimeout(`${API_BASE}/latest`, 10000); if (!res || !res.ok) return; const latestData = await res.json();
        let updatedAnimes = []; const database = await initDB();
        for (const latest of latestData) {
            const fav = favorites.find(f => f.url === latest.url);
            if (fav) {
                const extractEpNum = (str) => { if (!str) return 0; let m = String(str).match(/(?:Episode|Eps|Ep)\s*(\d+(\.\d+)?)/i); if (m) return parseFloat(m[1]); let nums = String(str).match(/\d+/g); return nums ? parseFloat(nums[nums.length - 1]) : 0; };
                let favEpNum = extractEpNum(fav.episode); let latestEpNum = extractEpNum(getEpBadge(latest));
                if (latestEpNum > favEpNum) { updatedAnimes.push({ title: fav.title, newEp: latestEpNum, url: fav.url, image: fav.image }); fav.episode = `Eps ${latestEpNum}`; database.transaction(STORE_FAV, 'readwrite').objectStore(STORE_FAV).put(fav); }
            }
        }
        if (updatedAnimes.length > 0) showUpdateNotification(updatedAnimes);
    } catch (e) {}
}

function switchTab(tabName) {
    // FIX LAYAR NYANGKUT: Tutup paksa semua modal tersembunyi pas pindah halaman
    document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.bottom-sheet').forEach(el => { el.style.display = 'none'; el.classList.remove('show'); });

    // Sembunyikan semua halaman
    ['home-view', 'recent-view', 'favorite-view', 'developer-view', 'detail-view', 'watch-view', 'search-view', 'jadwal-view'].forEach(v => { 
        let el = document.getElementById(v); 
        if(el) el.classList.add('hidden'); 
    });

    // --- FIX NAVBAR NGIKUT ---
    // Pastikan Navbar Profil Atas CUMA MUNCUL di halaman 'home' saja!
    let mainNav = document.getElementById('mainNavbar');
    if (mainNav) {
        mainNav.style.display = (tabName === 'home') ? 'flex' : 'none';
    }

    // Atur padding #app berdasarkan halaman
    let appEl = document.getElementById('app');
    if (appEl) {
        appEl.style.paddingBottom = (tabName === 'detail' || tabName === 'watch') ? '0' : '80px';
    }

    // Sembunyikan Navigasi Bawah saat nonton, buka detail, atau search
    let botNav = document.getElementById('bottomNav');
    if (botNav) {
        if (tabName === 'detail' || tabName === 'watch' || tabName === 'search') {
            botNav.classList.add('nav-hidden');
        } else {
            botNav.classList.remove('nav-hidden');
        }
    }

    // Sembunyikan footer copyright saat di detail/watch
    let footerEl = document.querySelector('main > div[style*="2026 Animeku"], main > div:last-of-type');
    // Cari semua div langsung di #app yang bukan view
    document.querySelectorAll('#app > div:not([id])').forEach(el => {
        if (el.textContent && el.textContent.includes('2026')) {
            el.style.display = (tabName === 'detail' || tabName === 'watch') ? 'none' : '';
        }
    });

    // Ubah warna tombol navigasi bawah yang sedang aktif
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    // Tampilkan halaman yang dituju
    let targetView = document.getElementById(tabName + '-view'); 
    if(targetView) targetView.classList.remove('hidden');
    
    let targetNav = document.getElementById('tab-' + tabName); 
    if(targetNav) targetNav.classList.add('active');
    
    // Load data jika halamannya kosong
    if (tabName === 'home' && document.getElementById('home-view').innerHTML === '') loadLatest();
    if (tabName === 'recent') loadRecentHistory();
    if (tabName === 'favorite') loadFavorites(); // Selalu reload agar data subscribe terbaru muncul
    if (tabName === 'jadwal') initJadwal();
}

// // ==========================================
// ==========================================
// FITUR NAVIGASI BAWAH PREMIUM (BIG SIZE + MEKAR KE BAWAH)
// ==========================================
window.injectPremiumBottomNav = function() {
    if(!document.getElementById('premium-bottom-nav-style')) {
        const style = document.createElement('style');
        style.id = 'premium-bottom-nav-style';
        style.innerHTML = `
            /* 1. Navbar Nempel Bawah Full Lebar - UKURAN DIPERBESAR */
            #bottomNav {
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                background: #050505 !important;
                border-top: 1px solid #1a1a1a !important;
                display: flex !important;
                justify-content: space-around !important;
                align-items: center !important;
                padding: 12px 5px calc(12px + env(safe-area-inset-bottom)) 5px !important;
                z-index: 999999 !important;
                width: 100% !important;
                box-shadow: 0 -5px 25px rgba(0,0,0,0.7) !important;
                min-height: 70px !important;
            }

            /* Class untuk sembunyikan navbar saat di halaman detail/watch */
            #bottomNav.nav-hidden {
                display: none !important;
            }

            /* 2. Container Item (KOLOM) */
            .nav-item {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 10px !important;
                border-radius: 20px !important;
                cursor: pointer !important;
                transition: all 0.4s cubic-bezier(0.25, 1, 0.35, 1) !important;
                color: #64748b !important;
                background: transparent !important;
                -webkit-tap-highlight-color: transparent !important;
                min-width: 70px !important; /* Lebar per item ditambah */
            }

            /* 3. Style Ikon - UKURAN LEBIH BESAR */
            .nav-item svg {
                flex-shrink: 0 !important;
                stroke: #64748b !important;
                width: 26px !important; /* Ukuran ikon naik dari 22px ke 26px */
                height: 26px !important;
                transition: all 0.4s cubic-bezier(0.25, 1, 0.35, 1) !important;
            }

            /* 4. Style Teks (NGUMPET DULU) */
            .nav-text {
                font-size: 11px !important; /* Font sedikit lebih besar */
                font-weight: 900 !important;
                max-height: 0px !important;
                opacity: 0 !important;
                overflow: hidden !important;
                transition: all 0.3s cubic-bezier(0.25, 1, 0.35, 1) !important;
                white-space: nowrap !important;
                margin-top: 0px !important;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }

            /* 5. EFEK KETIKA MENU AKTIF */
            .nav-item.active {
                color: #3b82f6 !important;
            }
            
            /* Ikon melompat lebih tinggi & ganti warna */
            .nav-item.active svg {
                stroke: #3b82f6 !important;
                fill: rgba(59, 130, 246, 0.25) !important;
                transform: translateY(-5px) !important;
            }
            
            /* TEKS MEKAR KE BAWAH */
            .nav-item.active .nav-text {
                max-height: 25px !important;
                opacity: 1 !important;
                margin-top: 6px !important;
            }

            /* Efek Menciut Pas Ditekan (Haptic Style) */
            .nav-item:active {
                transform: scale(0.85) !important;
            }

            /* 6. Foto Profil (PP) di Tab Akun - LEBIH BESAR */
            .nav-pp {
                width: 28px !important; /* Ukuran PP naik ke 28px */
                height: 28px !important;
                border-radius: 50% !important; 
                object-fit: cover !important;
                border: 2px solid transparent !important;
                transition: all 0.4s !important;
                flex-shrink: 0 !important;
            }
            .nav-item.active .nav-pp {
                border-color: #3b82f6 !important;
                transform: translateY(-5px) !important;
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            }

            /* 7. Padding Konten - JANGAN SAMPAI KETUTUP */
            #home-view, #jadwal-view, #recent-view, #favorite-view, #auth-check-container, #search-view {
                padding-bottom: 110px !important; /* Padding bawah ditambah biar aman */
            }

            /* Detail & Watch: full screen tanpa gangguan navbar */
            #detail-view, #watch-view {
                padding-bottom: 0 !important;
                min-height: 100vh;
            }
        `;
        document.head.appendChild(style);
    }

    const nav = document.getElementById('bottomNav');
    if(nav) {
        let ppUrl = (typeof currentUser !== 'undefined' && currentUser && currentUser.photoURL) ? currentUser.photoURL : 'https://placehold.co/100';
        
        nav.innerHTML = `
            <div class="nav-item active" id="tab-home" onclick="switchTab('home')">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span class="nav-text">Home</span>
            </div>
            <div class="nav-item" id="tab-jadwal" onclick="switchTab('jadwal')">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span class="nav-text">Jadwal</span>
            </div>
            <div class="nav-item" id="tab-recent" onclick="switchTab('recent')">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="nav-text">Recent</span>
            </div>
            <div class="nav-item" id="tab-favorite" onclick="switchTab('favorite')">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                <span class="nav-text">Subscribe</span>
            </div>
            <div class="nav-item" id="tab-developer" onclick="switchTab('developer')">
                <img id="nav-bottom-pp" src="${ppUrl}" class="nav-pp" onerror="this.src='https://placehold.co/100'">
                <span class="nav-text">Akun</span>
            </div>
        `;
    }
};

// INITIALIZATION (Pastikan bagian ini paling bawah dan bersih)
function initApp() { 
    injectPremiumBottomNav(); 
    updateDevUI(); 
    injectReportModal(); 
    injectExitModal(); 
    injectDeleteModal(); 
    injectChangeNameModal(); 
    injectLogoutModal(); 
    injectTransactionModal();
    switchTab('home'); 
    setTimeout(() => { checkAnimeUpdates(); }, 3000);
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }

// ==========================================
// FITUR MALL KOSMETIK (BORDER & EFEK KOMEN)
// ==========================================
window.COSMETIC_CATALOG = {
    borders: {
        'glitch_merah': { nama: 'Glitch Merah (Mythic)', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1436367668897775757/animated' },
        'blue_premium': { nama: 'Blue Premium', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1373015260507930664/animated' },
        'phoenix': { nama: 'Phoenix', harga: 750, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1298033986622328842/animated' },
        'venom': { nama: 'Venom', harga: 800, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1481388474673139855/animated' },
        'black-mana': { nama: 'Black Mana', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1379220459026911342/animated' },
        'the-haxcore': { nama: 'The Hacxcore', harga: 2000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165171294268/animated' },
        'fishbones': { nama: 'FISHBONES!', harga: 1500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165150322698/animated' },
        'hologram-dragon': { nama: 'Hologram Dragon', harga: 3000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1366494385583165630/animated' },
        'baby-displacer-beast': { nama: 'Baby-Displacer-Beast', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1293373563352649961/animated' },
        'fallen-angel-(black)': { nama: 'Fallen Angel (Black)', harga: 700, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1462116613682757888/animated' },
        'spider-man': { nama: 'Spider Man', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1481384635886862397/animated' },
        'super-recognizer': { nama: 'Super Recognizer', harga: 1200, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1437881614062452838/animated' },
        'infinite-swirl': { nama: 'Infinite Swirl', harga: 800, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1427463138634109027/animated' },
        'juggernaut-astro': { nama: 'Juggernaut Astro', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1387888352639975484/animated' },
        'the-anomaly': { nama: 'The-Anomaly', harga: 2000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1306752744258011166/animated' },
        'purple-animation': { nama: 'Purple-Animation', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1303490165192265799/animated' },
        'dark-hood': { nama: 'Dark Hood', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633615765524/animated' },
        'dark-hood (crimson)': { nama: 'Drak Hood (crimson)', harga: 500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633645125653/animated' },
        'zombie-food': { nama: 'Zombie Food', harga: 1500, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1287835633762701382/animated' },
        'juri': { nama: 'Juri', harga: 1000, url: 'https://cdn.discordapp.com/media/v1/collectibles-shop/1285465421193154560/animated' }
    },
        commentplates: {
        'dark_nebula': { nama: 'Dark Nebula', harga: 1200, style: 'background: linear-gradient(90deg, rgba(88,28,135,0.3), transparent); border-left: 3px solid #8b5cf6;' },
        'toxic_green': { nama: 'Toxic Slime', harga: 1200, style: 'background: linear-gradient(90deg, rgba(6,78,59,0.3), transparent); border-left: 3px solid #10b981;' }
    }
};

window.currentShopCategory = 'borders';

window.beliKoinWa = function(koin, harga) {
    if(!currentUser) return;
    let text = `Halo Admin, saya mau Top Up Koin Animeku.%0A%0AUID Saya: ${currentUser.uid}%0ANama: ${currentUser.displayName}%0APaket: ${koin} Koin seharga ${harga}`;
    window.open('https://wa.me/6281315059849?text=' + text);
};

window.openBorderShop = function() {
    if(!currentUser) return window.showToast('Login dulu untuk belanja!', 'error');
    if(!document.getElementById('borderShopModal')) {
        const div = document.createElement('div');
        div.innerHTML = `
            <div id="borderShopOverlay" class="modal-overlay" onclick="closeBorderShop()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div>
            <div id="borderShopModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#050505; width:340px; border-radius:24px; z-index:9999999; padding:20px; transition:0.3s; opacity:0; border: 1px solid #1a1a1a;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #111; padding-bottom: 15px; margin-bottom: 15px;">
                    <h3 style="color:#fff; margin:0; font-size:18px; font-weight:900;">Mall Kosmetik</h3>
                    <div style="background:#facc15; color:#000; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:800;">
                        <span id="user-coin-balance">0</span> Koin
                    </div>
                </div>
                
                <div style="display:flex; gap:5px; margin-bottom:15px;">
                    <button id="tab-shop" onclick="switchBorderTab('shop')" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:8px; border-radius:10px; font-weight:800; cursor:pointer; font-size:12px;">Shop</button>
                    <button id="tab-gift" onclick="switchBorderTab('gift')" style="flex:1; background:#1c1c1e; color:#fff; border:none; padding:8px; border-radius:10px; font-weight:800; cursor:pointer; font-size:12px;">Gift</button>
                    <button id="tab-topup" onclick="switchBorderTab('topup')" style="flex:1; background:#1c1c1e; color:#fff; border:none; padding:8px; border-radius:10px; font-weight:800; cursor:pointer; font-size:12px;">Top Up</button>
                </div>

                <div id="category-selector" style="display:flex; justify-content:center; gap:15px; margin-bottom:15px; border-bottom:1px solid #111; padding-bottom:10px;">
                    <span onclick="setShopCategory('borders')" class="cat-item active" id="cat-borders" style="color:#fff; font-size:12px; font-weight:800; cursor:pointer;">Border Profil</span>
                    <span onclick="setShopCategory('commentplates')" class="cat-item" id="cat-commentplates" style="color:#666; font-size:12px; font-weight:800; cursor:pointer;">Efek Komen</span>
                </div>

                <div id="view-shop" style="max-height: 300px; overflow-y: auto;" class="hide-scrollbar"></div>
                
                <div id="view-gift" style="display:none;">
                <input type="text" id="gift-uid-input" oninput="window.previewGiftUser(this.value)" placeholder="Masukkan UID Teman (#...)" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px; border-radius:12px; margin-bottom:10px; outline:none; box-sizing:border-box; font-size:13px;">
    
                <div id="gift-user-preview" style="display:none; align-items:center; gap:12px; background:rgba(59, 130, 246, 0.1); padding:12px; border-radius:15px; margin-bottom:15px; border:1px solid #3b82f6; animation: slideInGift 0.3s ease;">
                <div style="position:relative; width:40px; height:40px;">
                <img id="gift-preview-img" src="" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:1px solid #3b82f6;">
               </div>
                <div style="flex:1;">
                <div id="gift-preview-name" style="color:#fff; font-size:14px; font-weight:900;">Mencari...</div>
                <div id="gift-preview-uid" style="color:#3b82f6; font-size:11px; font-weight:700; font-family:monospace;">#XXXXXX</div>
        </div>
        <div style="background:#3b82f6; color:#fff; padding:4px 8px; border-radius:8px; font-size:10px; font-weight:900;">TARGET</div>
    </div>
    
    <div id="gift-inventory-list" style="max-height: 200px; overflow-y: auto;" class="hide-scrollbar"></div>
</div>

                <div id="view-topup" style="display:none; max-height: 300px; overflow-y: auto;" class="hide-scrollbar"></div>
                <button onclick="closeBorderShop()" style="width:100%; background:#1c1c1e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; margin-top:15px; cursor:pointer;">Tutup</button>
            </div>
        `;
        document.body.appendChild(div);
    }

    document.getElementById('borderShopOverlay').style.display = 'block'; 
    const modal = document.getElementById('borderShopModal'); modal.style.display = 'block';
    setTimeout(() => { modal.style.opacity = '1'; modal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
    
    db.ref('users/' + currentUser.uid).on('value', snap => {
        window.currentUserData = snap.val(); if(!window.currentUserData) return;
        document.getElementById('user-coin-balance').innerText = window.currentUserData.koin || 0;
        window.renderShopContent();
        
        const topupPackages = [{koin: 100, harga: "Rp 2.000"}, {koin: 500, harga: "Rp 10.000"}, {koin: 1000, harga: "Rp 20.000"}, {koin: 5000, harga: "Rp 100.000"}];
        let topupHtml = '<p style="color:#888; font-size:12px; margin-bottom:10px;">Pilih jumlah koin yang ingin kamu beli via WhatsApp.</p>';
        topupPackages.forEach(p => { topupHtml += `<div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px; border-radius:12px; margin-bottom:10px;"><div style="color:#facc15; font-weight:900; font-size:15px;">${p.koin} Koin</div><button onclick="beliKoinWa(${p.koin}, '${p.harga}')" style="background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer;">${p.harga}</button></div>`; });
        document.getElementById('view-topup').innerHTML = topupHtml;
    });
};

window.setShopCategory = function(cat) {
    window.currentShopCategory = cat;
    document.getElementById('cat-borders').style.color = cat === 'borders' ? '#fff' : '#666';
    document.getElementById('cat-commentplates').style.color = cat === 'commentplates' ? '#fff' : '#666';
    window.renderShopContent();
};

window.renderShopContent = function() {
    if(!window.currentUserData) return;
    const d = window.currentUserData; const cat = window.currentShopCategory || 'borders';
    const catalog = window.COSMETIC_CATALOG[cat];
    const ownedKey = cat === 'borders' ? 'ownedBorders' : 'ownedCommentplates';
    const activeKey = cat === 'borders' ? 'activeBorder' : 'activeCommentplate';
    const owned = d[ownedKey] || {}; const active = d[activeKey] || '';
    
    let html = ''; let giftHtml = '';
    for(let key in catalog) {
        let item = catalog[key]; let isOwned = owned[key]; let isActive = active === key;
        
        // Tombol untuk Shop
        let btn = isActive ? `<button onclick="equipItem('${cat}', '')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Lepas</button>` 
                  : isOwned ? `<button onclick="equipItem('${cat}', '${key}')" style="background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Pakai</button>` 
                  : `<button onclick="buyItem('${cat}', '${key}', ${item.harga})" style="background:#3b82f6; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Beli</button>`;

        // Preview Ikon (Dipakai untuk Shop & Gift)
        let displayIcon = cat === 'borders' 
            ? `<div style="width:40px; height:40px; position:relative; flex-shrink:0;"><img src="${d.foto || 'https://placehold.co/100'}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;"><div style="position:absolute; top:50%; left:50%; width:120%; height:120%; transform:translate(-50%, -50%); pointer-events:none; background-image:url('${item.url}'); background-size:contain; background-position:center; background-repeat:no-repeat;"></div></div>`
            : `<div style="width:40px; height:40px; border-radius:8px; flex-shrink:0; border:1px solid #333; ${item.style}"></div>`;

        // Tampilan List Shop
        html += `<div style="display:flex; align-items:center; gap:12px; background:#111; padding:10px; border-radius:12px; margin-bottom:10px; border:1px solid ${isActive ? '#3b82f6' : '#1a1a1a'};">${displayIcon}<div style="flex:1;"><div style="font-weight:800; font-size:13px; color:#fff;">${item.nama}</div><div style="color:${isOwned ? '#10b981' : '#facc15'}; font-size:11px; font-weight:700;">${isOwned ? 'Milikmu' : item.harga + ' Koin'}</div></div><div>${btn}</div></div>`;
        
        // Tampilan List Gift (Dibuat SAMA PERSIS dengan Shop)
        giftHtml += `<div style="display:flex; align-items:center; gap:12px; background:#111; padding:10px; border-radius:12px; margin-bottom:10px; border:1px solid #1a1a1a;">${displayIcon}<div style="flex:1;"><div style="font-weight:800; font-size:13px; color:#fff;">${item.nama}</div><div style="color:#facc15; font-size:11px; font-weight:700;">Harga: ${item.harga} Koin</div></div><div><button onclick="giftItem('${cat}', '${key}', ${item.harga})" style="background:#f59e0b; color:#000; border:none; padding:6px 16px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; box-shadow: 0 2px 5px rgba(245, 158, 11, 0.3);">Gift</button></div></div>`;
    }
    document.getElementById('view-shop').innerHTML = html;
    document.getElementById('gift-inventory-list').innerHTML = giftHtml;
};

window.switchBorderTab = function(tab) {
    document.getElementById('view-shop').style.display = tab === 'shop' ? 'block' : 'none';
    document.getElementById('view-gift').style.display = tab === 'gift' ? 'block' : 'none';
    document.getElementById('view-topup').style.display = tab === 'topup' ? 'block' : 'none';
    document.getElementById('tab-shop').style.background = tab === 'shop' ? '#3b82f6' : '#1c1c1e';
    document.getElementById('tab-gift').style.background = tab === 'gift' ? '#3b82f6' : '#1c1c1e';
    document.getElementById('tab-topup').style.background = tab === 'topup' ? '#3b82f6' : '#1c1c1e';
    document.getElementById('category-selector').style.display = tab === 'topup' ? 'none' : 'flex';
};

window.closeBorderShop = function() { const modal = document.getElementById('borderShopModal'); const overlay = document.getElementById('borderShopOverlay'); if(modal) { modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)'; setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; }, 300); } db.ref('users/' + currentUser.uid).off(); };

// ==========================================
// EFEK ANIMASI PEMBELIAN SUKSES (SLIDE BIRU)
// ==========================================
window.showPurchaseSuccessModal = function(itemName, cat, itemId) {
    let container = document.getElementById('purchase-anim-container');
    if(!container) { container = document.createElement('div'); container.id = 'purchase-anim-container'; document.body.appendChild(container); }
    
    let displayIconHtml = '<div style="font-size:35px; filter: drop-shadow(0 0 10px #3b82f6);">🛍️</div>'; 
    if (cat && itemId && window.COSMETIC_CATALOG[cat] && window.COSMETIC_CATALOG[cat][itemId]) {
        let item = window.COSMETIC_CATALOG[cat][itemId];
        if (cat === 'borders') {
            displayIconHtml = `<div style="width:45px; height:45px; position:relative; background-image:url('${item.url}'); background-size:contain; background-position:center; background-repeat:no-repeat; filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));"></div>`;
        } else if (cat === 'commentplates') {
            displayIconHtml = `<div style="width:40px; height:40px; border-radius:8px; border:2px solid #fff; box-shadow: 0 0 15px #3b82f6; ${item.style}"></div>`;
        }
    }

    container.innerHTML = `
        <div class="tiktok-gift-overlay" style="top: 10%;">
            <div class="tiktok-gift-card" id="tiktok-purchase-el" style="border-color: #3b82f6; box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(59, 130, 246, 0.3);">
                <div class="tiktok-gift-icon-container">${displayIconHtml}</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color:#3b82f6; font-size:12px; font-weight:900; text-transform:uppercase;">Pembelian Sukses!</span>
                    <span style="color:#fff; font-size:13px; font-weight:700;">Kamu mendapatkan <b>${itemName}</b></span>
                </div>
            </div>
        </div>
    `;
    
    if(typeof injectGiftStyles === 'function') injectGiftStyles();

    setTimeout(() => {
        let card = document.getElementById('tiktok-purchase-el');
        if(card) {
            card.style.animation = 'fadeOutGift 0.5s forwards';
            setTimeout(() => { container.innerHTML = ''; }, 500);
        }
    }, 3500);
};

// ==========================================
// MODAL KONFIRMASI BELI / GIFT (CEGAH SALAH PENCET)
// ==========================================
let pendingTx = null;

window.injectTransactionModal = function() {
    if(document.getElementById('transaction-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'transaction-modal-injected';
    div.innerHTML = `
        <div id="transactionModalOverlay" class="modal-overlay" onclick="closeTransactionModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99999998; backdrop-filter:blur(2px);"></div>
        <div id="transactionModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:300px; border-radius:24px; z-index:99999999; padding:25px 20px 20px 20px; transition:0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #2c2c2e; text-align: center;">
            
            <div id="transaction-preview-container" style="margin-bottom: 15px;"></div>
            
            <h3 id="transaction-title" style="color:#fff; margin:0 0 10px 0; font-size:18px; font-weight:900;">Konfirmasi</h3>
            <p id="transaction-desc" style="color:#888; font-size:13px; margin-bottom:20px; line-height:1.5;">Apakah kamu yakin?</p>
            <div style="display:flex; gap:10px;">
                <button onclick="closeTransactionModal()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:13px; cursor:pointer; transition:0.2s;">Batal</button>
                <button onclick="confirmTransaction()" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:13px; cursor:pointer; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); transition:0.2s;">Ya, Gas!</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
};

window.openTransactionModal = function() {
    document.getElementById('transactionModalOverlay').style.display = 'block'; 
    document.getElementById('transactionModal').style.display = 'block'; 
    setTimeout(() => { 
        document.getElementById('transactionModal').style.opacity = '1'; 
        document.getElementById('transactionModal').style.transform = 'translate(-50%, -50%) scale(1)'; 
    }, 10);
};

window.closeTransactionModal = function() {
    const modal = document.getElementById('transactionModal'); 
    const overlay = document.getElementById('transactionModalOverlay');
    if(modal) {
        modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)'; 
        setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; pendingTx = null; }, 300);
    }
};

window.buyItem = function(cat, id, harga) {
    // 1. Cek Koin
    let koin = (window.currentUserData && window.currentUserData.koin) ? window.currentUserData.koin : 0;
    if(koin < harga) return window.showToast('Koin kamu tidak cukup!', 'error');
    
    // 2. Ambil Data Item
    let item = window.COSMETIC_CATALOG[cat][id];
    let itemName = item.nama;
    
    // 3. Simpan data transaksi sementara
    pendingTx = { type: 'buy', cat: cat, id: id, harga: harga, itemName: itemName };
    
    // 4. Render Preview Gambar di Modal (DIBIKIN NONGOL KE ATAS ALA KELUAR AKUN)
    let previewHtml = '';
    let userFoto = (window.currentUserData && window.currentUserData.foto) ? window.currentUserData.foto : 'https://placehold.co/100';
    
    if(cat === 'borders') {
        previewHtml = `
            <div style="width:60px; height:60px; position:relative; margin: -45px auto 15px auto; border-radius:50%; background:#111; border:2px solid #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);">
                <img src="${userFoto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                <div style="position:absolute; top:50%; left:50%; width:130%; height:130%; transform:translate(-50%, -50%); background-image:url('${item.url}'); background-size:contain; background-position:center; background-repeat:no-repeat; pointer-events:none;"></div>
            </div>`;
    } else {
        previewHtml = `<div style="width:60px; height:45px; border-radius:10px; margin: -45px auto 15px auto; border:2px solid #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); background:#111; ${item.style}"></div>`;
    }
    
    // 5. Update Isi Modal & Munculkan
    document.getElementById('transaction-preview-container').innerHTML = previewHtml;
    document.getElementById('transaction-title').innerText = 'Konfirmasi Beli 🛒';
    document.getElementById('transaction-desc').innerHTML = `
        Beli <b>${itemName}</b> untuk profilmu?<br>
        Harga: <span style="color:#facc15; font-weight:900;">${harga} Koin</span>
    `;
    
    window.openTransactionModal();
};

window.giftItem = function(cat, id, harga) {
    let targetUidShort = document.getElementById('gift-uid-input').value.replace('#', '').trim().toUpperCase();
    if(!targetUidShort || targetUidShort.length !== 6) return window.showToast('Ketik UID Teman dulu!', 'error');

    // Ambil data koin kamu
    let myKoin = (window.currentUserData && window.currentUserData.koin) ? window.currentUserData.koin : 0;
    if(myKoin < harga) return window.showToast('Koin tidak cukup!', 'error');

    // Cari User di Firebase
    db.ref('users').once('value').then(snap => {
        let targetFullUid = null;
        let targetData = null;
        
        snap.forEach(child => {
            if(child.key.substring(0,6).toUpperCase() === targetUidShort) {
                targetFullUid = child.key;
                targetData = child.val();
            }
        });

        if(!targetFullUid) return window.showToast('User tidak ditemukan!', 'error');
        if(targetFullUid === currentUser.uid) return window.showToast('Gak bisa kirim ke diri sendiri!', 'error');

        let item = window.COSMETIC_CATALOG[cat][id];
        let senderName = window.currentUserData.nama || 'Kamu';
        pendingTx = { type: 'gift', cat: cat, id: id, harga: harga, targetFullUid: targetFullUid, targetName: targetData.nama, itemName: item.nama };

        // Render Preview (Foto Target + Border/Efek Hadiah) NONGOL KE ATAS
        let previewHtml = '';
        let targetFoto = targetData.foto || 'https://placehold.co/100';

        if(cat === 'borders') {
            previewHtml = `
                <div style="width:60px; height:60px; position:relative; margin: -45px auto 15px auto; border-radius:50%; background:#111; border:2px solid #facc15; box-shadow: 0 0 15px rgba(250, 204, 21, 0.5);">
                    <img src="${targetFoto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                    <div style="position:absolute; top:50%; left:50%; width:130%; height:130%; transform:translate(-50%, -50%); background-image:url('${item.url}'); background-size:contain; background-position:center; background-repeat:no-repeat;"></div>
                </div>`;
        } else {
            previewHtml = `<div style="width:60px; height:45px; border-radius:10px; margin: -45px auto 15px auto; border:2px solid #facc15; box-shadow: 0 0 15px rgba(250, 204, 21, 0.5); background:#111; ${item.style}"></div>`;
        }

        document.getElementById('transaction-preview-container').innerHTML = previewHtml;
        document.getElementById('transaction-title').innerText = 'Konfirmasi Gift 🎁';
        
        // Tampilkan info detail pengirim & penerima
        document.getElementById('transaction-desc').innerHTML = `
            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; margin-bottom: 12px; font-size: 12px; text-align: left; border: 1px solid #2c2c2e;">
                <div style="margin-bottom: 4px;"><span style="color:#888;">Dari:</span> <b style="color:#fff;">${senderName}</b></div>
                <div><span style="color:#888;">Ke:</span> <b style="color:#facc15;">${targetData.nama}</b></div>
            </div>
            Kirim <b>${item.nama}</b>?<br> 
            Biaya: <b style="color:#facc15;">${harga} Koin</b>
        `;
        
        window.openTransactionModal();
    });
};

window.previewGiftUser = function(val) {
    let uidInput = val.replace('#', '').trim().toUpperCase();
    let previewBox = document.getElementById('gift-user-preview');
    let nameEl = document.getElementById('gift-preview-name');
    let imgEl = document.getElementById('gift-preview-img');
    let uidEl = document.getElementById('gift-preview-uid');

    if (uidInput.length === 6) {
        // Cari user di Firebase berdasarkan 6 digit pertama UID
        db.ref('users').once('value').then(snap => {
            let found = false;
            snap.forEach(child => {
                if (child.key.substring(0, 6).toUpperCase() === uidInput) {
                    let data = child.val();
                    nameEl.innerText = data.nama || 'Wibu';
                    imgEl.src = data.foto || 'https://placehold.co/100';
                    uidEl.innerText = '#' + uidInput;
                    previewBox.style.display = 'flex';
                    found = true;
                }
            });
            if (!found) {
                previewBox.style.display = 'none';
                window.showToast('UID tidak ditemukan!', 'error');
            }
        });
    } else {
        previewBox.style.display = 'none';
    }
};

window.confirmTransaction = function() {
    if(!pendingTx) return;
    
    let { type, cat, id, harga, targetFullUid, targetName, itemName } = pendingTx;
    let myKoin = window.currentUserData.koin || 0;
    if(myKoin < harga) { window.showToast('Koin tidak cukup!', 'error'); return closeTransactionModal(); }

    if(type === 'buy') {
        let ownedKey = cat === 'borders' ? `ownedBorders/${id}` : `ownedCommentplates/${id}`;
        let updateData = { koin: myKoin - harga }; updateData[ownedKey] = true;
        
        db.ref('users/' + currentUser.uid).update(updateData).then(() => { 
            window.closeBorderShop();
            showPurchaseSuccessModal(itemName, cat, id);
        });
    } 
    else if (type === 'gift') {
        let ownedKey = cat === 'borders' ? 'ownedBorders' : 'ownedCommentplates';
        
        db.ref('users/' + currentUser.uid).update({ koin: myKoin - harga });
        let updateTarget = {}; updateTarget[`${ownedKey}/${id}`] = true;
        db.ref('users/' + targetFullUid).update(updateTarget);
        
        db.ref('users/' + targetFullUid + '/newGift').set({
            from: window.currentUserData.nama || 'Seseorang',
            itemName: itemName,
            cat: cat,
            itemId: id,
            timestamp: Date.now()
        });

        window.closeBorderShop();
        showGiftSentModal(targetName, itemName, cat, id);
    }
    
    closeTransactionModal();
    pendingTx = null;
};

// ==========================================
// FITUR PAKAI / LEPAS ITEM KOSMETIK (INSTAN)
// ==========================================
window.equipItem = function(cat, id) {
    if(!currentUser) return;
    
    let activeKey = cat === 'borders' ? 'activeBorder' : 'activeCommentplate';
    let updates = {};
    updates[activeKey] = id; 

    // ======== OPTIMISTIC UI UPDATE (GANTI INSTAN) ========
    if (cat === 'borders') {
        // Ambil URL animasi border, kalau lagi di-"Lepas" (id = '') maka kosong
        let decoUrl = id && window.COSMETIC_CATALOG.borders[id] ? window.COSMETIC_CATALOG.borders[id].url : '';
        
        // 1. Update instan di Profil Utama (Background)
        let profileAvatars = document.querySelectorAll('.profile-avatar-container');
        profileAvatars.forEach(container => {
            let existingOverlay = container.querySelector('.avatar-deco-overlay');
            if (existingOverlay) existingOverlay.remove(); // Hapus border lama
            
            if (decoUrl) {
                let newOverlay = document.createElement('div');
                newOverlay.className = 'avatar-deco-overlay';
                newOverlay.style.backgroundImage = `url('${decoUrl}')`;
                container.appendChild(newOverlay); // Pasang border baru
            }
        });

        // 2. Update instan di Input Komentar / Balasan
        let commentAvatars = document.querySelectorAll('#comment-input-avatar, #reply-input-avatar');
        commentAvatars.forEach(container => {
            let existingOverlay = container.querySelector('.avatar-deco-overlay');
            if (existingOverlay) existingOverlay.remove();
            
            if (decoUrl) {
                let newOverlay = document.createElement('div');
                newOverlay.className = 'avatar-deco-overlay';
                newOverlay.style.backgroundImage = `url('${decoUrl}')`;
                container.appendChild(newOverlay);
            }
        });
    }
    // =====================================================

    // Simpan ke database di background
    db.ref('users/' + currentUser.uid).update(updates).then(() => {
        let actionText = id === '' ? 'dilepas' : 'dipakai';
        window.showToast(`Item berhasil ${actionText}!`, 'success');
    }).catch(err => {
        window.showToast('Gagal mengubah item: ' + err.message, 'error');
    });
};

// ==========================================
// FITUR GANTI NAMA (Klik Nama Langsung)
// ==========================================
window.injectChangeNameModal = function() {
    if(document.getElementById('change-name-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'change-name-modal-injected';
    div.innerHTML = `
        <div id="changeNameOverlay" class="modal-overlay" onclick="closeChangeNameModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div>
        <div id="changeNameModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:300px; border-radius:24px; z-index:9999999; padding:25px 20px; transition:0.3s; opacity:0; border: 1px solid #2c2c2e; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
            <div style="width:50px; height:50px; background:rgba(59, 130, 246, 0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin: -45px auto 15px auto; border: 2px solid #3b82f6;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <h3 style="color:#fff; margin:0 0 5px 0; font-size:18px; font-weight:900;">Ganti Nama</h3>
            <p id="change-name-desc" style="color:#888; font-size:12px; margin-bottom:20px; line-height:1.4;"></p>
            <input type="text" id="new-name-input" placeholder="Nama Baru..." maxlength="25" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px; border-radius:12px; margin-bottom:20px; outline:none; box-sizing:border-box; text-align:center; font-size:14px; font-weight:bold;">
            <div style="display:flex; gap:10px;">
                <button onclick="closeChangeNameModal()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:13px; cursor:pointer;">Batal</button>
                <button onclick="confirmChangeName()" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:13px; cursor:pointer; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">Simpan</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
};

window.openChangeNameModal = function() {
    if(!currentUser) return window.showToast('Login dulu yuk!', 'error');
    window.injectChangeNameModal();
    
    db.ref('users/' + currentUser.uid).once('value').then(snap => {
        let d = snap.val();
        let changeCount = d.nameChangeCount || 0; 
        let descEl = document.getElementById('change-name-desc');
        
        if (changeCount === 0) {
            descEl.innerHTML = "Ganti nama pertamamu <b style='color:#10b981;'>GRATIS!</b>";
        } else {
            descEl.innerHTML = "Biaya ganti nama: <b style='color:#facc15;'>1000 Koin</b>";
        }
        
        document.getElementById('new-name-input').value = d.nama || '';
        document.getElementById('changeNameOverlay').style.display = 'block';
        let modal = document.getElementById('changeNameModal');
        modal.style.display = 'block';
        setTimeout(() => { modal.style.opacity = '1'; modal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
    });
};

window.closeChangeNameModal = function() {
    let modal = document.getElementById('changeNameModal');
    let overlay = document.getElementById('changeNameOverlay');
    if(modal) {
        modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; }, 300);
    }
};

window.confirmChangeName = function() {
    let newName = document.getElementById('new-name-input').value.trim();
    if(newName.length < 3) return window.showToast('Minimal 3 karakter!', 'error');
    if(newName.length > 25) return window.showToast('Maksimal 25 karakter!', 'error');

    db.ref('users/' + currentUser.uid).once('value').then(snap => {
        let d = snap.val();
        let changeCount = d.nameChangeCount || 0;
        let koin = d.koin || 0;
        let cost = (changeCount === 0) ? 0 : 1000;

        if (cost > 0 && koin < cost) return window.showToast('Koin tidak cukup! Butuh 1000.', 'error');

        let updates = { nama: newName, nameChangeCount: changeCount + 1 };
        if(cost > 0) updates.koin = koin - cost;

        db.ref('users/' + currentUser.uid).update(updates).then(() => {
            window.showToast('Nama berhasil diganti!', 'success');
            window.closeChangeNameModal();
            
            // BIAR NAMA LANGSUNG KEGANTI DI LAYAR TANPA REFRESH
            let nameEl = document.getElementById('profile-user-name-display');
            if (nameEl) nameEl.innerText = newName;
            
            // Update nama Google Auth biar 100% sinkron
            if (currentUser) currentUser.updateProfile({ displayName: newName }).catch(()=>{});
        });
    });
};

// ==========================================
// FITUR ANIMASI KADO (GIFT) TIKTOK STYLE
// ==========================================
window.injectGiftStyles = function() {
    if(document.getElementById('gift-styles')) return;
    const style = document.createElement('style'); style.id = 'gift-styles';
    style.innerHTML = `
        @keyframes slideInGift { 0% { transform: translateX(100%) scale(0.8); opacity: 0; } 80% { transform: translateX(-5%) scale(1.1); opacity: 1; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
        @keyframes floatGift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes fadeOutGift { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes glowSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .tiktok-gift-overlay { position: fixed; top: 15%; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; z-index: 99999999; }
        .tiktok-gift-card { background: linear-gradient(135deg, rgba(15,15,20,0.95), rgba(30,30,40,0.95)); border: 1px solid; border-radius: 50px; padding: 8px 25px 8px 12px; display: flex; align-items: center; gap: 15px; animation: slideInGift 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; backdrop-filter: blur(5px); }
        .tiktok-gift-icon-container { width: 50px; height: 50px; position: relative; animation: floatGift 2s infinite ease-in-out; display:flex; align-items:center; justify-content:center; }
    `;
    document.head.appendChild(style);
};

// Notifikasi Untuk PENGIRIM
window.showGiftSentModal = function(targetName, itemName, cat, itemId) {
    let container = document.getElementById('gift-sent-container');
    if(!container) { container = document.createElement('div'); container.id = 'gift-sent-container'; document.body.appendChild(container); }
    
    // Vektor Kado (Menggantikan Emoji)
    let giftIcon = `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px #10b981);"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`;

    container.innerHTML = `
        <div class="tiktok-gift-overlay" style="top: 10%;">
            <div class="tiktok-gift-card" id="tiktok-gift-sent-el" style="border-color: #10b981; box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(16, 185, 129, 0.3);">
                <div class="tiktok-gift-icon-container">${giftIcon}</div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color:#10b981; font-size:12px; font-weight:900; text-transform:uppercase;">Terkirim!</span>
                    <span style="color:#fff; font-size:13px; font-weight:700;"><b>${itemName}</b> ke <b>${targetName}</b></span>
                </div>
            </div>
        </div>
    `;
    injectGiftStyles();

    setTimeout(() => {
        let card = document.getElementById('tiktok-gift-sent-el');
        if(card) { card.style.animation = 'fadeOutGift 0.5s forwards'; setTimeout(() => { container.innerHTML = ''; }, 500); }
    }, 3500);
};

// ANIMASI GIFT TIKTOK DINAMIS (Warna Emas untuk User, Merah untuk Kompensasi)
window.showGiftReceivedModal = function(fromName, itemName, cat, itemId, isKompensasi = false) {
    let container = document.getElementById('gift-anim-container');
    if(!container) { container = document.createElement('div'); container.id = 'gift-anim-container'; document.body.appendChild(container); }
    
    // Tema Warna
    let themeColor = isKompensasi ? '#3b82f6' : '#facc15'; 
    let themeShadow = isKompensasi ? 'rgba(59, 130, 246, 0.5)' : 'rgba(250, 204, 21, 0.5)';
    let titleText = isKompensasi ? 'KOMPENSASI DARI' : 'HADIAH DARI';
    
    // Default Icon Vektor
    let displayIconHtml = `<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 10px ${themeColor});"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`; 

    if (cat === 'koin') {
        // Vektor Koin Elegan
        displayIconHtml = `<svg width="45" height="45" viewBox="0 0 24 24" fill="${themeColor}20" stroke="${themeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 10px ${themeColor});"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12M9.5 9h5M9.5 15h5"></path></svg>`;
    } else if (cat === 'level') {
        // Vektor Bintang/Level Bersinar
        displayIconHtml = `<svg width="45" height="45" viewBox="0 0 24 24" fill="${themeColor}40" stroke="${themeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 10px ${themeColor});"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    } else if (cat && itemId && window.COSMETIC_CATALOG[cat] && window.COSMETIC_CATALOG[cat][itemId]) {
        // Vektor Border dan Plate
        let item = window.COSMETIC_CATALOG[cat][itemId];
        if (cat === 'borders') {
            displayIconHtml = `<div style="position:absolute; top:50%; left:50%; width:150%; height:150%; transform:translate(-50%, -50%); background-image:url('${item.url}'); background-size:contain; background-position:center; background-repeat:no-repeat; filter: drop-shadow(0 0 10px ${themeColor});"></div>`;
        } else if (cat === 'commentplates') {
            displayIconHtml = `<div style="width:40px; height:40px; border-radius:8px; border:2px solid #fff; box-shadow: 0 0 15px ${themeColor}; ${item.style}"></div>`;
        }
    }

    container.innerHTML = `
        <div class="tiktok-gift-overlay">
            <div class="tiktok-gift-card" id="tiktok-gift-card-el" style="border-color: ${themeColor}; box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px ${themeShadow};">
                <div class="tiktok-gift-icon-container">
                    <div style="position:absolute; top:-25px; left:-25px; width:100px; height:100px; background: radial-gradient(circle, ${themeShadow} 0%, transparent 70%); animation: glowSpin 4s linear infinite;"></div>
                    ${displayIconHtml}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color:${themeColor}; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">${titleText}</span>
                    <span style="color:#fff; font-size:14px; font-weight:800;">${fromName}</span>
                    <span style="color:#ddd; font-size:12px; font-weight:600; margin-top:3px;">Mendapat <b style="color:${themeColor}; font-weight:900;">${itemName}</b></span>
                </div>
            </div>
        </div>
    `;
    injectGiftStyles();

    setTimeout(() => {
        let card = document.getElementById('tiktok-gift-card-el');
        if(card) { card.style.animation = 'fadeOutGift 0.5s forwards'; setTimeout(() => { container.innerHTML = ''; }, 500); }
    }, 5000); 
};

window.listenForGifts = function() {
    if(!currentUser) return;
    db.ref('users/' + currentUser.uid + '/newGift').on('value', snap => {
        if(snap.exists()) {
            let gift = snap.val();
            db.ref('users/' + currentUser.uid + '/newGift').remove(); 
            showGiftReceivedModal(gift.from, gift.itemName, gift.cat, gift.itemId, gift.isKompensasi);
        }
    });
};

// ==========================================
// FITUR KONFIRMASI KELUAR AKUN
// ==========================================
window.injectLogoutModal = function() {
    if(document.getElementById('logout-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'logout-modal-injected';
    div.innerHTML = `
        <div id="logoutModalOverlay" class="modal-overlay" onclick="closeLogoutModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div>
        <div id="logoutModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); background:#1c1c1e; width:300px; border-radius:24px; z-index:9999999; padding:25px 20px 20px 20px; transition:0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; box-shadow:0 10px 30px rgba(0,0,0,0.8); border: 1px solid #2c2c2e; text-align: center;">
            <div style="width:50px; height:50px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: -40px auto 15px auto; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            <h3 style="color:#fff; margin:0 0 10px 0; font-size:18px; font-weight:900;">Keluar Akun?</h3>
            <p style="color:#888; font-size:13px; margin-bottom:20px; line-height:1.5;">Apakah kamu yakin ingin keluar dari akun ini?</p>
            <div style="display:flex; gap:10px;">
                <button onclick="closeLogoutModal()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s;">Batal</button>
                <button onclick="confirmLogout()" style="flex:1; background:#ef4444; color:#fff; border:none; padding:12px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); transition:0.2s;">Ya, Keluar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
};

window.openLogoutModal = function() {
    document.getElementById('logoutModalOverlay').style.display = 'block'; 
    document.getElementById('logoutModal').style.display = 'block'; 
    setTimeout(() => { document.getElementById('logoutModal').style.opacity = '1'; document.getElementById('logoutModal').style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
};

window.closeLogoutModal = function() {
    const modal = document.getElementById('logoutModal'); const overlay = document.getElementById('logoutModalOverlay');
    if(modal) {
        modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.9)'; 
        setTimeout(() => { overlay.style.display = 'none'; modal.style.display = 'none'; }, 300);
    }
};

window.confirmLogout = function() {
    auth.signOut().then(() => { window.showToast("Berhasil keluar dari akun.", 'success'); closeLogoutModal(); setTimeout(() => { location.reload(); }, 1500); });
};

// ==========================================
// ANTI MALING KODE (BLOKIR KLIK KANAN & F12)
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(event.keyCode == 123) { return false; } 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) { return false; } 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) { return false; } 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) { return false; } 
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { return false; } 
};

// ==========================================
// FITUR GOD MODE (KHUSUS DEVELOPER)
// ==========================================
window.injectDevModal = function() {
    if(document.getElementById('dev-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'dev-modal-injected';
    div.innerHTML = `
        <div id="devModalOverlay" class="modal-overlay" onclick="closeDevModal()" style="display:none; z-index:9999998; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px);"></div>
        <div id="devModal" class="bottom-sheet" style="display:none; z-index:9999999; padding:20px; background:#0a0a0a; border-top: 2px solid #3b82f6; max-width:500px; margin:0 auto; left:0; right:0; border-radius: 24px 24px 0 0; max-height:85vh; display:flex; flex-direction:column;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1a1a1a; padding-bottom:15px; margin-bottom:15px; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="background:rgba(59, 130, 246, 0.1); padding:8px; border-radius:10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.7a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.7z"></path></svg>
                    </div>
                    <h3 style="color:#fff; margin:0; font-size:18px; font-weight:900;">Panel Developer</h3>
                </div>
                <button onclick="closeDevModal()" style="background:rgba(255,255,255,0.05); border:none; color:#888; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div style="display:flex; gap:8px; margin-bottom:15px; flex-shrink:0;">
                <button id="dev-tab-user" onclick="switchDevTab('user')" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:10px; border-radius:12px; font-weight:800; cursor:pointer; font-size:13px; transition:0.2s;">Manajemen User</button>
                <button id="dev-tab-global" onclick="switchDevTab('global')" style="flex:1; background:#1c1c1e; color:#a1a1aa; border:none; padding:10px; border-radius:12px; font-weight:800; cursor:pointer; font-size:13px; transition:0.2s;">Global Gift</button>

            </div>
            
            <div style="overflow-y:auto; flex:1; padding-right:5px;" class="hide-scrollbar">
                <div id="dev-view-user" style="display:block;">
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:8px; margin-left:5px;">TARGET UID</label>
                        <input type="text" id="dev-uid" placeholder="#XXXXXX" style="width:100%; padding:14px; background:#111; color:#fff; border:1px solid #333; border-radius:15px; box-sizing:border-box; outline:none; font-family:monospace; font-weight:bold; font-size:15px;">
                    </div>
                    <div style="display:flex; gap:12px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:8px; margin-left:5px;">SET KOIN</label>
                            <input type="number" id="dev-koin" placeholder="0" style="width:100%; padding:14px; background:#111; color:#facc15; border:1px solid #333; border-radius:15px; box-sizing:border-box; outline:none; font-weight:800;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:8px; margin-left:5px;">SET LEVEL</label>
                            <input type="number" id="dev-level" placeholder="1" style="width:100%; padding:14px; background:#111; color:#3b82f6; border:1px solid #333; border-radius:15px; box-sizing:border-box; outline:none; font-weight:800;">
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:8px; margin-left:5px;">SET EXP POINTS</label>
                        <input type="number" id="dev-exp" placeholder="0" style="width:100%; padding:14px; background:#111; color:#fff; border:1px solid #333; border-radius:15px; box-sizing:border-box; outline:none; font-weight:bold;">
                    </div>
                    <div style="margin-bottom: 25px;">
                        <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:8px; margin-left:5px;">UBAH ROLE AKUN</label>
                        <select id="dev-role" style="width:100%; padding:14px; background:#111; color:#fff; border:1px solid #333; border-radius:15px; box-sizing:border-box; outline:none; font-weight:bold;">
                            <option value="">-- Biarkan Tetap --</option>
                            <option value="Member">Member (Wibu Biasa)</option>
                            <option value="Wibu Premium">Wibu Premium</option>
                            <option value="Developer">Developer</option>
                        </select>
                    </div>
                    <button onclick="executeGodMode()" style="width:100%; padding:16px; background:linear-gradient(90deg, #3b82f6, #1d4ed8); color:#fff; border:none; border-radius:18px; font-weight:900; font-size:14px; cursor:pointer; box-shadow:0 10px 20px rgba(59, 130, 246, 0.3);">
                        TERAPKAN KE USER
                    </button>
                </div>

                <div id="dev-view-global" style="display:none; animation: fadeIn 0.3s;">
                    <div style="background:rgba(59, 130, 246, 0.05); border:1px dashed #3b82f6; padding:15px; border-radius:18px; margin-bottom:20px;">
                        <div style="display:flex; gap:10px; margin-bottom:12px;">
                            <div style="flex:1;">
                                <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:6px;">NAMA PENGIRIM</label>
                                <input type="text" id="dev-global-sender" placeholder="Sistem Animeku" value="Sistem Animeku" style="width:100%; padding:12px; background:#111; color:#fff; border:1px solid #333; border-radius:12px; box-sizing:border-box; outline:none; font-weight:bold; font-size:13px;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:6px;">JENIS HADIAH</label>
                                <select id="dev-global-type" onchange="updateDevGiftOptions()" style="width:100%; padding:12px; background:#111; color:#facc15; border:1px solid #333; border-radius:12px; box-sizing:border-box; outline:none; font-weight:bold; font-size:13px;">
                                    <option value="koin">Koin</option>
                                    <option value="level">Level Up</option>
                                    <option value="borders">Border Profil</option>
                                    <option value="commentplates">Efek Komen</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom: 12px;">
                            <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:6px;">ITEM / JUMLAH</label>
                            <input type="number" id="dev-global-num-val" placeholder="Cth: 500 (Jumlah Koin)" style="width:100%; padding:12px; background:#111; color:#facc15; border:1px solid #333; border-radius:12px; box-sizing:border-box; outline:none; font-weight:900; font-size:14px; display:block;">
                            <select id="dev-global-item-val" style="width:100%; padding:12px; background:#111; color:#fff; border:1px solid #333; border-radius:12px; box-sizing:border-box; outline:none; font-weight:bold; font-size:13px; display:none;"></select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display:block; color:#aaa; font-size:11px; font-weight:800; margin-bottom:6px;">PESAN / ALASAN (Tema Merah Kompensasi)</label>
                            <input type="text" id="dev-global-msg" placeholder="Cth: Server Down" value="Kompensasi Spesial" style="width:100%; padding:12px; background:#111; color:#3b82f6; border:1px solid #333; border-radius:12px; box-sizing:border-box; outline:none; font-weight:bold; font-size:13px;">
                        </div>

                        <button onclick="sendGlobalCompensation()" style="width:100%; padding:16px; background:linear-gradient(90deg, #3b82f6, #1d4ed8); color:#fff; border:none; border-radius:15px; font-weight:900; font-size:14px; cursor:pointer; box-shadow:0 10px 20px rgba(59, 130, 246, 0.3);">
                            KIRIM KOMPENSASI GLOBAL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
};

window.switchDevTab = function(tab) {
    document.getElementById('dev-view-user').style.display = tab === 'user' ? 'block' : 'none';
    document.getElementById('dev-view-global').style.display = tab === 'global' ? 'block' : 'none';
    
    let btnUser = document.getElementById('dev-tab-user');
    let btnGlobal = document.getElementById('dev-tab-global');
    
    if(tab === 'user') {
        btnUser.style.background = '#3b82f6'; btnUser.style.color = '#fff';
        btnGlobal.style.background = '#1c1c1e'; btnGlobal.style.color = '#a1a1aa';
    } else {
        btnGlobal.style.background = '#3b82f6'; btnGlobal.style.color = '#fff';
        btnUser.style.background = '#1c1c1e'; btnUser.style.color = '#a1a1aa';
        window.updateDevGiftOptions(); 
    }
};

window.updateDevGiftOptions = function() {
    let type = document.getElementById('dev-global-type').value;
    let numInput = document.getElementById('dev-global-num-val');
    let itemSelect = document.getElementById('dev-global-item-val');
    
    if (type === 'koin' || type === 'level') {
        numInput.style.display = 'block';
        numInput.placeholder = type === 'koin' ? 'Cth: 500 (Jumlah Koin)' : 'Cth: 5 (Naik Berapa Level)';
        itemSelect.style.display = 'none';
    } else {
        numInput.style.display = 'none';
        itemSelect.style.display = 'block';
        let html = '<option value="">-- Pilih Item --</option>';
        let catalog = window.COSMETIC_CATALOG[type];
        for (let key in catalog) { html += `<option value="${key}">${catalog[key].nama}</option>`; }
        itemSelect.innerHTML = html;
    }
};

window.openDevModal = function(targetUid = '') {
    window.injectDevModal();
    if(targetUid) { document.getElementById('dev-uid').value = targetUid; switchDevTab('user'); }
    document.getElementById('devModalOverlay').style.display = 'block';
    let modal = document.getElementById('devModal'); modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
};

window.closeDevModal = function() {
    const modal = document.getElementById('devModal');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => { document.getElementById('devModalOverlay').style.display = 'none'; modal.style.display = 'none'; }, 300);
    }
};

window.executeGodMode = function() {
    let uidInput = document.getElementById('dev-uid').value.trim().replace('#', '').toUpperCase();
    if(!uidInput) return window.showToast('UID Target harus diisi!', 'error');

    let updates = {};
    let koin = document.getElementById('dev-koin').value;
    let exp = document.getElementById('dev-exp').value;
    let lvl = document.getElementById('dev-level').value;
    let role = document.getElementById('dev-role').value;

    if(koin !== "") updates.koin = parseInt(koin);
    if(role !== "") updates.role = role;

    if(lvl !== "") { let parsedLvl = parseInt(lvl); updates.level = parsedLvl; if(exp === "") updates.exp = (parsedLvl - 1) * 200; }
    if(exp !== "") { let parsedExp = parseInt(exp); updates.exp = parsedExp; if(lvl === "") updates.level = Math.floor(parsedExp / 200) + 1; }

    if(Object.keys(updates).length === 0) return window.showToast('Isi minimal 1 data yang mau diubah!', 'error');

    db.ref('users').once('value').then(snap => {
        let targetFullUid = null;
        snap.forEach(child => { if(child.key.toUpperCase() === uidInput || child.key.substring(0,6).toUpperCase() === uidInput) { targetFullUid = child.key; } });

        if(!targetFullUid) return window.showToast('User tidak ditemukan!', 'error');

        db.ref('users/' + targetFullUid).update(updates).then(() => {
            window.showToast('Fitur Berhasil Diterapkan!', 'success');
            window.closeDevModal();
            document.getElementById('dev-koin').value = ''; document.getElementById('dev-exp').value = '';
            document.getElementById('dev-level').value = ''; document.getElementById('dev-role').value = '';
        }).catch(err => window.showToast('Gagal: ' + err.message, 'error'));
    });
};

window.sendGlobalCompensation = function() {
    let sender = document.getElementById('dev-global-sender').value.trim() || 'Sistem Animeku';
    let msg = document.getElementById('dev-global-msg').value.trim() || 'Hadiah Spesial';
    let type = document.getElementById('dev-global-type').value;
    
    let val, itemDisplayName;
    
    if (type === 'koin' || type === 'level') {
        val = parseInt(document.getElementById('dev-global-num-val').value);
        if (!val || val <= 0) return window.showToast('Masukkan angka yang benar!', 'error');
        itemDisplayName = type === 'koin' ? `${val} Koin\n(${msg})` : `+${val} Level\n(${msg})`;
    } else {
        val = document.getElementById('dev-global-item-val').value;
        if (!val) return window.showToast('Pilih item yang ingin dikirim!', 'error');
        itemDisplayName = `${window.COSMETIC_CATALOG[type][val].nama}\n(${msg})`;
    }

    if (!confirm(`PERINGATAN KOMPENSASI GLOBAL!\nKamu akan mengirim:\n\n[ ${itemDisplayName} ]\n\nKe SELURUH USER. Lanjutkan?`)) return;
    window.showToast('Memproses pengiriman massal ke seluruh user...', 'success');

    db.ref('users').once('value').then(snap => {
        let updates = {}; let count = 0;
        snap.forEach(child => {
            let uid = child.key; let data = child.val();

            if (type === 'koin') { updates[`users/${uid}/koin`] = (data.koin || 0) + val; } 
            else if (type === 'level') {
                let curLvl = data.level || 1;
                updates[`users/${uid}/level`] = curLvl + val;
                updates[`users/${uid}/exp`] = (curLvl + val - 1) * 200; 
            } 
            else if (type === 'borders') { updates[`users/${uid}/ownedBorders/${val}`] = true; } 
            else if (type === 'commentplates') { updates[`users/${uid}/ownedCommentplates/${val}`] = true; }
            
            updates[`users/${uid}/newGift`] = {
                from: sender,
                itemName: itemDisplayName.replace('\n', ' - '),
                cat: type, 
                itemId: (type === 'koin' || type === 'level') ? 'none' : val,
                isKompensasi: true, 
                timestamp: Date.now()
            };
            count++;
        });

        db.ref().update(updates).then(() => {
            window.showToast(`Berhasil! Hadiah terkirim ke ${count} user.`, 'success');
            document.getElementById('dev-global-num-val').value = ''; document.getElementById('dev-global-item-val').value = '';
            window.closeDevModal();
        }).catch(err => { window.showToast('Gagal mengirim massal: ' + err.message, 'error'); });
    });
};

// ==========================================
// FITUR PWA INSTALL APP (ADD TO HOME SCREEN)
// ==========================================
let deferredPrompt;

window.injectInstallModal = function() {
    if(document.getElementById('install-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'install-modal-injected';
    div.innerHTML = `
        <div id="installAppOverlay" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div>
        <div id="installAppModal" style="display:none; position:fixed; bottom:0; left:0; right:0; background:#1c1c1e; border-radius:24px 24px 0 0; z-index:9999999; padding:25px 20px 30px 20px; transition:0.4s cubic-bezier(0.4, 0, 0.2, 1); transform:translateY(100%); border-top: 1px solid #2c2c2e; text-align: center; max-width: 500px; margin: 0 auto; box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
            <div style="width: 50px; height: 5px; background: #333; border-radius: 5px; margin: -10px auto 20px auto;"></div>
            
            <div style="width:65px; height:65px; background:#3b82f6; border-radius:18px; display:flex; align-items:center; justify-content:center; margin: 0 auto 15px auto; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);">
                <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            
            <h3 style="color:#fff; margin:0 0 8px 0; font-size:20px; font-weight:900;">Install Aplikasi Animeku</h3>
            <p style="color:#a1a1aa; font-size:13px; margin-bottom:25px; line-height:1.5;">Tambahkan Animeku ke Layar Utama HP kamu untuk akses lebih cepat, hemat kuota, dan pengalaman <i>Full Screen</i>!</p>
            
            <div style="display:flex; gap:12px;">
                <button onclick="closeInstallPrompt()" style="flex:1; background:#2c2c2e; color:#fff; border:none; padding:14px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; transition:0.2s;">Nanti Saja</button>
                <button onclick="installApp()" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:14px; border-radius:16px; font-weight:800; font-size:14px; cursor:pointer; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); transition:0.2s;">Install Sekarang</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
};

window.openInstallPrompt = function() {
    // 1. Cek apakah user udah buka versi "Aplikasi" (Standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    
    // 2. Cek apakah user udah klik "Nanti Saja" sebelumnya biar nggak risih
    if (localStorage.getItem('animeku_install_dismissed') === 'true') return;

    window.injectInstallModal();
    document.getElementById('installAppOverlay').style.display = 'block';
    let modal = document.getElementById('installAppModal');
    modal.style.display = 'block';
    
    // Animasi naik dari bawah
    setTimeout(() => { modal.style.transform = 'translateY(0)'; }, 10);
};

window.closeInstallPrompt = function() {
    // Simpan di memori biar pop-up nggak muncul lagi terus-terusan
    localStorage.setItem('animeku_install_dismissed', 'true'); 
    
    let modal = document.getElementById('installAppModal');
    if(modal) {
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => { 
            document.getElementById('installAppOverlay').style.display = 'none'; 
            modal.style.display = 'none'; 
        }, 400);
    }
};

window.installApp = function() {
    closeInstallPrompt();
    if (deferredPrompt) {
        deferredPrompt.prompt(); // Memunculkan sistem install bawaan HP
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User menerima installasi');
            } else {
                console.log('User menolak installasi');
            }
            deferredPrompt = null;
        });
    }
};

// ==========================================
// LISTENER UNTUK MEMANCING INSTALL POP-UP
// ==========================================
window.addEventListener('beforeinstallprompt', (e) => {
    // Tahan prompt bawaan browser biar nggak langsung muncul
    e.preventDefault();
    deferredPrompt = e;
    
    // Kasih delay 3 detik setelah web kebuka biar user nggak kaget
    setTimeout(() => {
        window.openInstallPrompt();
    }, 3000); 
});

// ==========================================
// FITUR MODAL NOTIFIKASI UPDATE ANIME
// ==========================================
window.injectNotifModal = function() {
    if(document.getElementById('notif-modal-injected')) return;
    const div = document.createElement('div'); div.id = 'notif-modal-injected';
    div.innerHTML = `
        <style>
            .notif-sheet { position:fixed; bottom:0; left:0; right:0; background:#0f172a; border-radius:24px 24px 0 0; z-index:9999999; display:flex; flex-direction:column; max-height:85vh; height:85vh; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); border-top: 1px solid #1e293b; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: translateY(100%); padding-bottom: env(safe-area-inset-bottom); }
            .notif-sheet.show { transform: translateY(0) !important; }
        </style>
        <div id="notifOverlay" class="modal-overlay" onclick="closeNotifModal()" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999998; backdrop-filter:blur(2px);"></div>
        <div id="notifModal" class="notif-sheet">
            <div class="rm-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #1e293b; flex-shrink: 0; background:#0f172a; border-radius: 24px 24px 0 0;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:42px; height:42px; background:rgba(59, 130, 246, 0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; border: 1px solid rgba(59, 130, 246, 0.4);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <h3 style="color:#fff; margin:0; font-size:18px; font-weight:900;">Notifikasi Update</h3>
                </div>
                <button onclick="closeNotifModal()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div id="notif-content-list" class="hide-scrollbar" style="flex:1; overflow-y:auto; padding: 15px;"></div>
        </div>
    `;
    document.body.appendChild(div);
};

window.openNotifModal = function() {
    injectNotifModal();
    document.getElementById('notifOverlay').style.display = 'block';
    let modal = document.getElementById('notifModal');
    // Memaksa CSS membaca perubahannya secara instan
    modal.offsetHeight; 
    setTimeout(() => modal.classList.add('show'), 10);
    
    let content = document.getElementById('notif-content-list');
    content.innerHTML = '<div style="text-align:center; padding:50px;"><div class="spinner" style="margin:0 auto;"></div></div>';
    
    setTimeout(() => {
        let animeList = window.cachedScheduleData || [];
        if(animeList.length === 0) {
            content.innerHTML = '<div style="text-align:center; padding: 50px; color:#888; font-weight:600; font-size: 13px;">Belum ada notifikasi update.</div>';
            return;
        }
        
        let html = '';
        animeList.slice(0, 20).forEach((a, idx) => {
            let badge = getEpBadge(a);
            let timeText = idx === 0 ? 'Baru saja' : (idx < 5 ? `${idx * 15 + 10} menit lalu` : `${Math.floor(idx/3) + 2} jam lalu`);
            
            html += `
                <div style="display:flex; gap:15px; padding:15px; background:#1e293b; border-radius:16px; margin-bottom:12px; border:1px solid #334155; cursor:pointer; align-items:center;" onclick="closeNotifModal(); setTimeout(() => loadDetail('${a.url}'), 300)">
                    <div style="position:relative; width:65px; height:85px; flex-shrink:0;">
                        <img src="${getHighRes(a.image)}" style="width:100%; height:100%; border-radius:10px; object-fit:cover;">
                        <div style="position:absolute; top:-6px; right:-6px; width:24px; height:24px; background:#ef4444; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #1e293b; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                            <div style="width:8px; height:8px; background:#fff; border-radius:50%;"></div>
                        </div>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="color:#3b82f6; font-size:11px; font-weight:900; margin-bottom:6px; letter-spacing:0.5px;">UPDATE RILIS</div>
                        <div style="color:#fff; font-size:15px; font-weight:800; margin-bottom:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${a.title}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="color:#facc15; font-size:12px; font-weight:800;">${badge}</div>
                            <div style="color:#94a3b8; font-size:11px; font-weight:700;">${timeText}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        content.innerHTML = html;
    }, 300);
};

window.closeNotifModal = function() {
    let modal = document.getElementById('notifModal');
    let overlay = document.getElementById('notifOverlay');
    if(modal) {
        modal.classList.remove('show');
        setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }
};

// ==========================================
// FUNGSI LAYAR MODAL LEADERBOARD & RANKING
// ==========================================
function injectLeaderboardAndRankModals() {
    if(document.getElementById('rank-modals-injected')) return;
    const div = document.createElement('div'); div.id = 'rank-modals-injected';
    div.innerHTML = `
        <style>
            .rank-modal-sheet { display:none; position:fixed; inset:0; background:#0f172a; z-index:9999999; flex-direction:column; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: translateY(100%); }
            .rank-modal-sheet.show { transform: translateY(0); }
            .rm-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #1e293b; flex-shrink: 0; background: #0f172a;}
            .rm-tabs { display: flex; gap: 10px; padding: 15px 20px; background: #0f172a; flex-shrink: 0; overflow-x: auto; white-space: nowrap; }
            .rm-tabs::-webkit-scrollbar { display: none; }
            .rm-tab-btn { flex: 1; min-width: 85px; background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 10px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; transition: 0.2s; }
            .rm-tab-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
            
            .podium-wrap { display: flex; align-items: flex-end; justify-content: center; gap: 15px; padding: 20px 20px 30px 20px; background: linear-gradient(180deg, rgba(30,41,59,0.5) 0%, transparent 100%); flex-shrink: 0; }
            .pod-item { display: flex; flex-direction: column; align-items: center; position: relative; width: 30%; cursor: pointer;}
            .pod-ava { border-radius: 50%; object-fit: cover; background: #1e293b; }
            .pod-2 .pod-ava { width: 65px; height: 65px; border: 3px solid #94a3b8; }
            .pod-1 .pod-ava { width: 85px; height: 85px; border: 4px solid #facc15; }
            .pod-3 .pod-ava { width: 65px; height: 65px; border: 3px solid #b45309; }
            .pod-badge { font-size: 10px; font-weight: 900; color: #fff; padding: 4px 8px; border-radius: 10px; margin-top: -10px; position: relative; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
            .pod-name { font-size: 14px; font-weight: 800; color: #fff; margin-top: 10px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-shadow: 0 1px 3px rgba(0,0,0,0.8);}
            
            .rm-list { flex: 1; overflow-y: auto; padding: 0 20px 20px 20px; }
            .rm-list-item { display: flex; align-items: center; gap: 12px; background: #1e293b; padding: 12px 15px; border-radius: 16px; margin-bottom: 10px; cursor:pointer;}
            .rm-rank-num { font-size: 18px; font-weight: 900; color: #94a3b8; width: 30px; text-align: center; }
            
            .ar-item { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; background: #1e293b; border-radius: 12px; padding-right: 15px; cursor: pointer;}
            .ar-img-wrap { position: relative; width: 80px; height: 110px; flex-shrink: 0; }
            .ar-img { width: 100%; height: 100%; border-radius: 12px 0 0 12px; object-fit: cover; }
            .ar-rank-badge { position: absolute; top: -5px; left: -5px; background: #ef4444; color: #fff; font-size: 12px; font-weight: 900; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
            .ar-title { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        </style>
        
        <div id="rankOverlay" class="modal-overlay" onclick="window.closeRankModals()" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999998;"></div>
        
        <div id="leaderboardModal" class="rank-modal-sheet">
            <div class="rm-header">
                <h3 style="color:#fff; margin:0; font-size:20px; font-weight:900;">Leaderboard User</h3>
                <button onclick="window.closeRankModals()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="rm-tabs hide-scrollbar">
                <button class="rm-tab-btn active" id="tab-lb-harian" onclick="window.renderLeaderboardData('harian')">Level</button>
                <button class="rm-tab-btn" id="tab-lb-mingguan" onclick="window.renderLeaderboardData('mingguan')">Mingguan</button>
                <button class="rm-tab-btn" id="tab-lb-bulanan" onclick="window.renderLeaderboardData('bulanan')">Bulanan</button>
                <button class="rm-tab-btn" id="tab-lb-koin" onclick="window.renderLeaderboardData('koin')" style="border-color:#facc15; color:#facc15;">Sultan 🪙</button>
            </div>
            <div id="lb-content" style="display:flex; flex-direction:column; flex:1; overflow:hidden;"></div>
        </div>

        <div id="animeRankModal" class="rank-modal-sheet">
            <div class="rm-header">
                <h3 style="color:#fff; margin:0; font-size:20px; font-weight:900;">Anime Terpopuler</h3>
                <button onclick="window.closeRankModals()" style="background:transparent; border:none; color:#94a3b8; cursor:pointer;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="rm-list hide-scrollbar" id="ar-list" style="padding-top: 20px;"></div>
        </div>
    `;
    document.body.appendChild(div);
}

window.renderLeaderboardData = function(type) {
    document.querySelectorAll('#leaderboardModal .rm-tab-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('tab-lb-' + type);
    if(activeBtn) activeBtn.classList.add('active');

    let content = document.getElementById('lb-content');
    content.innerHTML = '<div style="text-align:center; padding:50px;"><div class="spinner" style="margin:0 auto;"></div></div>';

    setTimeout(() => {
        let users = [...(window.fullLeaderboardData || [])];
        if(users.length === 0) { content.innerHTML = '<div style="text-align:center; color:#888; padding:50px;">Tidak ada data.</div>'; return; }

        let isKoin = type === 'koin';
        
        if (type === 'mingguan') {
            users.sort((a,b) => ((b.exp || 0) % 500) - ((a.exp || 0) % 500));
        } else if (type === 'bulanan') {
            users.sort((a,b) => ((b.exp || 0) % 2000) - ((a.exp || 0) % 2000));
        } else if (isKoin) {
            users.sort((a,b) => (b.koin || 0) - (a.koin || 0));
        } else {
            users.sort((a, b) => (b.level || 1) - (a.level || 1) || (b.exp || 0) - (a.exp || 0));
        }

        let t1 = users[0] || {nama:'-', foto:'https://placehold.co/100', exp:0};
        let t2 = users[1] || {nama:'-', foto:'https://placehold.co/100', exp:0};
        let t3 = users[2] || {nama:'-', foto:'https://placehold.co/100', exp:0};

        let openProf = (uid) => `window.closeRankModals(); setTimeout(() => openUserProfile('${uid}'), 300);`;

        let podiumHtml = `
            <div class="podium-wrap">
                <div class="pod-item pod-2" onclick="${openProf(t2.uid)}">
                    <img src="${t2.foto}" class="pod-ava">
                    <div class="pod-badge" style="background:#475569;">RUNNER-UP</div>
                    <div class="pod-name">${t2.nama}</div>
                </div>
                <div class="pod-item pod-1" style="margin-bottom: 25px;" onclick="${openProf(t1.uid)}">
                    <img src="${t1.foto}" class="pod-ava" style="${isKoin ? 'border-color:#fde047;' : ''}">
                    <div class="pod-badge" style="background:${isKoin ? '#fde047' : '#facc15'}; color:#000;">${isKoin ? 'SULTAN #1' : 'WINNER'}</div>
                    <div class="pod-name" style="color:${isKoin ? '#fde047' : '#facc15'};">${t1.nama}</div>
                </div>
                <div class="pod-item pod-3" onclick="${openProf(t3.uid)}">
                    <img src="${t3.foto}" class="pod-ava">
                    <div class="pod-badge" style="background:#ea580c;">TOP 3</div>
                    <div class="pod-name">${t3.nama}</div>
                </div>
            </div>
            <div class="rm-list hide-scrollbar">
        `;

        for(let i=3; i<users.length; i++) {
            let u = users[i];
            let roleBadge = u.role === 'Wibu Premium' ? 'badge-premium-anim' : 'badge-member';
            
            let displayExp = '';
            if (isKoin) displayExp = `🪙 ${(u.koin || 0).toLocaleString('id-ID')}`;
            else if (type === 'mingguan') displayExp = `+${(u.exp || 0) % 500}`;
            else if (type === 'bulanan') displayExp = `+${(u.exp || 0) % 2000}`;
            else displayExp = `+${u.exp || 0}`;
            
            podiumHtml += `
                <div class="rm-list-item" onclick="${openProf(u.uid)}">
                    <div class="rm-rank-num">#${i+1}</div>
                    <img src="${u.foto}" style="width:45px; height:45px; border-radius:50%; object-fit:cover;">
                    <div style="flex:1; min-width:0;">
                        <div style="color:#fff; font-size:15px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.nama}</div>
                        <div style="display:flex; gap:6px; margin-top:4px;">
                            <span class="c-badge badge-lvl-stone" style="font-size:10px; padding:2px 6px;">Lvl ${u.level || 1}</span>
                            <span class="c-badge ${roleBadge}" style="font-size:10px; padding:2px 6px;">${u.role || 'Member'}</span>
                        </div>
                    </div>
                    <div style="color:${isKoin ? '#facc15' : '#3b82f6'}; font-weight:900; font-size:15px;">${displayExp}</div>
                </div>
            `;
        }
        content.innerHTML = podiumHtml + '</div>';
    }, 300);
};

window.openLeaderboardModal = function(defaultTab = 'harian') {
    document.getElementById('rankOverlay').style.display = 'block';
    let modal = document.getElementById('leaderboardModal');
    modal.style.display = 'flex';
    modal.offsetHeight; 
    setTimeout(() => modal.classList.add('show'), 10);
    window.renderLeaderboardData(defaultTab);
};

window.openAnimeRankModal = function() {
    document.getElementById('rankOverlay').style.display = 'block';
    let modal = document.getElementById('animeRankModal');
    modal.style.display = 'flex';
    modal.offsetHeight; 
    setTimeout(() => modal.classList.add('show'), 10);

    let content = document.getElementById('ar-list');
    content.innerHTML = '<div style="text-align:center; padding:50px;"><div class="spinner" style="margin:0 auto;"></div></div>';

    setTimeout(() => {
        let animeList = [];
        if (window.cachedScheduleData) animeList = window.cachedScheduleData.slice(0, 30);
        else animeList = [{title: 'Memuat Anime...', image:'https://placehold.co/100', score:'8.7', episode:'12 Eps'}];

        let html = '';
        animeList.forEach((a, idx) => {
            let score = a.score || (Math.random() * 1.5 + 7.5).toFixed(1);
            let views = (Math.random() * 50 + 10).toFixed(1) + 'K';
            let bgRank = idx === 0 ? '#facc15' : (idx === 1 ? '#94a3b8' : (idx === 2 ? '#b45309' : '#334155'));
            let colorRank = idx === 0 ? '#000' : '#fff';

            html += `
                <div class="ar-item" onclick="window.closeRankModals(); setTimeout(() => loadDetail('${a.url}'), 300)">
                    <div class="ar-img-wrap">
                        <img src="${getHighRes(a.image)}" class="ar-img">
                        <div class="ar-rank-badge" style="background:${bgRank}; color:${colorRank};">#${idx+1}</div>
                    </div>
                    <div style="flex:1;">
                        <div class="ar-title">${a.title}</div>
                        <div style="color:#a1a1aa; font-size:13px; font-weight:600; margin-bottom:6px;">${a.episode || '12 Eps'}</div>
                        <div style="display:flex; align-items:center; gap:12px; font-size:13px; font-weight:700;">
                            <span style="color:#facc15;">⭐ ${score}</span>
                            <span style="color:#94a3b8;">👁️ ${views} views</span>
                        </div>
                    </div>
                </div>
            `;
        });
        content.innerHTML = html;
    }, 300);
};

window.closeRankModals = function() {
    document.querySelectorAll('.rank-modal-sheet').forEach(m => m.classList.remove('show'));
    setTimeout(() => {
        document.getElementById('rankOverlay').style.display = 'none';
        document.querySelectorAll('.rank-modal-sheet').forEach(m => m.style.display = 'none');
    }, 400);
};

// INITIALIZATION
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }
