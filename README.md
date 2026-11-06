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

İlk gerçek çalıştırma ve yayın talimatları geliştirme tamamlandığında aşağıda güncellenecektir.

## Bilimsel yorum

NDVI ağaç sayısı veya biyolojik çeşitlilik değildir. İndeks artışı ormanın tamamen iyileştiğini kanıtlamaz. Uydu değişimi tek başına yasa dışı kesim kanıtı değildir. Duman, bulut, gölge, mevsim ve karışık pikseller sonucu etkiler. Güvenilir yerel kalibrasyon olmadan dNBR hasar sınıfları veya yanan alan toplamları yayımlanmaz.

## Lisans

Kod MIT lisansı altındadır. Sentinel verisi, harita altlıkları ve üçüncü taraf içerikleri kendi lisans ve atıf koşullarına tabidir. Copernicus Sentinel verisi değiştirilerek işlenir; bu proje ESA veya Copernicus'un resmî ürünü değildir.
