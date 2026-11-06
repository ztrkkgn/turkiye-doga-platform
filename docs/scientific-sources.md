# Marmaris 2021: bilimsel dayanaklar ve yöntem kararları

Kaynak erişim tarihi: 6 Kasım 2026. Aşağıdaki kaynaklar olay ve yöntem
seçimini destekler; platformun ürettiği ölçümler bu yayınlardan alınmış
sonuçlar değildir. Kaynaklardaki yanan alan toplamları bizim küçük çalışma
penceremizin istatistikleriyle doğrudan karşılaştırılamaz.

## Olay ve çalışma alanı

- [ESA, *Smoke billows from fires in Turkey*, 2 Ağustos 2021](https://www.esa.int/ESA_Multimedia/Images/2021/08/Smoke_billows_from_fires_in_Turkey):
  30 Temmuz 2021 tarihli Sentinel-3 gözlemi güney kıyılarındaki yangınları
  belgeler; metinde Marmaris de anılır. Bu bölgesel görüntü yangın sınırı
  veya Sentinel-2 analiz girdisi değildir.
- [KTÜ, Coşkuner ve diğerleri, *2021 Yılı Büyük Marmaris-Armutalan Yangını Örneği*](https://avesis.ktu.edu.tr/yayin/e2d42803-409b-48bb-af96-7d2835c9e919/orman-yanginlarinin-uzaktan-algilama-teknikleri-ve-karar-destek-sistemleri-ile-analizi-2021-yili-buyuk-marmaris-armutalan-yangini-ornegi):
  özgün araştırmanın kurumsal özeti, başlangıcı 29 Temmuz 2021 ve yeri
  Armutalan olarak verir; 28 Temmuz ve 7 Ağustos Sentinel-2 gözlemlerini
  kullanır. Bu tarihler ilk veri araması için makul referanstır. Kurumsal
  kayıt bu çalışmayı yayımlanmamış konferans bildirisi olarak listeler.
- [TÜBA, Kavzoğlu ve diğerleri, DOI: 10.53478/TUBA.2021.048](https://tuba.gov.tr/tr/yayinlar/suresiz-yayinlar/bilim-ve-dusunce/orman-yanginlari-sebepleri-etkileri-izlenmesi-alinmasi-gereken-onlemler-ve-rehabilitasyon-faaliyetleri/uzaktan-algilama-teknolojileri-ile-orman-yanginlarinin-zamansal-analizi-2021-yili-akdeniz-ve-ege-yanginlari):
  Marmaris dahil 2021 yangınlarının çok tarihli Sentinel-2 verileriyle
  incelenmesini ve NDVI/NBR kullanımını destekleyen özgün araştırma.

İlk pilot, yapılandırmada koordinatları açıkça belirtilen **dikdörtgen bir
çalışma penceresidir**. Çerçeve, resmi yangın sınırı, orman sınırı veya idari
sınır değildir. Karışık arazi örtüsü ve yangından etkilenmemiş pikseller
içerebilir. Sonuçların kapsamı yalnızca bu penceredir. Kaynak incelemesinde
yetkili bir kurumdan indirilebilir, doğrulanmış 2021 Marmaris yangın
poligonu elde edilmedi; böyle bir sınır varmış gibi davranılmamalıdır.

## Sentinel-2 çözünürlük ve radyometri

- [Copernicus Data Space, Sentinel-2 L2A bantları ve birimleri](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html):
  B04 ve B08 10 m; B8A, B12 ve SCL 20 m'dir. MVP'nin 20 m ortak grid
  kullanması, NBR'yi yapay biçimde 10 m çözünürlükteymiş gibi sunmayı
  önler. Kategorik SCL en yakın komşuyla, sürekli yansıtım uygun sürekli
  yeniden örnekleme ile ortak CRS, dönüşüm ve şekle getirilmelidir.
- [ESA, Sentinel-2 L2A Data Quality Report, Nisan 2023](https://sentinels.copernicus.eu/documents/d/sentinel/ompc-cs-dqr-002-03-2023-i60r0-msi-l2a-dqr-april-2023):
  baseline 04.00 ile kaynak DN değerlerine radyometrik ofset eklenmiştir.
  Kaynak ürün yansıtımı `(DN + BOA_ADD_OFFSET) / QUANTIFICATION_VALUE`
  ile elde edilir; `DN=0` önce NoData olarak elenir. Ürün metadata bilgisi
  esas alınır; yalnızca çekim yılına bakarak ofset seçilmez.
- [Copernicus Data Space, L2A processing baselines](https://documentation.dataspace.copernicus.eu/Data/Others/Sentinel2_L2A_baseline.html):
  tarihsel arşiv yeniden işlendiği için 2021 çekimleri de yeni baseline
  ile bulunabilir. Çekim tarihi ve işleme baseline'ı ayrı saklanmalıdır.
- [Element 84, Earth Search Sentinel-2 koleksiyon notları](https://github.com/Element84/earth-search/blob/main/docs/collections/sentinel-2-l2a.md):
  bazı COG dosyalarında ofset dönüşüm sırasında uygulanmıştır. Asset
  `raster:bands` içindeki `scale` ve `offset` kullanılır:
  `reflectance = DN * scale + offset`. Aynı ofset ikinci kez uygulanmaz.
  Özgün ESA ürün kimliği, STAC kimliği, kaynak asset URL'leri, scale ve
  offset değerleri analiz provenance kaydında tutulmalıdır.

## Bulut, gölge ve veri yeterliliği

[Copernicus SCL sınıf açıklamaları](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html)
uyarınca bulut/gölge/geçersiz sınıflar dışlanır. İlk kara analizi için
yalnızca `4=vegetation` ve `5=bare soil` kabul edilmesi muhafazakâr bir
tasarım seçimidir; resmi bir evrensel maske standardı değildir. Böylece
`0,1,2,3,6,7,8,9,10,11` elenir. Yanmış piksellerin yanlış SCL etiketi
alması ölçüm kapsamını azaltabilir; geçerli piksel oranı açıkça verilir.
SCL kusursuz değildir ve dumanın tamamını yakalama garantisi vermez.

[Copernicus mozaik algoritması](https://documentation.dataspace.copernicus.eu/Data/Others/Sentinel2_Mosaic_Algorithm.html)
bulut ve gölge sınıflarının elenmesini ve piksel bazında gözlem sayısının
tutulmasını örnekler. Platformun algoritması bu mozaikle aynı değildir:
zaman penceresi, bileşik yöntemi ve minimum gözlem sayısı ayrıca
belgelenmelidir. Aynı gün farklı işleme sürümleri bağımsız gözlem sayılmaz.

## Metriklerin yorumu

`NDVI=(B08-B04)/(B08+B04)`, `NBR=(B8A-B12)/(B8A+B12)`,
`dNBR=NBR_önce-NBR_sonra`. Sıfır veya sayısal olarak kararsız payda,
NoData ve geçersiz pikseller sonuç üretmez.

[Yılmaz ve diğerleri, 2023, özgün araştırma](https://pmc.ncbi.nlm.nih.gov/articles/PMC9838501/)
Marmaris dahil 2021 olaylarında NDVI/NBR ve zaman serisi kullanımını
destekler. Yerel arazi kontrolü olmadan literatürdeki hasar eşikleri
otomatik olarak aktarılmaz. İlk çıktı **sürekli dNBR değişimi** olarak
yayımlanır; sınıflanmış yangın şiddeti, kesin yanan alan veya ağaç kaybı
hesabı yapılmaz. Mevsim, toprak nemi, topoğrafya ve gözlem geometrisi
etkileri ayrıca değerlendirilmelidir.

Yıllık karşılaştırmalarda benzer mevsim pencereleri ve sabit ortak piksel
maskesi gerekir. Yıllara göre değişen geçerli piksel kümelerinin ortalaması
tek başına toparlanma eğilimi sayılmaz. NDVI artışı ağaç sayısı, hayatta
kalma oranı, biyolojik çeşitlilik veya ormanın bütünüyle geri dönmesi
anlamına gelmez.

## Açık veri ve atıf

[AWS Open Data Registry, Sentinel-2 COGs](https://registry.opendata.aws/sentinel-2-l2a-cogs/)
verinin Sentinel-2 ürünlerinden dönüştürülmüş COG olduğunu, açık erişimi ve
hesapsız okuma olanağını belgeler. Earth Search en iyi çaba esasına göre
sunulur; servis garantisi yoktur. CDSE katalog erişimi ile bu açık COG
ayna erişimi farklı sağlayıcılardır ve arayüzde ayrı belirtilmelidir.

Türetilmiş görüntülerde `Contains modified Copernicus Sentinel data
(2021)` atfı, erişim sağlayıcısı ve gerçek çekim tarihleri gösterilir.
2022–2026 çıktıları üretildiğinde ilgili yıllar atfa eklenir. Altlık
haritanın atfı ayrıca korunur.
