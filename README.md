# Türkiye Doğa İzleme

Türkiye'deki bitki örtüsü değişimini açık Sentinel-2 verileriyle anlaşılır ve denetlenebilir biçimde izlemek için geliştirilen bağımsız, ücretsiz açık kaynak proje.

## İlk geliştirme kapsamı

Önce Marmaris 2021 için gerçek veri erişimi, ortak 20 m grid üzerinde NDVI/NBR/dNBR hesabı ve kaynak kayıtları doğrulanır. Küçük çalışma kesiti resmî yangın sınırı değildir. Türkiye geneli ve 2022–2026 toparlanma serisi henüz analiz edilmemiştir. Sonuçlar ön değerlendirmedir; saha doğrulaması veya hasar envanteri değildir.

## Mimari

- `analysis/`: Python, Rasterio, NumPy ve STAC; hesaplamalar kullanıcı ziyareti sırasında yapılmaz.
- `data/regions/`: sürümlenmiş alan ve tarih yapılandırmaları.
- `web/`: Next.js, TypeScript, Tailwind ve MapLibre; önceden üretilmiş küçük çıktıları gösterir.
- `docs/`: yöntem, kaynaklar ve aşama kayıtları.

İlk sürüm için Supabase gerekmez. JSON sözleşmesi daha sonra PostgreSQL/PostGIS sağlayıcısına taşınabilir. Ham uydu dosyaları Git'e eklenmez. Anahtar gerektirmeyen açık arşiv tercih edilir; Copernicus katalog erişimi ayrıca sınanır.

## Yerel kurulum

Python 3.11+ ve Node.js 22 LTS+ önerilir.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r analysis/requirements.txt
python -m pytest analysis/tests
doga probe --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/mugla-marmaris-2021.json
cd web
npm ci
npm run dev
```

İnternet yalnız bağımlılık kurulumu, katalog sorgusu ve gerçek piksel okuması için gerekir. API anahtarı gerekmez. İlk analiz birkaç dakika sürebilir. `requirements-lock.txt` Python paketlerini, `web/package-lock.json` web paketlerini sabitler. `npm ci` için Node.js 22 kullanın. İlk geliştirmede Python 3.11.6 ve Node.js 23.5.0 ortamında doğrulama yapıldı.

Üretilmiş gerçek veri de repoya eklenmiştir; analizi tekrar çalıştırmadan `web/` içinden `npm ci` ve `npm run dev` ile incelenebilir. Dosya izleme sınırına takılan ortamlarda aşağıdaki statik önizlemeyi kullanın.

## İlk gerçek gözlem

İçmeler çevresindeki çalışma penceresi `[28.15,36.74,28.32,36.86]` (boylam/enlem) ve `EPSG:32635` üzerinde 20 m ortak grid kullanılır. Referans olay ve pencere gerekçesi [bilimsel kaynaklarda](docs/scientific-sources.md) açıklanır. Dikdörtgen resmî yangın sınırı değildir.

- Önce: **28 Temmuz 2021**, `S2A_T35SPA_20210728T084602_L2A`.
- Sonra: **17 Ağustos 2021**, `S2A_T35SPA_20210817T085325_L2A`.
- Ortak geçerli piksellerde ortalama ΔNDVI yaklaşık **−0.142**, dNBR yaklaşık **0.193**.
- Ortak geçerli çalışma penceresi payı yaklaşık **%57.9**. Deniz ve diğer dışlanan pikseller de paydanın içindedir; bu sayı doğruluk veya yangın hasar yüzdesi değildir.

Bu sonuçlar platform tarafından gerçek bantlardan hesaplanmıştır. Ölçümlerin saha verileriyle bağımsız doğruluk değerlendirmesi yapılmadı. Yıllık iyileşme eğilimi çıkarılamaz.

## Tekrar üretim

`doga run`, repodaki `data/processed/.../selection.json` içindeki tam STAC kayıtlarını kullanır. Aynı ürünler, bant URL'leri ve radyometrik katsayılar yeniden okunur. Yapılandırma değişirse otomatik olarak eski seçimle devam etmez.

```sh
# Proje kökünde, etkin Python ortamıyla:
doga probe --config data/regions/mugla-marmaris-2021.json
doga run --config data/regions/mugla-marmaris-2021.json
python tools/validate_outputs.py

# Bilinçli olarak yeni ürün araması yapmak için:
doga run --config data/regions/mugla-marmaris-2021.json --refresh
```

`--refresh` iki tekil tarih penceresinde yeniden ürün seçer; yıllık güncelleme veya zamanlanmış izleme değildir. İlk sürüm yalnız `before` / `after` çifti destekler. Kalite alt sınırı sağlanamazsa yeni web çıktısı yayımlanmaz; mevcut geçerli çıktı korunur.

Çıktılar:

| Konum | İçerik |
| --- | --- |
| `web/public/data/marmaris/` | Gerçek RGB, NDVI, NBR, dNBR ve ΔNDVI PNG'leri; AOI GeoJSON; JSON ölçüm ve provenance kaydı |
| `data/processed/mugla-marmaris-2021/` | Katalog erişim raporu, sürümlü özet ve sabit ürün seçimi |
| `data/cache/mugla-marmaris-2021/` | Yerel 20 m indis/fark GeoTIFF'leri; Git dışında |

NDVI `(B08−B04)/(B08+B04)`, NBR `(B8A−B12)/(B8A+B12)`, dNBR `önce−sonra` ve ΔNDVI `sonra−önce` hesaplanır. Sentinel-2 Collection 1 L2A, Earth Search üzerinden okunur; Copernicus Data Space katalog erişimi ayrıca test edilir. Eski Earth Search koleksiyonunda saptanan ofset çelişkisi nedeniyle yalnız `sentinel-2-c1-l2a` analiz edilir. Ayrıntılar [analiz kılavuzunda](analysis/README.md).

## Web ve doğrulama

```sh
python -m pytest analysis/tests -q
python tools/validate_outputs.py
cd web
npm test
npm run typecheck
npm run build -- --webpack
npm run serve
```

Statik önizleme: `http://localhost:3000`. Üç sayfa `/`, `/bolge/mugla-marmaris-2021/` ve `/metodoloji/` adreslerindedir. Harita altlığı internet ister; analiz görselleri yerel çıktılardır. `web/out/` yeniden üretilebilir ve Git dışında tutulur. CI aynı kontrolleri yapar; büyük uydu indirme/analizi CI'da çalıştırılmaz. Yerel test sonuçları [geliştirme raporunda](docs/development-report.md) kayıtlıdır; GitHub üzerinde workflow henüz çalıştırılmadı.

## GitHub deposu

Kaynak kodu ve gerçek pilot çıktıları [ztrkkgn/turkiye-doga-platform](https://github.com/ztrkkgn/turkiye-doga-platform) deposunda yönetilir.

```sh
git clone https://github.com/ztrkkgn/turkiye-doga-platform.git
cd turkiye-doga-platform
```

Yeni değişiklikleri göndermek için kendi GitHub kimliğinizle oturum açın ve proje kökünden `git push origin main` kullanın. GitHub CLI tercih ederseniz `gh auth login` ile GitHub'ın kendi ekranında giriş yapabilirsiniz. Anahtarları sohbete veya kaynak dosyalarına koymayın. ZIP arşivi Git geçmişini içermez; Git ile devam etmek için depoyu klonlamak tercih edilir.

## Yerel önizleme

```sh
cd web
npm ci
npm run build -- --webpack
npm run serve
```

Sayfayı [localhost:3000](http://localhost:3000/) adresinden açın. Önizleme sunucusunun çalıştığı terminal açık kalmalıdır; sunucu durursa bu adres erişilemez olur. `npm run serve` yalnız kendi bilgisayarınızın yerel bağlantısını dinler. Bu komut siteyi internette yayımlamaz. Geliştirme sırasında otomatik yenileme için `npm run dev` kullanılabilir.

## Vercel yayını

GitHub deposunu Vercel'e içe aktarın. Root Directory `web`, Framework Next.js, Build Command `npm run build -- --webpack`, statik çıktı `out` olacak şekilde yapılandırın. Bu sürüm API sunucusu veya veritabanı istemez. Analiz yeniden çalıştırıldıktan sonra doğrulanmış küçük çıktıları commit edip frontend'i yeniden derleyin.

Vercel hesabı ve gerçek alan adı bu geliştirmede bağlanmadı; yayın yapılmadı. Anahtar zorunlu değildir. `.env.example` yalnız güvenli ve isteğe bağlı site URL'sini içerir. Son kullanıcıdan uydu anahtarı istenmez.

İsteğe bağlı genel site URL'si için proje kökünde `cp .env.example web/.env.local` kullanıp `NEXT_PUBLIC_SITE_URL` değerini ayarlayın. Bu değer Next.js metadata tabanı içindir; bir sır değildir. Varsayılanı yerel geliştirme adresidir.

## Maliyet ve işletim

Analiz yerel CPU'da çalışır; GPU, ticari AI API'si veya ücretli uydu verisi gerekmez. Veritabanı ve sürekli worker maliyeti yoktur. [Vercel Hobby](https://vercel.com/docs/plans/hobby) kişisel, ticari olmayan kullanım koşullarına ve kota sınırlarına tabidir; sınırsız trafik vaat edilmez. Açık depolardaki standart GitHub runner'ları [Actions koşullarına](https://docs.github.com/en/billing/concepts/product-billing/github-actions) göre ücretsizdir; büyük analizler bunun dışında yerel olarak yapılır.

OSM altlığı [karo kullanım politikasına](https://operations.osmfoundation.org/policies/tiles/) tabidir. Görünür atıf korunur; toplu indirme/offline paketleme yapılmaz. İlk düşük trafikli pilot için kullanılır; trafik büyürse uygun bir karo sağlayıcısı seçilir. Earth Search açık arşivi hizmet garantisi olan özel bir altyapı değildir. Servis kesilirse mevcut işlenmiş sonuçlar incelenebilir.

## Katkı

[CONTRIBUTING.md](CONTRIBUTING.md) kurulum, test ve bilimsel değişiklik kurallarını açıklar. Üyelik, ödeme, bildirim, kullanıcı arazisi seçimi ve yeni pilotlar bu ilk adımda geliştirilmedi. Sonraki öncelik aynı mevsim medyan kompozitleri ve sabit ortak maskede 2022–2026 toparlanma serisidir.

## Bilimsel yorum

NDVI ağaç sayısı veya biyolojik çeşitlilik değildir. İndeks artışı ormanın tamamen iyileştiğini kanıtlamaz. Uydu değişimi tek başına yasa dışı kesim kanıtı değildir. Duman, bulut, gölge, mevsim ve karışık pikseller sonucu etkiler. Güvenilir yerel kalibrasyon olmadan dNBR hasar sınıfları veya yanan alan toplamları yayımlanmaz.

## Lisans

Kod MIT lisansı altındadır. Sentinel verisi, harita altlıkları ve üçüncü taraf içerikleri kendi lisans ve atıf koşullarına tabidir. Copernicus Sentinel verisi değiştirilerek işlenir; bu proje ESA veya Copernicus'un resmî ürünü değildir.
