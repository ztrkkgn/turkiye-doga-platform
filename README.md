# Türkiye Doğa İzleme

Türkiye'nin değişen doğasını açık uydu verileri ve doğrulanabilir kaynaklarla izlemek için geliştirilen, bağımsız ve ücretsiz açık kaynak platform. Türkiye haritasından önemli olaylara ulaşılır; gerçek analiz bulunan bölgelerde uydu görüntüleri, bitki örtüsü indisleri ve kaynak kayıtları incelenebilir.

## Mevcut kapsam

Ana harita Türkiye'nin tamamını gösterir. **Ülke genelinde sürekli piksel taraması yapılmaz:** güncel uydu işlemesi dört seçilmiş çalışma penceresiyle sınırlıdır.

| Olay sayfası | Tarihsel uydu analizi | Güncel bölgesel izleme |
| --- | --- | --- |
| Marmaris / İçmeler · 2021 | 28 Temmuz–17 Ağustos 2021, gerçek Sentinel-2 | Var |
| Manavgat / Salur–Ulukapı · 2021 | 25 Temmuz–14 Ağustos 2021, gerçek Sentinel-2 | Var |
| Bördübet · 2022 | Kaynaklarla belgelenmiş olay; 2022 görüntü çifti henüz yayımlanmadı | Var |
| İzmir / Yamanlar · 2024 | Kaynaklarla belgelenmiş olay; tarihsel analiz bekliyor | Var |
| Tuz Gölü · 2021 | Kaynaklarla belgelenmiş kuraklık dönemi | Düzenli taramada değil |
| Erçek Gölü · 2021 | Kaynaklarla belgelenmiş kıyı çekilmesi | Düzenli taramada değil |

Her olayın ayrı `/bolge/<slug>/` sayfası vardır. Kaynaklı bir olay kaydı, platform tarafından uydu analizi yapılmış olması anlamına gelmez. Çalışma pencereleri resmî yangın veya göl kıyısı sınırı değildir. Bördübet'in tarihsel veri eksikliği ile aynı alandaki güncel gözlemler ayrı gösterilir.

**15 Kasım 2026 tarihli izleme kaydı:** dört alan kontrol edildi; üç alandaki uygun gerçek gözlem çiftlerinden toplam **43 incelenmemiş spektral değişim adayı** üretildi. Bu sayı doğrulanmış tahribat veya iyileşme sayısı değildir ve sonraki çalıştırmalarda değişebilir.

| Çalışma alanı | Referans çekimi | Son kullanılan çekim | İncelenmemiş aday |
| --- | --- | --- | ---: |
| Marmaris / İçmeler | 22 Ekim 2026 | 30 Ekim 2026 (önceki ürün) | 0 · yeni uygun gözlem yok |
| Manavgat | 19 Ekim 2026 | 8 Kasım 2026 | 22 |
| Bördübet | 22 Ekim 2026 | 12 Kasım 2026 | 20 |
| Yamanlar | 23 Ekim 2026 | 14 Kasım 2026 | 1 |

Marmaris’te son 0–14 günlük aramada kalite kapısını geçen yeni çekim bulunmadı. Önceki ürün korunur; bu denemede güncel aday katmanına alınmaz.

Son veri kontrolü, analiz üretimi ve uydu çekimi farklı zamanlardır; arayüz bu ayrımı korur. Çekimi **21 günden eski** kayıtlar güncel işaret katmanına alınmaz. Kaynak veriye erişilemiyor veya kalite yetersizse bu durum açıkça gösterilir.

## Mimari ve açık veri

- **Analiz:** Python 3.11, Rasterio, NumPy, SciPy ve PySTAC Client. Bantlar önceden işlenir; kullanıcı sayfayı açtığında uydu analizi çalışmaz.
- **Web:** Next.js, TypeScript, Tailwind CSS ve MapLibre GL JS; statik dışa aktarım ve önceden hazırlanmış küçük JSON, GeoJSON ve PNG çıktıları.
- **Veri:** Earth Search üzerinden anahtarsız, açık Sentinel-2 **Collection 1 L2A** COG erişimi. Copernicus Data Space katalog erişimi ayrıca sınanabilir.
- **Depolama:** sürümlenmiş dosyalar; başlangıçta veritabanı veya Supabase gerekmez. Ham GeoTIFF ve yerel önbellek Git dışında tutulur.
- **Otomasyon:** test/build CI'ı ve seçilmiş alanlar için günlük katalog kontrolü hazırlayan GitHub Actions workflow'ları.

Ticari AI API'si, ücretli uydu API'si, API anahtarı veya GPU zorunlu değildir. Eski Earth Search koleksiyonunda bulunan radyometrik metadata çelişkisi nedeniyle analiz yalnızca C1 koleksiyonunu kabul eder. Ürün kimliği, bant URL'leri, scale/offset, grid ve kaynak/çıktı SHA256 kayıtları provenance dosyalarında tutulur.

## Hızlı yerel kurulum

Python **3.11** ve CI ile aynı **Node.js 22** sürümü önerilir. Depoda üretilmiş gerçek çıktılar bulunduğundan ilk web incelemesi için uydu analizini tekrar çalıştırmak gerekmez.

```sh
git clone https://github.com/ztrkkgn/turkiye-doga-platform.git
cd turkiye-doga-platform
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r analysis/requirements.txt
cp .env.example web/.env.local
cd web
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000/) adresini açın. Geliştirme sunucusunun çalıştığı terminal açık kalmalıdır. Harita altlığı ve uzak izleme kaydı internet ister; kaydedilmiş analiz çıktıları yerel olarak sunulur. Python paketleri `analysis/requirements-lock.txt`, web paketleri `web/package-lock.json` ile sabitlenir.

Statik önizleme için `web/` içinde:

```sh
npm run build -- --webpack
npm run serve
```

Bu sunucu yalnız `127.0.0.1:3000` adresini dinler; internette yayın yapmaz. `web/out/` yeniden üretilebilir ve Git dışında tutulur.

## Tarihsel analizleri tekrar üretme

Proje kökünde, etkin Python ortamıyla:

```sh
doga probe --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/antalya-manavgat-2021.json
python tools/validate_outputs.py
```

`doga run`, kaydedilmiş tam STAC ürün seçimiyle aynı ürünleri yeniden okur. Yapılandırma ile kayıt uyuşmazsa sessizce devam etmez. Bilinçli yeni ürün seçimi için `--refresh` kullanılabilir; bu seçenek tek başına periyodik izleme başlatmaz. Tam çift ve ortak geçerli kapsama kalite kontrollerini geçmeden yeni sonuç önceki geçerli çıktının yerine konmaz.

Marmaris penceresi `[28.15,36.74,28.32,36.86]`, Manavgat penceresi `[31.40,36.86,31.55,36.98]` şeklindedir; sıra **batı, güney, doğu, kuzey** boylam/enlem değerleridir. İki bölge de kendi UTM diliminde 20 m ortak grid kullanır. Pencere gerekçeleri ve gerçek gözlem kimlikleri [bilimsel kaynaklar](docs/scientific-sources.md) ve [Manavgat analiz kaydında](docs/manavgat-analysis.md) açıklanır.

## Güncel uydu izlemesini çalıştırma

```sh
# Proje kökünde:
doga monitor --config data/monitoring/config.json
python tools/validate_outputs.py --version-monitor-assets

# Arama dönemini belirli bir güne sabitlemek için:
doga monitor --config data/monitoring/config.json --as-of 2026-11-13
python tools/validate_outputs.py --version-monitor-assets
```

`--as-of` arama pencerelerinin gününü sabitler; sonradan değişen katalog kayıtlarını dondurmaz. Seçilen gerçek ürünler ayrıca kaydedilir.

İzleme, son **0–14 gün** içinden uygun bir gözlem ile önceki **15–42 gün** içinden uygun bir referans gözlemi seçer. Önce katalog ve yerel SCL kapsaması kontrol edilir. Kullanılabilir ürün çifti ile ilgili kod/ayar parmak izi değişmediyse spektral bantlar yeniden işlenmez. İlk sürüm iki **tekil gözlem** kullanır; medyan kompozit veya yıllık toparlanma serisi üretildiği iddia edilmez.

NDVI farkındaki değiştirilmiş Z puanı `|M| > 3.5`, aynı yönde gerçek NDVI farkı ve en az 1 ha dört komşulu piksel desteği, yalnızca **incelenecek aday** üretir. Bölge başına en fazla 50 aday yayımlanır. MAD sıfır veya sayısal toleransın altındaysa aday puanlanmaz. Bu ayarlar saha kalibrasyonlu hasar eşikleri değildir; [yöntem incelemesi](docs/monitoring-method-review.md) sınırlamaları açıklar.

`--version-monitor-assets`, izleme görüntü adlarını çekim çifti ve kaynak kimliğiyle sürümler, JSON bağlantılarını günceller ve tüm yayımlanacak veriyi doğrular. İzleme sonrası commit öncesinde çalıştırılmalıdır; farklı tarihlere ait görüntü ve ölçümlerin önbellekte karışma riskini azaltır.

## Günlük kontrol ve çalışma zamanında veri okuma

[monitor.yml](.github/workflows/monitor.yml) her gün **03:17 UTC / 06:17 İstanbul** için hazırlanmıştır; `workflow_dispatch` ile elle de başlatılabilir. Her denemede kontrol zamanını kaydeder; uygun yeni ürün çifti varsa analizi yeniler. Çıktı doğrulama, test ve web build adımlarından sonra değişen küçük veri dosyalarını `main` dalına gönderir.

**Workflow GitHub’a gönderildi. İlk gerçek çalıştırma yayın kapısında bir tutarlılık hatasını yakaladı; düzeltme sonrası tekrar çalıştırmanın doğrulaması sürüyor.** Yerelde tamamlanan izleme, zamanlanmış işin gerçekten çalıştığını tek başına kanıtlamaz.

GitHub zamanlaması hizmet garantisi değildir: işler gecikebilir veya yoğunlukta düşebilir; public repolarda 60 gün etkinlik olmadığında schedule devre dışı kalabilir. [Resmî zamanlama koşulları](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) geçerlidir. Günlük kontrol, her gün yeni veya bulutsuz uydu görüntüsü bulunacağı anlamına gelmez.

Web, açıldığında güncel izleme durumunu ve aday GeoJSON kaydını varsayılan olarak aşağıdaki **açık GitHub dosya kökünden** okur:

```text
https://raw.githubusercontent.com/ztrkkgn/turkiye-doga-platform/main/web/public
```

Uzak durum ve aday kayıtları birlikte doğrulanır. Uzak çift alınamaz veya doğrulamadan geçmezse uygulama, bu web sürümünde bulunan **yerel durum ve aday çiftine birlikte** döner; farklı kaynakların kayıtlarını karıştırmaz. Yerel çıktı tüm görüntüleriyle depoda bulunur. Seçilen uzak bölgenin ek analiz kaydı sonradan yüklenemezse arayüz hata gösterir; erişilemeyen veri yeni sonuç gibi sunulmaz. Görüntü URL'leri, seçilen veri kaynağına göre çözülür ve güncellik sayfa açılırken tekrar değerlendirilir.

Bu yapı veri kayıtlarının çalışma zamanında okunmasını sağlar. Yeni dosyalar henüz public depoya gönderilmemişse uzak kaynakta bulunmayabilir; kaydedilmiş yerel sürüm kullanılabilir. Kaynağı değiştirmek için isteğe bağlı `NEXT_PUBLIC_MONITORING_BASE_URL` değeri kullanılabilir; HTTPS üzerinden erişilen, aynı `/data/...` yapısını ve tarayıcı erişimini destekleyen **public dosya kökü** olmalıdır.

## Ortam değişkenleri

`.env.example` dosyasını `web/.env.local` olarak kopyalayın. İki değer de tarayıcıya açık yapılandırmadır; sır içeremez.

| Değişken | Amaç |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Next.js metadata ve kalıcı site bağlantıları; yerelde `http://localhost:3000` |
| `NEXT_PUBLIC_MONITORING_BASE_URL` | İsteğe bağlı public HTTPS izleme dosya kökü; verilmezse yukarıdaki GitHub raw kökü |

`NEXT_PUBLIC_` değerleri build sırasında web çıktısına girer. Kaynak adresini değiştirirseniz web'i yeniden derleyin; kaynağın sunduğu veri kayıtları ise çalışma zamanında okunur. Yerel geliştirme için uydu hesabı veya erişim anahtarı gerekmez.

## Test ve çıktı doğrulama

Proje kökünde:

```sh
python -m pytest analysis/tests -q
python tools/validate_outputs.py
cd web
npm ci
npm test
npm run typecheck
npm run build -- --webpack
```

[CI](.github/workflows/ci.yml) test, veri sözleşmesi ve build kontrollerini çalıştırır. Günlük iş ayrıca bu kontrollerden önce gerçek veri erişimi yapar; olağan CI büyük uydu analizlerini yeniden üretmez. Bir komutun burada listelenmesi o komutun GitHub üzerinde çalıştırıldığını göstermez.

## Dosya düzeni

| Konum | İçerik |
| --- | --- |
| `analysis/src/doga/` | Katalog erişimi, grid/maskeler, indisler, tarihsel analiz ve güncel izleme |
| `analysis/tests/` | Sayısal, raster, kalite ve yayın kapısı testleri; sentetik veriler yalnız testlerde |
| `data/regions/` | İki tarihsel pilotun yapılandırmaları |
| `data/monitoring/` | Seçili güncel alanlar, çalışma ayarları ve üretilen dönem yapılandırmaları |
| `data/processed/` | Sürüm, kaynak kayıtları ve sabit ürün seçimleri |
| `data/cache/` | Yerel GeoTIFF ve okuma önbelleği; Git dışında |
| `web/public/data/marmaris/`, `web/public/data/manavgat/` | Gerçek tarihsel RGB/indis/fark PNG'leri, GeoJSON, özet ve provenance |
| `web/public/data/monitor-*/` | Güncel gerçek görüntü çiftleri ve bölgesel adaylar |
| `web/public/data/monitoring/` | Toplu durum ve aday GeoJSON kaydı |
| `web/lib/events-catalog.json` | Altı kaynaklı olayın başlık, konum ve analiz durumları |

## Vercel'e yayın

GitHub deposunu Vercel'e içe aktarırken Root Directory `web`, Framework Next.js, Build Command `npm run build -- --webpack` ve statik çıktı `out` olarak yapılandırın. Gerekirse iki public ortam değişkenini build ayarlarına ekleyin. Üretilen web sürümü bir API sunucusu veya veritabanı gerektirmez.

**Vercel hesabı ve alan adı bu geliştirmede bağlanmadı; Vercel yayını yapılmadı.** GitHub'a kod/veri gönderimi, bir web sitesinin otomatik olarak Vercel'de yayımlandığı anlamına gelmez.

## Maliyet, kaynaklar ve bilimsel sınırlar

Açık C1 STAC/COG erişimi anahtar gerektirmez. [GitHub'ın güncel koşullarında](https://docs.github.com/en/billing/concepts/product-billing/github-actions) public repolardaki standart GitHub-hosted runner kullanımı ücretsizdir. Larger runner'lar ücretlidir; artifact/cache depolama ve private repo hakları ayrı değerlendirilir. Proje küçük alanlar, standart Linux runner ve küçük hazırlanmış çıktılarla çalışır; sınırsız kota veya kesintisiz servis sözü vermez.

NDVI `(B08−B04)/(B08+B04)`, NBR `(B8A−B12)/(B8A+B12)`, dNBR `önce−sonra` ve ΔNDVI `sonra−önce` hesaplanır. Analiz SCL 4/5 ile sınırlıdır; gerçek renk görüntüleri daha geniş görsel bağlam içerebilir. NDVI artışı ağaç sayısı, hayatta kalma oranı, biyolojik çeşitlilik veya ormanın bütünüyle iyileşmesi değildir. Spektral değişim tek başına nedenini veya bir faaliyetin yasallığını göstermez. Mevsim, tarım, nem, duman ve maskelenen pikseller sonucu etkileyebilir; ilk otomatik tarama saha verisiyle doğrulanmadı.

Yöntem ve kaynak kayıtları:

- [Analiz kılavuzu](analysis/README.md) ve [bilimsel kaynaklar](docs/scientific-sources.md)
- [Altı olayın kaynakları ve yaklaşık konumları](docs/events-sources.md)
- [Manavgat tarihsel analizi](docs/manavgat-analysis.md)
- [Bördübet tarihsel veri eksikliği ve güncel izleme ayrımı](docs/bordubet-analysis.md)
- [Güncel izleme yöntemi, sınırlamalar ve zamanlama](docs/monitoring-method-review.md)

OSM altlığının görünür atfı ve [karo kullanım politikası](https://operations.osmfoundation.org/policies/tiles/) korunur. Earth Search hizmet garantili özel altyapı değildir. [Katkı rehberi](CONTRIBUTING.md) bilimsel değişiklik, test ve veri güvenliği kurallarını açıklar.

## Lisans

Kod **MIT** lisanslıdır. Copernicus Sentinel verileri, harita altlıkları ve üçüncü taraf içerikleri kendi lisans/atıf koşullarına tabidir. Proje ESA veya Copernicus'un resmî ürünü değildir. Anahtarlar, parolalar, ham uydu dosyaları ve `.env.local` dosyaları kaynak koduna eklenmez.
