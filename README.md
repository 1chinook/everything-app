# Everything App

Kişisel üretkenlik, planlama, ders takibi, fitness, kitap/proje/günlük yönetimi ve medya akışlarını tek bir yerde toplayan **PWA destekli kişisel yaşam yönetim uygulaması**.

## Özellikler

- **Planlayıcı & Günlük Akış:** Görevler, etkinlikler, uyku ve günlük kontroller, yansıma (reflection) ve öneri motoru.
- **Dersler & Sınavlar:** Ders programı, konu ustalığı takibi, aralıklı tekrar (spaced repetition) ve final hazırlığı.
- **Fitness:** Antrenman programı, aktivite süresi ve kalori takibi.
- **Kişisel Alanlar:** Kitaplar, projeler, günlükler, merak rotaları, dil pratiği ve materyal (PDF) yönetimi.
- **Keşif & Medya:** Günlük haber okuyucu ve Spotify müzik entegrasyonu.
- **Yedekleme & Eşitleme:** Yerel yedekleme/geri yükleme ve yerel ağ (LAN) üzerinden cihazlar arası senkronizasyon.
- **PWA & Otomasyon:** Çevrimdışı önbellekleme (`sw.js`) ve Windows günlük içerik yenileme otomasyonu.

## Klasör Yapısı

```text
├── index.html                    # Ana uygulama kabuğu
├── app.js                        # build-client.js ile üretilen istemci paketi
├── server.js                     # Yerel HTTP / senkronizasyon sunucusu
├── launch-app.js                 # Uygulama başlatıcı
├── build-client.js               # Modülleri app.js içinde birleştiren derleme betiği
├── sw.js & manifest.webmanifest  # PWA service worker ve manifest
├── install-daily-automation.ps1  # Windows Zamanlanmış Görev kurulumu
├── src/
│   ├── modules/                  # İstemci özellik ve alan modülleri
│   ├── styles/                   # CSS stil dosyaları
│   └── server/                   # Sunucu yardımcıları (haberler, Spotify, günlük yenileme)
└── tests/                        # Node.js birim testleri
```

## Kurulum ve Çalıştırma

Node.js (20+ önerilir) kurulu olmalıdır; harici npm bağımlılığı gerektirmez.

```sh
# Sunucuyu başlat
node server.js

# Yerel ağdaki diğer cihazlarla eşitleme için
node server.js --lan
```

Tarayıcıda `http://127.0.0.1:4173` adresini açın.

### İstemci Paketini Güncelleme

`src/modules/` altındaki temel modüllerde değişiklik yaptıktan sonra `app.js` paketini yeniden oluşturun:

```sh
node build-client.js
```

## Testler

```sh
node --test tests/*.test.js
```
