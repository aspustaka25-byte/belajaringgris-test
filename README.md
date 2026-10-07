# Belajar Inggris (dengan server untuk fitur AI)

Isi folder:
- `server.js`: server kecil tanpa dependensi. Menyajikan halaman dan meneruskan permintaan AI ke Anthropic API.
- `public/index.html`: aplikasinya (Kartu, Kuis, Grammar, Listening, Speaking, Obrolan).
- `.env.example`: contoh pengaturan.

API key hanya disimpan di server. Jangan menaruhnya di file HTML atau mengunggahnya ke GitHub.

## 1. Dapatkan API key
Buat akun di https://console.anthropic.com lalu buat API key. Penggunaan AI ditagihkan ke akun pemilik key,
jadi sebaiknya atur batas pengeluaran bulanan di Console.

## 2. Coba di komputer sendiri
Butuh Node.js versi 18 atau lebih baru (https://nodejs.org).

1. Salin `.env.example` menjadi `.env`, lalu isi `ANTHROPIC_API_KEY`.
2. Jalankan di terminal dari dalam folder ini:
   `node server.js`
3. Buka http://localhost:3000 di browser.

## 3. Pasang di internet
Pakai layanan hosting yang mendukung Node.js (misalnya Render atau Railway). Langkah umumnya:

1. Unggah folder ini ke repositori GitHub (file `.env` tidak ikut, sudah ada di `.gitignore`).
2. Buat layanan baru bertipe Web Service dari repositori itu.
3. Start command: `node server.js` (tidak perlu build command).
4. Tambahkan variabel lingkungan `ANTHROPIC_API_KEY` berisi key kamu di pengaturan layanan.
5. Setelah selesai dipasang, kamu mendapat alamat website yang bisa dibuka siapa saja. Alamat dengan domain sendiri bisa dipasang lewat pengaturan Custom Domain di layanan hosting.

Langkah dan nama menu di tiap layanan bisa berubah, jadi ikuti panduan resmi layanan yang kamu pilih.

## Pengaturan opsional (variabel lingkungan)
| Nama | Fungsi | Bawaan |
|---|---|---|
| `ANTHROPIC_MODEL` | Model yang dipakai | `claude-sonnet-5-5` |
| `LIMIT_PER_IP_PER_HOUR` | Batas permintaan AI per pengguna per jam | 40 |
| `LIMIT_PER_DAY` | Batas total permintaan AI per hari | 1000 |
| `PORT` | Port server | 3000 |

Batas ini melindungi kuotamu dari pemakaian berlebihan. Catatan batas disimpan di memori server, jadi
hilang saat server dimulai ulang. Untuk pemakaian umum yang besar, tambahkan juga batas pengeluaran di Console.

## Catatan
- Tanpa `ANTHROPIC_API_KEY`, aplikasi tetap jalan, hanya fitur AI (topik tak terbatas, soal AI, grammar AI, obrolan) yang tidak muncul.
- Topik buatan sendiri tidak tersimpan setelah halaman dimuat ulang.
- Pengenalan suara di tab Speaking dan Obrolan bergantung pada browser (Chrome dan Safari terbaru umumnya mendukung) dan butuh alamat HTTPS agar mikrofon bisa dipakai. Layanan hosting biasanya sudah menyediakan HTTPS.
