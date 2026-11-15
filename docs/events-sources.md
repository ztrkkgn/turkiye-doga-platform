# Türkiye olay kataloğu: kaynak ve konum kayıtları

Son kontrol: **13 Kasım 2026**. Katalog dosyası:
`web/lib/events-catalog.json`.

Bu seçki, Türkiye'deki bütün doğa olaylarını veya bütün zarar görmüş
alanları kapsamaz. Olay kaydı, platform tarafından analiz yapılmış olması
anlamına gelmez. `analysis.status=pending` olan sayfalarda kaynaklarla
belgelenen tarihsel bağlam bulunur; hesaplanmış metrik, örnek uydu
görüntüsü veya uydurulmuş değişim katmanı bulunmaz.

Harita noktaları boylam/enlem sırasındadır ve yalnızca konum bulmayı
kolaylaştırır. Araştırma alanı orta noktası, kule veya göl referansı
olabilirler. Hiçbiri yangın çevresi, tutuşma noktası, su yüzeyi sınırı,
kayıp alan poligonu veya idari sınır yerine kullanılmaz.

Yangınlarda `date` belgelenmiş başlangıç günüdür. Tuz ve Erçek göllerinde
tek bir başlangıç günü olmadığı için `date="2021"` yalnızca dönemi
belirtir. Arayüz bu değeri **1 Ocak 2021** olarak göstermemelidir.

## Marmaris / İçmeler — 2021

- Kimlik ve kalıcı yol: `mugla-marmaris-2021`.
- Olay: **29 Temmuz 2021**. [AFAD'ın 30 Temmuz bülteni](https://mersin.afad.gov.tr/ulke-genelinde-devam-eden-orman-yanginlari-hk-2)
  Armutalan ve İçmeler yangınlarının bu tarihte başladığını açıkça kaydeder.
- Konum: **[28.21, 36.77]**. [Zengin ve Acar (2025), DOI
  10.1007/s41207-025-00850-x](https://doi.org/10.1007/s41207-025-00850-x)
  İçmeler yangın sahası A için yaklaşık merkezi 36.77°N, 28.21°E verir.
  Bu ifade, [yazarın erişilebilir tam metninin Study area bölümünde](https://www.researchgate.net/publication/393323254_Spatial_analysis_of_wildfire_burn_severity_and_urban_exposure_assessment_in_Southwestern_Turkiye)
  önceki pilot çalışmasında kontrol edilmiştir.
- Analiz: mevcut gerçek pilot, `/data/marmaris/summary.json`. 28 Temmuz
  ve 17 Ağustos 2021 çekim zamanları yerel analiz kaydından doğrulandı.
  Sonuçlar yalnızca belgelenmiş pilot penceresine aittir.

## Bördübet — 2022

- Kimlik ve kalıcı yol: `mugla-bordubet-2022`.
- Olay: **21 Haziran 2022**. [OGM Muğla Bölge Müdürlüğünün 21 Haziran
  2023 tarihli kaydı](https://www.ogm.gov.tr/muglaobm/haber-sitesi/Sayfalar/bordubet-kullerinden-doguyor.aspx)
  başlangıcı ve Bördübet/Değirmenyanı sahalarındaki sonraki çalışmaları
  belgeliyor. Kurumun alan toplamı kataloğa bir platform ölçümü olarak
  aktarılmadı.
- Uydu kayıtları için bağımsız özgün çalışma: [Gürbüz (2023), Harita
  Dergisi 170:8–22](https://www.harita.gov.tr/uploads/files/articles/uzaktan-algilama-ile-yangin-siddeti-belirlenmesinde-farkli-indekslerin-karsilastirilmasi-1673.pdf).
  Materyal bölümü, 16/18 Haziran öncesi ve 26/28 Haziran sonrası
  Sentinel-2 gözlemlerini listeler. Yayının sonuçları yeniden hesaplanmış
  gibi sunulmaz.
- Konum: **[28.04, 36.82]**. [Tarım ve Orman Bakanlığı coğrafi referans
  kaydında](https://sanliurfa.tarimorman.gov.tr/Sayfalar/Detay.aspx?Liste=Duyuru&OgeId=518)
  Bördübet Limanı için 36°49′48.60″N, 28°02′17.58″E ve
  36°48′02.70″N, 28°02′33.12″E noktaları bulunur. Yaklaşık işaret bu
  liman referansını gösterir; yangın merkezi olarak yorumlanmaz. Bu kaynak
  burada yalnızca konum doğrulaması için kullanılır.
- Analiz durumu başlangıçta **pending**. Gerçek ürünler okunup kalite
  kontrolleri tamamlanmadan `available` yapılmamalıdır.

## Manavgat — 2021

- Kimlik ve kalıcı yol: `antalya-manavgat-2021`.
- Olay: **28 Temmuz 2021**. [AFAD olay bülteni](https://mersin.afad.gov.tr/ulke-genelinde-devam-eden-orman-yanginlari-hk-2)
  Manavgat'ta aynı gün birden fazla yangın başlangıcını kaydeder.
- Özgün uydu araştırması: [Yılmaz ve diğerleri (2023), Earth Science
  Informatics](https://pmc.ncbi.nlm.nih.gov/articles/PMC9838501/). Bu çalışma
  Manavgat'ı 2021 olayları arasında inceler. Farklı sınır ve tarihlerle
  hesaplanan yayın sonuçları birbiri yerine kullanılmaz.
- Konum: **[31.495, 36.965]**. [Ekberzade ve diğerleri (2025), npj Natural
  Hazards](https://www.nature.com/articles/s44304-025-00120-4), Results
  bölümünün ilk paragrafında inceleme bölgesini 36.86–37.07°N ve
  31.26–31.73°E olarak tanımlar. Nokta bu aralıkların aritmetik orta
  noktasıdır; ölçülmüş yangın merkezi veya tutuşma noktası değildir.
- Kaynak kutusu **[31.26, 36.86, 31.73, 37.07]**, gelecekteki analiz
  penceresi seçimi için dış coğrafi dayanak sağlar. Daha küçük bir pencere
  kullanılırsa ayrıca belgelenmeli; kutunun bütünü yangın poligonu
  sayılmamalıdır. Katalog oluşturulduğunda analiz **pending** durumundadır.

## İzmir / Yamanlar — 2024

- Kimlik ve kalıcı yol: `izmir-yamanlar-2024`.
- Olay: **15 Ağustos 2024**. [İzmir Orman Bölge Müdürlüğünün 26 Eylül
  2024 kaydı](https://www.ogm.gov.tr/izmirobm/haberler/i%CC%87zmir-valisi-dr-sayin-suleyman-elban-karsiyaka-yamanlar%E2%80%99da-cikan-orman-yanginin-ardindan-baslatilan-agaclandirma-calismal)
  bu tarihi açıkça verir. [OGM'nin 18 Ekim 2024 kaydı](https://www.ogm.gov.tr/tr/haberler/yamanlar%E2%80%99da-yangindan-zarar-goren-orman-alanlari-agaclandiriliyor)
  planlanan rehabilitasyonu açıklar. Bu kayıt, başarılı iyileşmenin
  platform tarafından ölçüldüğü anlamına gelmez.
- Konum: **[27.16, 38.55]**. [İzmir İRAP'ın resmî belediye arşivindeki
  kopyası](https://www.buca.bel.tr/uploads/announces/Izmir-IRAP_compressed%20%281%29-s%C4%B1k%C4%B1s%CC%A7t%C4%B1r%C4%B1ld%C4%B1.pdf),
  PDF sayfa 84, Tablo 1.41: Yamanlar Kule için **38°33′08″N,
  27°09′28″E**. Ondalık karşılık yaklaşık 38.552222°N, 27.157778°E;
  katalog iki ondalığa yuvarlar. Bu, bölgenin coğrafi referansıdır.
- Analiz: **pending**; yangın ve iyileşme katmanı üretilmedi.

## Tuz Gölü — 2021

- Kimlik ve kalıcı yol: `tuz-golu-2021`.
- Dönem: **2021**. [NASA Earth Observatory, Disappearing Lake Tuz,
  16 Aralık 2021](https://science.nasa.gov/earth/earth-observatory/disappearing-lake-tuz-149211/)
  9 Ağustos 2021 Landsat 8 gözlemini ve göl yüzey tiplerinin uzun dönemli
  değişimini inceler. Kataloğa flamingo ölümü, alan kaybı veya güncel göl
  yüzölçümü gibi sayılar aktarılmadı.
- Konum: **[33.38, 38.78]**. [Özel Çevre Koruma Kurumu Başkanlığının
  2010 habitat izleme raporunda](https://webdosya.csb.gov.tr/db/destek/icerikler/tuz_golu_hab-tat_izleme_f-nal_raporu_22.12.2010-20191127153615.pdf)
  2. Tuz Gölü istasyonu **38°47′N, 33°23′E** olarak verilir (Harita 7,
  basılı s.133). Ondalık değerler 38.783333°N, 33.383333°E; katalog
  yaklaşık gösterim için yuvarlar. Raporun koordinat satırı web aramasının
  kaynak metninden kontrol edildi; doğrudan PDF açılışı araçta zaman
  aşımına uğradı. Bu istasyon, 2021 su yüzeyinin merkezini göstermez.
- Göl Konya, Ankara ve Aksaray ile ilişkilidir; tek bir ilin bütün göle
  sahip olduğu izlenimi verilmez. Analiz **pending**; mevsim ve tuz
  yüzeyleri dikkate alınmadan su alanı sonucu verilmez.

## Erçek Gölü — 2021

- Kimlik ve kalıcı yol: `van-ercek-2021`.
- Dönem: **2021**. [Demir (2023), Ahi Ziraat Dergisi 3(1):22–36](https://dergipark.org.tr/tr/download/article-file/2829383),
  bölüm 3.13, basılı s.32: saha ve anket çalışması, 2021 kuraklığındaki
  su seviyesi düşüşünün doğal tekne barınma yerini etkilediğini bildirir.
- [TBMM 29 Aralık 2023 Van çalışma ziyareti tutanağı](https://www.tbmm.gov.tr/Tutanaklar/TutanakGoster/3213),
  basılı s.7: Van İl Tarım ve Orman Müdürlüğü yetkilisi Erçek'teki
  çekilmeyi ve 2021 kuraklığı bağlamını doğrudan aktarır. Kurum gözlemi,
  platformun uydu ölçümü olarak sunulmaz.
- Konum: **[43.58, 38.68]**. [Küçük ve Şen (2023), Erçek Gölünün
  Paleolimnolojik İncelemesi](https://acikerisim.karatay.edu.tr/yayinaea/icar-congre-ozet-kitabi_6633581957d1e.pdf),
  12. Uluslararası Akademik Araştırmalar Kongresi özet kitabı, basılı
  s.145: **38°40′33″N, 43°34′44″E**. Ondalık karşılık yaklaşık
  38.675833°N, 43.578889°E; katalog iki ondalığa yuvarlar. Kitap tam metni
  açılarak bu satır doğrulandı. Konum kaynağı olarak yalnızca gölün yerini
  gösterir; 2021 çekilme iddiasının dayanağı değildir.
- Analiz: **pending**. Gölün tamamen kuruduğu, su kaybının tek bir nedeni
  olduğu veya başka bir gölün kayıp miktarının burada geçerli olduğu
  iddia edilmez.

## Durumların güncellenmesi

`available` işareti için ilgili `summary.json` ve tüm görüntü/katman
dosyalarının gerçekten üretilmesi ve doğrulamadan geçmesi gerekir.
Kaynak kaydı eklenmesi tek başına bu işareti değiştirmez. Yeni analiz
eklendiğinde öyküdeki “henüz hazırlanmadı” ifadesi de gerçek kapsama göre
güncellenmelidir. Kaynaklardaki gözlem ve yayımlanma tarihleri
birbirinden ayrılır; güncel durum geçmiş haberlerden türetilmez.
