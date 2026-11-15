# Bördübet · tarihsel analiz durumu ve güncel izleme ayrımı

[OGM Muğla Orman Bölge Müdürlüğü'nün kaydı](https://www.ogm.gov.tr/muglaobm/haber-sitesi/Sayfalar/bordubet-kullerinden-doguyor.aspx)
olayın **21 Haziran 2022** başlangıcını ve Bördübet–Değirmenyanı çevresini
belgeler. [Gürbüz (2023), Harita Dergisi](https://www.harita.gov.tr/uploads/files/articles/uzaktan-algilama-ile-yangin-siddeti-belirlenmesinde-farkli-indekslerin-karsilastirilmasi-1673.pdf)
aynı olayı 16/18 Haziran öncesi ve 26/28 Haziran sonrası Sentinel-2
görüntüleriyle inceler; Şekil 1 coğrafi bağlamı gösterir. Yayın sonuçları
platform tarafından üretilmiş veri sayılmaz.

## 2022 çifti neden yayımlanmadı?

13 Kasım 2026 erişim kontrolünde, **[28.0,36.8,28.2,36.9]** sorgu kutusunda
**1 Haziran–15 Temmuz 2022** aralığı için Earth Search v1
`sentinel-2-c1-l2a` ve v2 C1 `sentinel-2-l2a` sorguları sıfır ürün döndürdü.
Bu, bütün 2022 arşivinin yok olduğu anlamına gelmez; aynı koleksiyonun
coğrafi filtresiz sorgusunda başka bölgeler için ürün bulundu. Eski
koleksiyondaki bilinen radyometrik metadata sorununu aşmak için burada
ofset tahmini yapılmadı veya yanlış veriyle sonuç üretilmedi.

Bu nedenle Bördübet'in **2022 tarihsel önce/sonra analizi hâlâ bekliyor**.
Resmî olay kaydı ve yayın bağlantıları gösterilebilir; yangın alanı,
hasar oranı veya yıllık iyileşme değeri bu platformda hesaplandı denemez.

## Güncel gözlemler ayrıca mevcut

Aynı bölgede **2026 güncel C1 verileri** bulunuyor. Bölgesel izleme için
Şekil 1'deki coğrafi bağlam içinde, **[28.04,36.81,28.16,36.91]** küçük
çalışma penceresi seçildi. Karesi 35SNA; 20 m EPSG:32635 grid kullanılır.
Bu kutu resmî yangın sınırı, çıkış noktası veya yanan alan envanteri değildir.

İlk güncel izleme gerçek **22 Ekim–12 Kasım 2026** çiftini kullandı.
Ortak geçerli destek yaklaşık **%50,34**, ortalama ΔNDVI **+0,038284**.
NIST değiştirilmiş Z ve en az 1 ha bağlı piksel desteğiyle **20 incelenmemiş
spektral değişim adayı** işaretlendi. Bu adaylar yangının yeniden çıktığı,
ağaçlandırmanın başarılı olduğu veya ekolojik hasarın doğrulandığı anlamına
gelmez. Mevsim, yağış ve tarım etkileri ayrıştırılmamıştır.

Güncel verilerin gerçek çekim zamanları ve izleme kontrol zamanı ayrı
tutulur. 21 günden eski kullanılabilir görüntüler güncel işaret katmanına
alınmaz. Yöntem ve operasyonel filtreler [izleme incelemesinde](monitoring-method-review.md)
açıklanır. Tarihsel analiz eksikliği, güncel iki tarihli bölgesel izlemenin
mevcut olmasıyla karıştırılmamalıdır.
