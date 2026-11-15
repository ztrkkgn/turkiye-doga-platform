# Marmaris Sentinel-2 analiz motoru

Proje kökünden Python 3.11+ sanal ortamında `python -m pip install -r analysis/requirements.txt` ile kurulur. Python bağımlılıkları `requirements-lock.txt` içinde sabittir. Büyük kaynak GeoTIFF indirmek yerine Rasterio HTTP range okumasıyla COG dosyasının yalnız çalışma alanı okunur. Her analiz aynı bölgenin iki gözlemiyle sınırlıdır; aynı bölgeyi eşzamanlı çalıştırmayın. Güncel izleme en fazla iki farklı bölgeyi paralel işler.

## Komutlar

```sh
doga probe --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/mugla-marmaris-2021.json
python -m pytest analysis/tests -q
python tools/validate_outputs.py
```

`probe` Copernicus ve Earth Search kataloglarını dener ve `access-report.json` yazar; yalnız metadata erişimini ispatlar. `run` bantları gerçekten okur, hesaplar, kalite kontrollerinden geçen tam çifti web klasörüne aktarır. `--refresh` verilmezse repodaki tam STAC ürün seçimi kullanılır. Seçim yapılandırma SHA256'sıyla kilitlidir. Eski koleksiyonun kayıtları reddedilir. Ürün araması hedef tarihe yakınlığı, karo bulutluluğunu ve ürün kimliğini kullanır; sonuç büyüklüğüne göre seçmez.

## İşleme sırası

1. Coğrafi dikdörtgen EPSG:32635'e çevrilir; 20 m grid sınırlarına oturtulur. Dönüştürülmüş AOI geometrisi ayrıca piksellere maskelenir.
2. B02/B03/B04/B08 (10 m), B8A/B12/SCL (20 m) aynı CRS, affine dönüşüm, şekil ve piksel boyutunda okunur. Yansıtım için alan ortalaması; kategorik SCL için en yakın komşu kullanılır.
3. Her asset'in `raster:bands` scale/offset bilgisi kullanılır; ham NoData dönüşümden önce çıkarılır. C1 koleksiyonu zorunludur. Yansıtım ofseti çekim yılına bakarak tahmin edilmez.
4. Analiz için yalnız SCL4/5 kabul edilir. SCL3/8/9/10/11 çevresinde yarıçapı 3 piksel olan disk tamponu uygulanır; 20 m gridde 60 m'dir. AOI dışındaki komşu bulutların etkisini kaçırmamak için 3 piksellik çevre de okunur.
5. Negatif indis-bant yansıtımları, geçersiz veya çok küçük paydalar dışlanır. Sonlu NDVI/NBR'nin fiziksel aralığı kontrol edilir; yanlış sonuçlar `[-1,1]` aralığına kırpılarak gizlenmez.
6. dNBR ve ΔNDVI yalnız iki indis ve iki tarihte de geçerli ortak piksellerde hesaplanır. Tekil görüntü ortalamaları farklı desteklere sahip olabilir; karşılaştırma alanındaki ortalamalar ayrıca kaydedilir.
7. Tekil ve ortak kapsama alt sınırı %50'dir. Bu operasyonel yayın kapısıdır, bilimsel doğruluk eşiği değildir. Payda bütün çalışma penceresidir; deniz de dahil olduğu için kara kapsamıyla karıştırılmamalıdır.
8. Yerel indis GeoTIFF'leri 20 m UTM gridinde kalır. Web görselleri aynı EPSG:3857 gösterim gridine çevrilir; MapLibre görüntü köşeleri gerçek coğrafi bbox'a oturur. Büyük ham rasterlar tarayıcıya gönderilmez.

RGB görüntüler aynı 0–0.30 yansıtım aralığı ve 1.8 gamma ile gösterilir. RGB'nin amacı gözlemsel bağlamdır: SCL2/4/5/6/7 yüzeyleri, su ve koyu yanık yüzeyleri korur; bulut/gölge/kar ve NoData yine dışlanır. Analiz maskesi daha dardır ve RGB'de görünen her pikselin metriklere dahil olduğu anlamına gelmez. Eksik alanlar şeffaftır, yapay doldurma yapılmaz.

dNBR harita renk ölçeği `−0.5 … 1` gösterim aralığıdır; yalnız renkler doyurulur, ölçümler/GeoTIFF'ler kırpılmaz. Mavi, nötr ve turuncu renkler sürekli değişimi gösterir; hasar sınıfları değildir. ΔNDVI için de sınıflandırma yapılmaz.

## İzlenebilirlik ve sınırlar

Özet ve provenance; gerçek çekim zamanını, özgün ESA ürününü, STAC kimliğini, baseline'ı, bütün bant URL'lerini, sağlayıcının dosya checksum'larını, scale/offset bilgilerini, grid dönüşümünü, geçerli piksel sayısını, yazılım sürümlerini ve analiz kaynak dosyası SHA256'larını tutar. Web varlıklarının SHA256'ları ayrıca kaydedilir. `validate_outputs.py` bunları çevrimdışı kontrol eder. Sağlayıcının bütün büyük dosyaları indirilip checksum'ları yeniden hesaplanmadı; kaynak checksum'ları upstream metadata kaydıdır.

Mevcut ilk çift medyan kompozit değildir. SCL koyu yanık pikselleri belirsiz/karanlık diye sınıflayabilir; bunların dışlanması özellikle ağır etkilenen yüzeylerde yanlılık yaratabilir. Yangın sınırı, sınıflanmış hasar ve yanan hektar toplamı üretilmez. Olay bağlamı dış kaynakla doğrulanmıştır; piksel düzeyinde bağımsız saha doğrulaması yoktur. Yıllık iyileşme çıkarımı henüz yapılamaz.

## Birden fazla bölge

`data/regions/` içindeki her konfigürasyon kendi kalıcı `id`, bbox, CRS ve
Sentinel karesini tanımlar. `publicSlug` web çıktı dizinini seçer; yalnız
küçük Latin harfleri, rakamlar ve aradaki tireler kabul edilir. Eski Marmaris
konfigürasyonu `publicSlug` içermediğinde geriye uyumlu `/data/marmaris/`
korunur. Manavgat `/data/manavgat/` altına yazılır. Her bölgenin geçici
hazırlama, yedek, cache ve provenance konumu ayrıdır.

```sh
doga run --config data/regions/antalya-manavgat-2021.json
python tools/validate_outputs.py --region manavgat
python tools/validate_outputs.py  # Tüm işlenmiş tarihsel ve güncel bölgeler
```

## Ücretsiz güncel bölge izlemesi

```sh
doga monitor --config data/monitoring/config.json
python tools/validate_outputs.py --version-monitor-assets
```

İzleme seçili Marmaris, Manavgat, Bördübet ve Yamanlar pencereleri içindir.
Türkiye geneli tarama değildir. Son 0–14 takvim gününün kullanılabilir son
gözlemi, 15–42 gün önceki kullanılabilir son referans gözlemle karşılaştırılır.
Önce yalnız katalog ve önbellekli SCL kapsamı kontrol edilir. Kullanılabilir
aynı çekim çifti değişmemişse yansıtım bantları tekrar işlenmez ve analiz
üretim tarihi yenilenmez. Kontrol zamanı ayrıca `checkedAt` olarak saklanır.

NDVI farkında NIST değiştirilmiş Z puanı `0.6745*(fark−medyan)/MAD` kullanılır.
`|M|>3.5` ve gerçek farkın aynı yönde olması, en az 1 ha dört-komşu bağlı
destekle yalnız inceleme adayı üretir. Sıfır/yetersiz MAD ile puan üretilmez.
Bunlar doğrulanmış hasar, yangın veya ekolojik iyileşme sınıfları değildir.
Mevsim, toprak nemi, tarım ve atmosfer etkileri sınırlamalar arasındadır.
21 günden eski kullanılabilir görüntü güncel katmandan çıkarılır.

`web/public/data/monitoring/status.json` kontrol/çekim zamanlarını ve her
bölgenin ayrı durumunu; `changes.geojson` incelenmemiş aday noktalarını içerir.
Her noktanın alanı bağlı piksellerin alanıdır, zarar görmüş hektar değildir.
Hata yeni bölgesel rasterı yayımlamaz; önceki geçerli dosyalar korunur.

Yayın öncesi `--version-monitor-assets`, PNG dosyalarına gerçek çekim çifti
ve kaynak sürümüyle bağlı isimler verir, URL/hash kayıtlarını günceller ve
tüm çıktıları doğrular. Böylece bir tarayıcı eski JSON ile yeni görüntüyü
yanlış tarihte gösteremez; eski URL'nin dosyası bulunamazsa eksik görüntü
olarak kalır. Bu adım hesaplama veya yeni gözlem uydurmaz.
