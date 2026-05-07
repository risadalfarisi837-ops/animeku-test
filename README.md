# Animeku v115

## ✅ Perubahan di v115 (Fix Scrape + Video)

### Fix `scrapeWatch` — Video Tidak Muncul
**Masalah:**
- `scrapeWatch` hanya cek iframe biasa, padahal Gogoanime menyimpan server list di ajax endpoint terpisah
- Embed URL regex salah pattern, tidak match URL Gogoanime CDN

**Fix:**
- **STEP 1:** Fetch server list dari `ajax.gogocdn.net/ajax/anime_videos?episode_id=<movie_id>` (paling reliable)
- **STEP 2:** Fallback ke iframe utama (embed player)
- **STEP 3:** Fallback ke `data-video` attribute di server list button
- **STEP 4:** Regex extract embed URL dari inline script (pattern diperbaiki, tambah `gogocdn`, `megacloud`, `vidstream`)
- **STEP 5:** Direct m3u8/mp4 file
- **STEP 6:** Fallback konstruksi manual `embtaku.pro/streaming.php?id=<episode-slug>`

### Fix `/api/watch` endpoint — Fallback lebih agresif
- Fallback 1: coba semua domain gogoanime alternatif
- Fallback 2: cari via search + ambil episode sesuai nomor
- Fallback 3: konstruksi embed URL manual dari slug (`embtaku.pro` + `gogohd.net`)

### Fix `scrapeDetail` — Episode Kosong
- Auto-detect `/category/` prefix untuk halaman detail Gogoanime
- Fallback fetch episode per range (ep_start, ep_end dari button di halaman)
- Episode di-sort ascending by number
- Fallback link langsung dari halaman

### Tambahan: `/api/debug-watch`
```
/api/debug-watch?url=<episode_url>
```
Gunakan untuk test apakah stream bisa ditemukan dari sebuah URL episode.

---

## 🚀 Cara Deploy ke Vercel

1. Upload zip ini ke Vercel (drag & drop atau GitHub)
2. Set Environment Variable di Vercel Settings:
   - `MONGODB_URI` = `mongodb+srv://risadalfarisi837_db_user:animeku123@animeku.npxoq9p.mongodb.net/database?retryWrites=true&w=majority&appName=Animeku`
3. Deploy & tunggu selesai
4. Test koneksi: `https://animeku-indo.my.id/api/ping`

---

## 🕷️ Cara Scrape Anime ke MongoDB

### Langkah 1 — Cek domain Gogoanime yang aktif
```
https://animeku-indo.my.id/api/debug-kuro
```
Lihat field `winner` — itu domain yang lagi kerja.

### Langkah 2 — Scrape data
```
https://animeku-indo.my.id/api/scrape-all?source=gogoanime&pages=5&startPage=1
```
Ulangi dengan `startPage=6`, `startPage=11`, dst.

### Langkah 3 — Fix metadata (gambar, score, genre dari MAL/Jikan)
```
https://animeku-indo.my.id/api/fix-metadata?limit=50
```
Ulangi 3-5x sampai semua anime ter-enrich.

### Langkah 4 — Heal episode kosong
```
https://animeku-indo.my.id/api/heal-empty?limit=20
```
Ulangi sampai `"healed":0`.

### Langkah 5 — Hapus duplikat
```
https://animeku-indo.my.id/api/dedup
```

### Langkah 6 — Clear cache
```
https://animeku-indo.my.id/api/cache-clear
```

### Langkah 7 — Cek statistik DB
```
https://animeku-indo.my.id/api/db-stats
```

---

## 🧹 Urutan Lengkap (Copy-paste satu per satu di browser)

```
1. /api/ping                                          ← cek koneksi DB
2. /api/debug-kuro                                    ← cek domain aktif
3. /api/scrape-all?pages=10&startPage=1               ← scrape 10 halaman
4. /api/scrape-all?pages=10&startPage=11              ← lanjut scrape
5. /api/fix-metadata?limit=50                         ← ulangi 3-5x
6. /api/heal-empty?limit=30                           ← ulangi sampai healed=0
7. /api/dedup                                         ← hapus duplikat
8. /api/cache-clear                                   ← bersihkan cache
9. /api/db-stats                                      ← cek total anime
```

---

## 🔍 Debug Video Tidak Muncul

Kalau ada episode yang videonya tidak keluar, test dengan:
```
/api/debug-watch?url=<url_episode>
```
Contoh:
```
/api/debug-watch?url=https://anitaku.pe/one-piece-episode-1000
```
Kalau `streamCount: 0` → domain Gogoanime sedang kena Cloudflare block. Cek `/api/debug-kuro` dulu.
