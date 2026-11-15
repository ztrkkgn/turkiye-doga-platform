# Manavgat 2021 · gerçek ikinci pilot

## Coğrafi ve tarihsel dayanak

[Ekberzade ve diğerleri (2025), npj Natural Hazards](https://www.nature.com/articles/s44304-025-00120-4)
Results bölümünde incelenen Manavgat yangın bölgesini 31.26–31.73°E ve
36.86–37.07°N aralığında verir; olayın başlangıcı 28 Temmuz 2021 olarak
belgelenir. Bu kaynak olay ve coğrafi bağlam içindir. Yayının alan veya
şiddet sonuçları platformun kendi ölçümleri gibi aktarılmaz.

Platformun küçük çalışma penceresi **[31.40,36.86,31.55,36.98]**, bu
yayımlanmış alanın güneyindeki alt kesittir. Resmî yangın çevresi veya
bütün Manavgat için temsilî bir örnek değildir. Bu pencere sonuç büyüklüğü
aranarak seçilmedi. Sentinel karesi **36SUF**, analiz gridi **EPSG:32636,
20 m**; web PNG'leri ortak EPSG:3857 gösterim gridindedir.

## Gerçek gözlem çifti ve sonuç

- Önce: **25 Temmuz 2021**, `S2A_T36SUF_20210725T084120_L2A`.
- Sonra: **14 Ağustos 2021**, `S2A_T36SUF_20210814T084312_L2A`.
- Her iki gözlem Sentinel-2 **Collection 1 L2A** açık COG arşivinden okundu.
- Ortak geçerli piksel: **327.249**, çalışma penceresinin yaklaşık **%73,57**'si.
- Ortak destekte ortalama NDVI: önce **0,532526**, sonra **0,246301**.
- Ortalama **ΔNDVI −0,286224**, **dNBR 0,509561**.

Bu değerler gerçek bantlardan hesaplanmıştır; ağaç kaybı yüzdesi veya
saha kalibrasyonlu hasar sınıfı değildir. 130,8996 km² ortak geçerli destek,
yanan alan toplamı değildir. SCL4/5 filtresi karanlık veya belirsiz etiketli
yanık yüzeyleri dışlayabilir. Pencere değişmemiş yüzeyleri de içerir.

Yöntem Marmaris ile aynıdır: bant başına scale/offset; 10 m yansıtımları
20 m'ye alan ortalaması; SCL en yakın komşu; 60 m bulut/gölge tamponu;
iki tarihin ortak maskesi. Medyan kompozit veya yıllık toparlanma serisi
üretilmedi. Tam metadata, kaynak URL ve checksum kayıtları
`web/public/data/manavgat/provenance.json` içindedir.

## Yeniden üretim

```sh
doga run --config data/regions/antalya-manavgat-2021.json
python tools/validate_outputs.py --region manavgat
```

`--refresh` kullanılmadığında ilk seçilmiş aynı gerçek ürünler tekrar
okunur. Konfigürasyon, kaynak kodu ve varlık SHA256'ları doğrulanır.

Güncel bölgesel izleme bu tarihsel çiftin devamı diye sunulmaz. Ayrı
`monitor-manavgat` penceresi, güncel yakın tarihli iki gözlemi karşılaştırır;
güncel farklar otomatik olarak 2021 yangınına bağlanamaz.
