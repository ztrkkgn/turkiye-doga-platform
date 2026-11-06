# İlk çalışan sürüm · 6 Kasım 2026

## 1. Amaç

Öncelikli başlangıç talimatı tamamlandı: GitHub'a uygun proje kuruldu, Marmaris 2021 için gerçek katalog ve bant erişimi doğrulandı, ilk tekrarlanabilir iki tarihli analiz üretildi. Sonuçlar küçük bir web görüntüleyicisine bağlandı. Altı fazlık bütün MVP tamamlanmış değildir.

| Faz | Gerçek durum |
| --- | --- |
| 1 · Temel kurulum | Tamam: monorepo, Python ortamı, Next.js, bağımlılık kilitleri, Git |
| 2 · Uydu erişimi | İlk pilot çifti için tamam: iki katalog HTTP200, C1 bantlarının gerçek piksel okuması, metadata kaydı |
| 3 · Analiz motoru | İlk NDVI/NBR/dNBR/ΔNDVI çifti ve testler tamam; medyan kompozitler, 2022–2026 serisi ve bağımsız piksel doğrulaması eksik |
| 4 · Frontend | İlk gerçek veri görüntüleyicisi tamam; harita, dNBR katmanı, RGB karşılaştırması, bölge ve yöntem sayfası. Yıllık grafik ve iyileşme katmanı üretilmedi |
| 5 · Güncelleme | Sabit seçim, veri sözleşmesi ve kalite kapısı var; zamanlanmış kontrol/otomatik güncelleme henüz yok |
| 6 · Yayın | Yerel testler ve statik derleme geçti; CI tanımı hazır. GitHub/Vercel yayını ve uzakta CI çalıştırması yapılmadı |

## 2. Teknik yaklaşım

Python/Rasterio uydu verisini önceden işler. NumPy indisleri, SciPy maske tamponunu üretir. STAC kayıtları tam olarak saklanır. Next.js/TypeScript/Tailwind statik web çıktısı; MapLibre gerçek coğrafi görüntü katmanını gösterir. Supabase, özel sunucu, AI modeli veya GPU bu ilk adım için gerekli değildir.

20 m UTM ortak grid, 10 m ve 20 m bantların geometrik olarak tutarlı karşılaştırılmasını sağlar. Kategorik sınıflar en yakın komşu, sürekli yansıtımlar alan ortalamasıyla örneklenir. Analiz SCL4/5 ve iki tarihin ortak desteğiyle sınırlıdır. RGB, bulutları filtreleyerek su/karanlık yüzeyleri de gözlemsel bağlamda korur. Gösterim görselleri ayrıca Web Mercator'a çevrilmiştir.

İçmeler penceresi bağımsız yayın merkezine göre seçildi; resmî yangın poligonu değildir. Kaynaklar, tarih çelişkileri ve kapsam [bilimsel kaynaklarda](scientific-sources.md) açıklanır. Araştırmadan alan toplamı veya sonuç kopyalanmadı.

## 3. Uygulama

- `analysis/src/doga/`: katalog, bant erişimi, maskeler, indisler, kalite kapıları ve komut satırı.
- `analysis/tests/`: sayısal, radyometrik, raster hizalama ve başarısız veri yayımlamama testleri.
- `data/regions/`: kesin bbox, tarih pencereleri, çözünürlük ve kaynaklar.
- `data/processed/`: gerçek erişim raporu, özet, sabit STAC seçimi.
- `web/`: üç Türkçe sayfa, MapLibre, gerçek veri karşılaştırması ve veri sözleşmesi testleri.
- `tools/validate_outputs.py`: varlık/hash, kaynak kodu sürümü, tarih ve fiziksel tutarlılık kontrolü.
- `.github/workflows/ci.yml`, README, analiz kılavuzu, katkı rehberi, MIT lisansı ve güvenli ortam örneği.

## 4. Çalıştırma

Proje kökünden:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r analysis/requirements.txt
doga probe --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/mugla-marmaris-2021.json
python tools/validate_outputs.py
python -m pytest analysis/tests -q
cd web
npm ci
npm test
npm run typecheck
npm run build -- --webpack
npm run serve
```

Statik önizleme `http://localhost:3000` adresindedir. İnceleme sırasında çalıştırılan geçici sunucu teslim sonunda durdurulur; `npm run serve` yeniden açar. Geliştirme için `npm run dev` kullanılabilir. Bu ortamda dosya izleme sınırı nedeniyle çalışan son sürüm statik sunucuyla doğrulandı.

## 5. Gerçekten çalıştırılan doğrulamalar

| Kontrol | Sonuç |
| --- | --- |
| Copernicus STAC gerçek HTTP isteği | 200, gerçek Sentinel-2 ürünleri döndü |
| Earth Search C1 STAC gerçek HTTP isteği | 200, gerçek C1 ürünleri döndü |
| COG bant erişimi | İki tarihte SCL, B02, B03, B04, B08, B8A, B12 okundu |
| Python testleri | **32 geçti**, başarısız yok |
| Web testleri | **7 geçti**, biri gerçek üretilmiş JSON'u yükler |
| TypeScript | Geçti |
| Üretim derlemesi | `npm run build -- --webpack` geçti; üç sayfa statik üretildi |
| İşlenmiş çıktı doğrulaması | 10 varlığın hash'i, kaynak kodu hash'leri, C1 provenance, tarihler ve ortak metrikler geçti |
| Tarayıcı | Gerçek harita/katman görüntülendi; pilota yakınlaşma ve katman aç/kapat çalıştı |
| Karşılaştırma | Klavyeyle 50→51→50 değişimi ve iki gerçek RGB'nin yüklenmesi doğrulandı |
| Mobil | 390×844 görünüm incelendi; sayfa genişliği 390 px, yatay taşma yok; slider çalıştı |
| Bölge bağlantısı | `/bolge/mugla-marmaris-2021/` açıldı ve başlık doğrulandı |

Rasterio/Affine'dan 28 `PendingDeprecationWarning` görüldü; hesaplama hatası veya test başarısızlığı değildir. Node23 tip sıyırma testi deneysel özellik uyarısı verir. Tam WCAG uyum sertifikası, saha doğruluk değerlendirmesi, bütün cihazlar için performans ölçümü veya uzakta deployment testi yapılmış değildir.

### Bulunan ve giderilen sorunlar

İlk eski Earth Search koleksiyonunda asset ofseti ile önceden dönüştürülmüş COG'lar çelişti. Gerçek piksel kontrolünde fiziksel aralık dışında indisler bulundu; bu çıktı bilimsel sonuç olarak kullanılmadı. Sağlayıcının hata kayıtları araştırılıp C1 koleksiyonuna geçildi. Fiziksel aralık ve eski koleksiyonu reddetme testleri eklendi. Son gerçek analiz C1 ürünlerini kullanır.

Next.js'in varsayılan Turbopack derlemesi alt ajan ortamının port sınırına takıldı; resmi webpack seçeneğiyle derleme başarıyla yapıldı. Geliştirme sunucusunun dosya izleyicisi ayrıca `EMFILE` verdi; testler üretilmiş statik sitede sürdürüldü.

Tarayıcıda MapLibre6 worker dosyasının varsayılan yolu hatası gözlendi. Resmi [v6 kurulum belgesine](https://maplibre.org/maplibre-gl-js/docs/) göre `setWorkerUrl(new URL(..., import.meta.url))` tanımlandı. Son derlemede worker dosyası üretildi; yeniden yüklemeden sonra yeni worker hatası görülmedi ve gerçek AOI/dNBR haritada görsel olarak doğrulandı.

## 6. Çıktı

| Ölçüm | Değer |
| --- | --- |
| Çalışma penceresi | 28.15–28.32°E, 36.74–36.86°N |
| Grid | EPSG:32635, 20 m |
| Önce | 28 Temmuz 2021 09:00:15 UTC; tam hassasiyet JSON'da |
| Sonra | 17 Ağustos 2021 09:00:14 UTC; tam hassasiyet JSON'da |
| Ortak piksel sayısı | 292.072 |
| Ortak alan | 116,8288 km²; yanan alan değildir |
| Ortak pencere payı | %57,856; doğruluk/hasar oranı değildir |
| Önce NDVI, ortak destek | 0,5562117 |
| Sonra NDVI, ortak destek | 0,4145919 |
| Ortalama ΔNDVI | −0,1416198 |
| Ortalama dNBR | 0,1931578 |

Pencere deniz, yerleşim ve değişmemiş arazi içerir. Analiz dışında kalan karanlık/belirsiz yanık pikseller yüzünden istatistikler tüm yangını temsil etmez. Saha kalibrasyonu yapılmadı. 2022–2026 iyileşme oranı veya ağaç kaybı yüzdesi çıkarılamaz.

## 7. GitHub

Yerel `main` üzerinde kurulum commit'i `d3dbbc2`, gerçek analiz commit'i `30bca38` oluşturuldu. Web/CI/belge teslimi ayrı `feat(web): add verified pilot explorer and contributor documentation` commit'iyle kaydedilir. Kimlik verilmediği için yerel kayıtlar `Codex <codex@local.invalid>` adıyla oluşturulmuştur; kullanıcı adına sahte yazarlık bilgisi eklenmedi.

Bu ortamda `gh` kurulu değil ve uzak depo tanımlanmadı. Repo oluşturulmadı veya push yapılmadı. Gerekli `gh auth login`, depo oluşturma, push ve Vercel ayarları ana README'de hazırdır. Anahtar veya parola dosyalara yazılmadı. Ham uydu ürünleri, önbellek ve büyük yerel türetilmiş GeoTIFF'ler Git dışında.

## 8. Sonraki aşama

Marmaris için aynı mevsim pencerelerinde 2022–2026 medyan kompozitlerini üretmek; piksel başına geçerli gözlem sayısını kaydetmek; sabit ortak maskede toparlanma serisini hesaplamak; bağımsız referanslarla olay/piksel doğrulamasını genişletmek. Bu tamamlanmadan Bördübet veya yeni özelliklere geçilmez. Otomatik düzenli güncelleme ve halka açık yayın daha sonraki fazlardır.
