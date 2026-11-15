# Güncel uydu izleme: yöntem incelemesi

İnceleme tarihi: **13 Kasım 2026**.

Bu belge, seçilmiş olay pencerelerinde yeni Sentinel-2 gözlemlerinden
**incelenmeye değer spektral değişim adayları** üretmek için kullanılan ilk
tarama yaklaşımını açıklar. Türkiye'nin tamamı taranmıyor. Yöntem saha
verisiyle doğrulanmış bir afet, orman kaybı veya restorasyon başarı modeli
değildir. Kaynaklarla belgelenmiş bir olayın kataloğa eklenmesi, o bölgenin
güncel uydu analizinin de tamamlandığı anlamına gelmez.

## 1. Karşılaştırılan veri

Çalıştırma referans zamanına göre son **0–14 gün** içindeki gözlemler,
önceki **15–42 gün** içindeki referans gözlemlerle karşılaştırılır. Bunlar
operasyonel arama pencereleridir; aynı mevsime ait yıllık bir klimatoloji
veya olayın nedenini açıklayan bir kontrol grubu değildir. Tarih sınırları,
saat dilimi ve gerçekten seçilen ürünlerin çekim zamanları kaydedilmelidir.

İki dönemde de aynı C1 koleksiyonu, yansıtım kodlaması, 20 m ortak grid,
bulut/gölge tamponu ve analitik SCL maskesi kullanılır. Piksel farkı
**yalnızca iki dönemde de geçerli ortak kara piksellerinden** üretilir:

```text
deltaNDVI[p] = NDVI_latest[p] - NDVI_reference[p]
```

Kullanılan çıktı tekil iki görüntüyse bu açıkça belirtilir. Zaman penceresi
bulunması, medyan kompozit üretildiği anlamına gelmez. Kompozit üretildiği
durumda yöntem, ürün listesi, piksel başına geçerli gözlem sayısı ve minimum
gözlem koşulu ayrıca kaydedilir. Aynı çekimin farklı yeniden işleme
sürümleri bağımsız gözlem sayılmaz.

Eksik veya bulutlu dönemler önceki tarihlerin görüntüleriyle sessizce
doldurulmaz. Yetersiz kapsama, veri yokluğu ve eski görüntü birbirinden
ayrı durumlar olarak gösterilir. Gerçek renk RGB görüntüsü bağlam içindir;
istatistik ekranın renklerinden değil, yansıtım bantlarından hesaplanır.

## 2. İstatistiksel dayanak ve uygulama sınırı

[NIST/SEMATECH el kitabı, Detection of Outliers](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm),
Iglewicz ve Hoaglin'in değiştirilmiş Z puanını ve `|M| > 3.5` değerlerinin
potansiyel aykırı gözlem olarak işaretlenmesini aktarır. Burada `m`,
örneklemin medyanıdır:

```text
m   = median(deltaNDVI[common_valid])
MAD = median(abs(deltaNDVI[common_valid] - m))
M[p] = 0.6745 * (deltaNDVI[p] - m) / MAD
```

[NIST'in MAD tanımı](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/mad.htm)
aynı mutlak sapma medyanını verir; `MAD / 0.6745` normal dağılım altında
standart sapmaya yakın ölçek olarak yorumlanır. Ölçek bir kez uygulanır:
ham MAD ile `0.6745` çarpanı birlikte kullanılır; önceden normalize edilmiş
MAD'ye bu çarpan ikinci kez eklenmez.

NIST kaynağı genel, tek değişkenli aykırı gözlem etiketleme yaklaşımıdır;
bu uygulamadaki NDVI dağılımını veya uzaktan algılama başarısını doğrulamaz.
El kitabının tartıştığı yaklaşık normal dağılım varsayımı, karışık arazi
örtüsündeki NDVI farkları için kendiliğinden sağlanmış sayılmaz.
Bu projede formülün piksel farklarına aktarılması bir **ilk tarama
uyarlamasıdır**. `3.5`, ekolojik zarar eşiği veya belirli bir yanlış alarm
olasılığı olarak sunulmaz.

## 3. Aday işaretlerin anlamı

Yönlerin fiziksel işareti korunmalıdır:

```text
azalış adayı: M[p] < -3.5 ve deltaNDVI[p] < 0
artış adayı:  M[p] >  3.5 ve deltaNDVI[p] > 0
```

İkinci koşul önemlidir: bölgenin genel medyanı pozitifken göreli olarak
düşük bir değer hâlâ pozitif olabilir; bu piksele “azalış” denmemelidir.
Benzer şekilde, genel medyan negatifken diğerlerinden daha az negatif bir
piksel gerçek bir artış değildir.

Yan yana aday piksellerin kümelenmesi ve çok küçük kümelerin haritadaki
işaretlerden çıkarılması, gürültüyü ve görsel kalabalığı sınırlayan
**operasyonel filtrelerdir**. Bağlılık kuralı, minimum piksel sayısı, 20 m
piksel boyutu ve işaret sayısı sınırı metadata'da açıklanır. Bunlar
literatürden doğrulanmış minimum zarar alanı sayılmaz. Bir kümenin alansal
büyüklüğü, doğrulanmış tahribat alanı olarak adlandırılmaz.

Harita noktası bir kümeyi temsil ediyorsa bunun temsil konumu olduğu
belirtilir; olayın başlangıcı veya kesin sınırı değildir. Mümkünse temsil
noktası kümenin geçerli piksellerinden seçilir. Gösterim sınırı nedeniyle
gizlenen ek kümeler varsa bu bilgi saklanır; haritadaki az sayıdaki işaret
bütün adayların sayısıymış gibi sunulmaz.

İnceleme anındaki ilk uygulamanın varsayılanları: `|M| > 3.5`, dört
komşulukla bağlı kümeler, en az **1 ha** piksel desteği (20 m gridde
25 piksel) ve en fazla **50** gösterilen adaydır. Küme noktası piksel
merkezlerinin ortalama konumudur. Karmaşık bir kümede bu konumun geçerli
bir piksele denk gelmesi garanti değildir; sınır veya doğrulanmış ölçüm
noktası olarak kullanılmamalıdır. Alan ve aday sınırları yerel saha
doğrulamasından türetilmiş parametreler değildir.

## 4. MAD ve veri yeterliliği korumaları

- Ortak geçerli piksel yoksa, veri yetersizse veya dağılımın ölçeği
  hesaplanamıyorsa aday puanı üretilmez.
- `MAD = 0`, sonlu olmayan MAD veya yapılandırılmış alt toleransın
  altındaki MAD, **ölçek kararsız / puanlanamadı** durumu oluşturur.
  Paydada sessizce küçük bir epsilon kullanıp yüksek puanlar üretilmez.
- NIST kaynağı NDVI için evrensel bir küçük-MAD gürültü eşiği vermez.
  Kodda kullanılan sayısal tolerans ya da muhafazakâr alt sınırın değeri ve
  gerekçesi açık tutulur. Böyle bir koruma doğrulanmış bir sensör gürültü
  modeli veya ekolojik eşik diye sunulamaz. Gerçek gürültü tabanını
  belirlemek için değişmediği bilinen alanlarda tekrar gözlemler gerekir.
- NDVI/NBR fiziksel aralık, yansıtım kodlaması ve ortak grid kontrolleri
  geçmeden istatistik çalıştırılmaz. Yanlış radyometriyi düzeltmek için
  indisler `[-1,1]` aralığına kırpılmaz.
- Puanlanamayan veya yetersiz veri durumu “değişim yok” değildir. Önceki
  başarılı görüntü korunursa eski çekim tarihi ve son denemenin sonucu
  birlikte gösterilir.

İlk uygulamadaki `mad_tolerance=1e-6`, sayısal sıfıra bölme/kararsızlık
korumasıdır; doğrulanmış NDVI gürültü tabanı değildir. Bu sınırın üstünde
kalan küçük sapmaların her birinin fiziksel değişim olduğu varsayılmaz.

## 5. Bu ilk taramanın tespit edemeyecekleri

Bu bölüm, yöntemin bu uygulamadaki matematiksel ve coğrafi sonuçlarına
ilişkin değerlendirmedir; NIST tarafından doğrulanmış NDVI performans
iddiaları değildir.

1. **Alan genelindeki değişim:** bütün pikseller benzer miktarda azalırsa
   medyan da azalır. Medyandan sapma küçük kalabilir; büyük bir ortak
   değişim işaretlenmeyebilir. Bu nedenle ortak maske üzerinde ham NDVI
   farkı, medyan/ortalama ve renkli değişim katmanı da korunmalıdır.
2. **Karışık arazi örtüsü:** orman, tarım ve çıplak toprağın doğal değişim
   dağılımları farklıdır. Tek bir bölge dağılımı çok tepeli veya çarpık
   olabilir; sıra dışı değer, yalnızca farklı arazi sınıfına ait olabilir.
3. **Mekânsal bağımlılık:** komşu pikseller, yeniden örnekleme ve yüzey
   yapısı nedeniyle bağımsız değildir. Binlerce puanın taranması ve sabit
   eşik kullanılması, bir anlamlılık testi veya hata oranı denetimi değildir.
4. **Mevsim ve hava:** yakın haftalar arasındaki hasat, yaprak dökümü,
   yağışla yeşerme, kuraklık, nem, görüş geometrisi, duman veya kalıntı
   bulutlar aday üretebilir. Topografik ve SCL hataları da kümelenebilir.
5. **İyileşme yorumu:** pozitif NDVI farkı, bitki örtüsünün spektral
   artışıdır. Ağaçların hayatta kalma oranı, ormanın geri dönmesi veya
   restorasyon başarısı değildir. Negatif fark da tek başına yangın,
   kesim, suç veya değişimin sebebini kanıtlamaz.

İlk sürümün doğru etiketi: **“Otomatik spektral değişim adayı ·
incelenmeli”**. “Doğrulanmış tahribat”, “orman tamamen iyileşti”, “AI ile
kesin tespit” veya doğruluk yüzdesi kullanılmaz.

## 6. Gerçek doğrulama için gerekli çalışma

Kodun hesaplama testlerini geçmesi ile bir algılama modelinin saha
doğrulaması aynı şey değildir. Performans değerlendirmesinde şu ayrım
korunmalıdır:

- Sentetik diziler: fark işaretleri, MAD=0 koruması, NaN/NoData, ortak
  maske, kümelerin filtrelenmesi ve temsil noktalarının doğruluğu.
- Gerçek tekrar gözlemler: sakin alanlar, bulut/duman kalıntıları,
  mevsimsel değişimler ve dış kaynaklarla belgelenmiş değişim olayları.
- Bağımsız değerlendirme: eşik seçiminde kullanılmamış tarih/alanlar;
  doğru ve yanlış adaylar, atlanan değişimler, veri bulunamayan alanlar.

Bu değerlendirme tamamlanmadan `3.5` ve küme filtresi için NDVI'ya özgü
duyarlılık, özgüllük veya başarı oranı iddia edilmez. Zaman serisi,
mevsimsel referans ve bağımsız değişmediği bilinen alanlar sonraki bilimsel
iyileştirmeler olarak değerlendirilebilir; ilk tarama bunların yerini almaz.

## 7. Günlük kontrol ile görüntü tazeliği farklıdır

[ESA'nın Sentinel-2 ürün teknik belgesi (15.1)](https://sentinels.copernicus.eu/documents/d/sentinel/sentinel-2-products-specification-document-15_1)
ikili uydu takımı için nominal beş günlük yer izi tekrarını açıklar.
[Sentinel-2 ürün açıklaması](https://sentinels.copernicus.eu/sentinel-data-access/sentinel-products/sentinel-2-data-products/collection-0-level-2a)
da tekrar ziyaret sıklığını açıklar. Örtüşme
bazı konumlarda daha sık gözleme izin verebilir; bulut, gölge ve veri
erişimi kullanılabilir gözlem aralığını uzatabilir.

[Earth Search sağlayıcısı](https://github.com/Element84/earth-search)
kamu API'sini hizmet garantisi olmadan sunar. ESA ürününün oluşması,
koleksiyona indekslenmesi, güvenli biçimde okunabilmesi ve bizim kalite
kontrolümüzü geçmesi ayrı aşamalardır. Bu yüzden kullanıcıya **“her gün
yeni görüntü”** sözü verilmez. Doğru ifade **“yeni uygun veri için günlük
kontrol”**dür; yanında son kontrol, son başarılı analiz ve gerçek çekim
tarihleri bulunur.

## 8. Ücretsiz zamanlama koşulları

[GitHub Actions tetikleme dokümanı](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
uyarınca zamanlanmış işler varsayılan olarak UTC kullanır; son varsayılan
dal commit'i üzerinde çalışır. Güncel doküman isteğe bağlı IANA saat
dilimini de destekler. UTC seçilirse İstanbul gösterim saati ayrıca
açıklanabilir; UTC+3 için örneğin 03:23 UTC, 06:23 İstanbul'dur.

Aynı kaynak, yoğunlukta gecikme ve kuyruktaki işlerin düşmesi olasılığını,
saat başından uzak dakika seçilmesini ve public repolarda 60 gün etkinlik
olmadığında schedule'ın devre dışı kalmasını açıklar. Bu düzen bir çalışma
saati veya kesintisiz hizmet garantisi değildir. Manuel çalıştırma ve
sonuç/tazelik kaydı, başarısız denemelerin izlenmesini sağlamalıdır.

[GitHub'ın güncel ücretlendirme belgesi](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
public repolardaki **standart GitHub-hosted runner** kullanımını ücretsiz
olarak listeler. Larger runner'lar ücretlidir; artifact/cache depolama
hakları ayrıca sınırlıdır. Private repo için hesabın güncel hesaplama ve
depolama hakları geçerlidir. Ücretsiz hedef, küçük seçili pencereler ve
standart Linux runner ile sınırlı tutulmalı; büyük ham rasterlar veya her
gün büyüyen arşivler Git'e eklenmemelidir.

Bu belge yalnızca yöntem ve işletim koşullarının incelemesidir. Bir
workflow dosyasının hazırlanmış olması, GitHub'a gönderildiği veya günlük
zamanlamanın gerçekten çalıştığı anlamına gelmez. Etkinlik ancak gerçek
depo ve başarılı çalıştırma kaydıyla doğrulanır.
