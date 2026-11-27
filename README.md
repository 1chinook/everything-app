# Everything App

Kişisel üretkenlik, planlama, ders takibi, fitness, kitap/proje/günlük yönetimi ve medya akışlarını tek bir yerde toplayan PWA destekli yerel yaşam yönetim uygulaması.

| Alan | Değer |
|---|---|
| **Kategori** | Full-Stack Yerel PWA + API |
| **Teknoloji** | Node.js 20+ (bağımlılıksız) + Vanilla JS |
| **Port / URL** | `4173` · `http://127.0.0.1:4173` |
| **Başlatıcı** | `BASLAT.bat` (`start.ps1`) |
| **Doğrulama** | `node --check server.js && node --test tests/*.test.js` |

## Özellikler

- **Planlayıcı ve Günlük Akış:** Görevler, etkinlikler, uyku ve günlük kontroller, yansıma (reflection) ve öneri motoru.
- **Dersler ve Sınavlar:** Ders programı, konu ustalığı takibi, aralıklı tekrar (spaced repetition) ve sınav hazırlığı.
- **Fitness:** Antrenman programı, aktivite süresi ve kalori takibi.
- **Kişisel Alanlar:** Kitaplar, projeler, günlükler, merak rotaları, dil pratiği ve PDF materyal yönetimi.
- **Keşif ve Medya:** Günlük haber okuyucu ve Spotify müzik entegrasyonu (`http://127.0.0.1:4173/api/music/callback`).
- **Yedekleme ve Eşitleme:** Yerel yedekleme/geri yükleme ve yerel ağ (LAN) üzerinden cihazlar arası senkronizasyon.
- **PWA ve Otomasyon:** Çevrimdışı önbellekleme (`sw.js`) ve Windows günlük içerik yenileme otomasyonu.

## Klasör Yapısı

```text
everything-app/
├── src/
│   ├── modules/                   # İstemci özellik ve alan modülleri
│   ├── styles/                    # CSS stil dosyaları
│   └── server/                    # Sunucu yardımcıları (haberler, Spotify, günlük yenileme)
├── tests/                         # Node.js birim testleri
├── vendor/                        # Yerel üçüncü parti kütüphaneler
├── index.html                     # Ana uygulama kabuğu
├── app.js                         # build-client.js ile üretilen istemci paketi
├── server.js                      # Yerel HTTP / senkronizasyon sunucusu (PORT=4173)
├── build-client.js                # Modülleri app.js içinde birleştiren derleme betiği
├── launch-app.js                  # Uygulama başlatıcı yardımcısı
├── sw.js & manifest.webmanifest   # PWA service worker ve manifest
├── install-daily-automation.ps1   # Windows Zamanlanmış Görev kurulumu
├── BASLAT.bat & start.ps1         # Tek tık otomatik yeniden başlatıcı
├── AGENTS.md                      # Mühendislik kuralları
└── README.md
```

## Kurulum ve Çalıştırma

Node.js (20+ önerilir) kurulu olmalıdır; harici npm bağımlılığı gerektirmez.

- **Windows Tek Tık Başlatıcı (Önerilen):** `BASLAT.bat` dosyasına çift tıklayın (eski süreci temizler, `4173` portunu başlatır ve tarayıcıyı açar).
- **Terminal:**

```sh
# Sunucuyu başlat
node server.js

# Yerel ağdaki diğer cihazlarla eşitleme için
node server.js --lan

# src/modules/ değişikliği sonrası istemci paketini güncelle
node build-client.js
```

## Testler ve Doğrulama

```sh
node --check server.js
node --test tests/*.test.js
```
