# Marmaris 2021: bilimsel dayanaklar ve yöntem kararları

Kaynak erişim tarihi: 6 Kasım 2026. Aşağıdaki kaynaklar olay ve yöntem
seçimini destekler; platformun ürettiği ölçümler bu yayınlardan alınmış
sonuçlar değildir. Kaynaklardaki yanan alan toplamları bizim küçük çalışma
penceremizin istatistikleriyle doğrudan karşılaştırılamaz.

## Olay ve çalışma alanı

- [AFAD, 30 Temmuz 2021 tarihli resmi basın bülteni](https://mersin.afad.gov.tr/ulke-genelinde-devam-eden-orman-yanginlari-hk-2):
  Marmaris'in Armutalan ve İçmeler mahallelerindeki yangınların başlangıcı
  29 Temmuz 2021 olarak bildirilir. İçmeler'in olayla ve tarihle ilişkisi
  için esas alınan birincil resmi kayıttır.
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

### İçmeler çalışma penceresinin coğrafi dayanağı

[Zengin ve Acar (2025), *Spatial analysis of wildfire burn severity and urban exposure assessment in Southwestern Türkiye*](https://link.springer.com/article/10.1007/s41207-025-00850-x),
DOI **10.1007/s41207-025-00850-x**, 2021 yangınları için incelediği
İçmeler sahası A'nın yaklaşık yangın merkezini **36.77° kuzey,
28.21° doğu** olarak verir. Koordinatlar, yazar Enes Zengin'in yüklediği
[erişilebilir tam metnin “Study area” bölümünde](https://www.researchgate.net/publication/393323254_Spatial_analysis_of_wildfire_burn_severity_and_urban_exposure_assessment_in_Southwestern_Turkiye)
kontrol edilmiştir. Bu nokta bir yaklaşık merkezdir; sınır poligonu veya
yerleşimin resmi merkezi değildir. Yayının hesaplama yöntemi ve alan
toplamları platforma aktarılmaz; burada yalnızca olayın coğrafi konumunu
belirlemek için kullanılır.

MVP çalışma penceresi (GeoJSON sırası boylam, enlem): batı **28.15**,
güney **36.74**, doğu **28.32**, kuzey **36.86**. Bu sınırlı dikdörtgen,
referanstaki yangın merkezini ve İçmeler çevresindeki farklı arazi
örtülerini birlikte kapsamak için seçilmiştir. Köşeleri yayın tarafından
verilmiş bir yangın sınırı değildir. Kutunun tamamının yandığı, yangının
tamamını kapsadığı veya tüm Marmaris'i temsil ettiği iddia edilmez.
Çalışma gridi **EPSG:32635 (UTM 35N), 20 m**; hedef Sentinel-2 karesi
**35SPA**.

İlk veri erişim denemesinde kullanılan `[28.20, 36.85, 28.32, 36.95]`
penceresi Marmaris'in kuzeyinde kalıyordu. Coğrafi kaynak kontrolünden
sonra yukarıdaki İçmeler penceresine geçildi. Eski pencere yangının
etkisi veya iyileşmesi hakkında bir sonuç olarak kullanılmadı. Yeni
çerçeve bir dNBR/NDVI eşiğini ya da istenen büyüklükte bir sonucu
yakalamak için seçilmedi; dış kaynakta belgelenen konuma göre düzeltildi.

AFAD'ın 29 Temmuz başlangıç kaydı, **28 Temmuz 2021** gözleminin olay
öncesi olarak kullanılmasını destekler. **17 Ağustos 2021** gözlemi
sonraki durumun incelenmesi için seçilmiştir; gerçek STAC çekim zamanları
ürün kayıtlarında saklanır. TÜBA kitabının Marmaris bölümünde başlangıç
için 28 Temmuz yazılması AFAD ve KTÜ kayıtlarıyla çelişir; olay tarihi
için AFAD kaydı esas alınır. Yayınlardan tarihler ayrım gözetmeden
birleştirilmez.

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
  bazı COG dosyalarında ofset dönüşüm sırasında uygulanmıştır. Bununla
  birlikte aşağıdaki sağlayıcı hata kayıtları nedeniyle eski koleksiyonda
  yalnız `raster:bands` metadatasına güvenilmez.
- [Element 84, sağlayıcının koleksiyon ayrımı açıklaması, #41](https://github.com/Element84/earth-search/issues/41):
  katkıcı açıklamasına göre eski `sentinel-2-l2a` koleksiyonunda
  `earthsearch:boa_offset_applied=true` ise COG için yalnız ölçek uygulanır.
  `sentinel-2-c1-l2a` koleksiyonunda ise `DN*scale+offset` uygulanır.
  JPEG2000 kaynak varlıklarıyla COG varlıklarının aynı kodlamada olduğu
  varsayılmaz. Bu ayrım dosya uzantısı ve koleksiyonla birlikte ele alınır.
- [Element 84, ofset metadata hatası, #9](https://github.com/Element84/earth-search/issues/9)
  sağlayıcı katkıcısı eski COG'larda uygulanmış ofsetin asset metadata
  alanında yine de `-0.1` kalabildiğini doğrular.
  [#66 hata kaydı](https://github.com/Element84/earth-search/issues/66)
  bazı eski koleksiyon ürünlerinde `false` bayrağının da hatalı olabildiğini
  gösterir. Bu nedenle fiziksel kontrolü geçmeyen ürünlerde ofset tahmin
  edilmez; işleme durdurulur veya doğrulanmış başka koleksiyona geçilir.

Özgün ESA ürün kimliği, STAC kimliği, koleksiyon, kaynak asset URL'leri,
bildirilen ve gerçekten uygulanan scale/offset değerleri ile dönüşüm
kararının dayanağı provenance kaydında tutulmalıdır. Geçerli kara
piksellerinde negatif yansıtım ya da `[-1,1]` dışında normalize indeksler
görülmesi kalibrasyon incelemesi gerektirir. Yanlış radyometriyi maskelemek
için sonuçlar bu aralığa kırpılmaz. Dosya boyutu/okuma başarısı tek başına
bilimsel doğrulama sayılmaz.

**MVP kararı:** Analiz için sağlayıcının yeni **`sentinel-2-c1-l2a`**
koleksiyonu kullanılır. Eski `sentinel-2-l2a` koleksiyonu katalog erişim
denemesinde görülebilir, ancak analiz girdisi olarak kabul edilmez. İlk
gerçek veri kontrolünde eski koleksiyonun uygulanmış ofset ile çelişen
asset metadatası normalize indislerde fiziksel aralık dışında değerler
üretti; bu çıktı bilimsel sonuç olarak kullanılmadı. Çözüm, indeksi
kırpmak veya tahmini ofset seçmek yerine koleksiyonu değiştirmektir.
Eski koleksiyona ait kayıtlı ürün seçimi yeni analiz için yeniden
kullanılmamalıdır.

## Bulut, gölge ve veri yeterliliği

[Copernicus SCL sınıf açıklamaları](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html)
uyarınca bulut/gölge/geçersiz sınıflar dışlanır. İlk kara analizi için
yalnızca `4=vegetation` ve `5=bare soil` kabul edilmesi muhafazakâr bir
tasarım seçimidir; resmi bir evrensel maske standardı değildir. Böylece
`0,1,2,3,6,7,8,9,10,11` elenir. Yanmış piksellerin yanlış SCL etiketi
alması ölçüm kapsamını azaltabilir; geçerli piksel oranı açıkça verilir.
SCL kusursuz değildir ve dumanın tamamını yakalama garantisi vermez.

SCL `3,8,9,10,11` sınıfları çevresine 20 m gridde **60 m yarıçaplı
disk tamponu** uygulanır. Pencere dışında kalan yakın bulut ve gölgeleri
de hesaba katmak için SCL, çalışma penceresinin çevresinde üç piksellik
ek şeritle okunur; tampon uygulandıktan sonra pencereye kırpılır.

### Gerçek renk görüntüsü ile analiz maskesinin farkı

Önce/sonra gerçek renk görüntüleri B04, B03 ve B02 yansıtımlarından
üretilir. Görsel bağlam için SCL `2,4,5,6,7` sınıfları kabul edilir:
karanlık yüzey, bitki örtüsü, çıplak toprak, su ve belirsiz sınıf. Böylece
su ve koyu görünen yüzeyler de gözlem görüntüsünde incelenebilir.
SCL 2 veya 7 görülmesi tek başına yanmış alan tespiti değildir.

NDVI, NBR ve değişim istatistikleri ise yalnızca **SCL 4/5** koşulunu ve
radyometri kontrollerini geçen pikselleri kullanır. Dolayısıyla renkli
görüntüde görünen bir su veya karanlık yüzey, metrik hesabına katılmış
olmayabilir. İki maske de aynı bulut/gölge/kar tamponunu kullanır. Görsel
için geçersiz ya da kaynaktan okunamayan pikseller şeffaf bırakılır.

İki tarihe aynı sabit `0–0.30` yansıtım aralığı ve `1.8` gamma değeriyle
görsel dönüşüm uygulanır; her görüntüye ayrı otomatik kontrast ayarı
yapılmaz. Ekran renkleri görselleştirme içindir; sayısal metrikler bu
renklerden değil, yansıtım bantlarından hesaplanır.

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
