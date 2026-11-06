# Katkı rehberi

Önce README'deki kurulumu yapın. Değişiklikleri küçük ve tek amaca odaklı tutun. Python 3.11 ve Node.js 22 kullanın; paket kilitlerini birlikte güncelleyin.

```sh
python -m pytest analysis/tests -q
python tools/validate_outputs.py
cd web
npm ci
npm test
npm run typecheck
npm run build -- --webpack
```

Bilimsel hesap değişirse yöntemi ve kaynakları belgeleyin; gerçek pilotu tekrar üretip kaynak dosyası hash'lerini ve çıktıları birlikte güncelleyin. Sentetik diziler yalnız testlerde ve geçici dizinlerde kullanılabilir. Bunları `web/public/data` içine koymayın. Yeni eşikler yerel referanslarla doğrulanmadan hasar sınıfı olarak yayımlanamaz. Veri olmayan dönemler için interpolasyonu gözlem gibi göstermeyin.

Ham uydu dosyalarını, `data/cache/`, `.env`, şifreleri, erişim anahtarlarını ve kişisel verileri commit etmeyin. Hata raporlarına sır eklemeyin. Yeni pilot eklemeden önce Marmaris ilk pilotunun kompozit ve toparlanma doğrulamasını tamamlayın.

Değişiklik açıklamasında problem, oluşan davranış ve gerçekten çalıştırılan kontrolleri belirtin. Bilimsel iddiaları kaynaklara bağlayın; NDVI'yı ağaç sayısı veya tür çeşitliliği diye yorumlamayın. Katkılar MIT kod lisansı altında kabul edilir; üçüncü taraf veri lisansları korunur.
