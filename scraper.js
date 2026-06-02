const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://clip.cafe/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// دالة لجلب تفاصيل الفيلم من صفحته الخاصة
async function fetchMovieDetails(movieLink) {
    try {
        const response = await fetch(movieLink, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. استخراج الوصف
        const description = $('.movie-description').text().trim() || "";

        // 2. استخراج البيانات التعريفية (Meta Grid)
        const meta = {
            director: "",
            year: "",
            genre: [],
            boxOffice: "",
            production: "",
            awards: ""
        };

        $('.movie-meta-item').each((i, elem) => {
            const label = $(elem).find('.movie-meta-label').text().trim().toLowerCase();
            const valueElem = $(elem).find('.movie-meta-value');

            if (label.includes('director')) {
                meta.director = valueElem.text().trim();
            } else if (label.includes('year')) {
                meta.year = valueElem.text().trim();
            } else if (label.includes('genre')) {
                meta.genre = valueElem.find('a').map((index, a) => $(a).text().trim()).get();
            } else if (label.includes('box office')) {
                meta.boxOffice = valueElem.text().trim();
            } else if (label.includes('production')) {
                meta.production = valueElem.text().trim();
            } else if (label.includes('awards')) {
                meta.awards = valueElem.text().trim();
            }
        });

        // 3. استخراج مقاطع الفيديو (Clips) المتاحة داخل الصفحة
        const clips = [];
        $('.clip-card-collect-wrapper').each((i, elem) => {
            const aTag = $(elem).find('a.smallClipContainer');
            const clipLink = aTag.attr('href') || '';
            const fullClipLink = clipLink.startsWith('http') ? clipLink : BASE_URL + clipLink;
            
            const imgTag = aTag.find('picture.clipThumb img');
            const thumbnail = imgTag.attr('src') || imgTag.attr('data-src') || '';
            
            const duration = aTag.find('.videoDuration').text().trim() || "";
            const clipTitle = aTag.find('.clipTitle').text().trim() || "";

            if (clipTitle && fullClipLink) {
                clips.push({
                    title: clipTitle,
                    link: fullClipLink,
                    thumbnail: thumbnail,
                    duration: duration
                });
            }
        });

        return { description, meta, clips };

    } catch (error) {
        console.error(`⚠️ خطأ أثناء جلب تفاصيل الرابط ${movieLink}:`, error.message);
        return null;
    }
}

async function startScraping() {
    const targetUrl = 'https://clip.cafe/?srsltid=AfmBOoq8ftECMI7zkvwfoPP4peOCKBY8z5YdXn7IlNOqVLCtQJb6pHK0';
    console.log(`🚀 جاري جلب قائمة الأفلام الرئيسية من: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`فشل جلب الصفحة الرئيسية. كود الخطأ: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const moviesList = [];
        const detailPromises = [];

        // استهداف الكلاس المطلوب في الهيكل الجديد
        $('a.moviePosterBox').each((index, element) => {
            const elem = $(element);
            const title = elem.attr('title')?.trim() || elem.find('.movieTitle').text().trim() || '';
            const relativeLink = elem.attr('href') || '';
            const fullLink = relativeLink.startsWith('http') ? relativeLink : BASE_URL + relativeLink;

            const imgTag = elem.find('picture img');
            const image = imgTag.attr('src') || imgTag.attr('data-src') || '';

            if (title && fullLink) {
                const movieData = {
                    title,
                    link: fullLink,
                    image: image.startsWith('http') ? image : BASE_URL + image,
                    description: "",
                    meta: {},
                    clips: []
                };

                moviesList.push(movieData);

                // تجهيز جلب البيانات العميقة لكل فيلم بشكل متوازٍ فوري وسريع
                detailPromises.push(
                    fetchMovieDetails(fullLink).then(details => {
                        if (details) {
                            movieData.description = details.description;
                            movieData.meta = details.meta;
                            movieData.clips = details.clips;
                        }
                    })
                );
            }
        });

        console.log(`⏳ جاري فحص استخراج تفاصيل الـ (${moviesList.length}) فيلم ومقاطع الفيديو الخاصة بها بسرعة...`);
        // تنفيذ طلبات جلب تفاصيل الأفلام معاً لضمان أقصى سرعة
        await Promise.all(detailPromises);

        // حفظ النتيجة النهائية الشاملة
        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ اكتمل السحب بنجاح! تم استخراج وحفظ ${moviesList.length} فيلم بالتفاصيل والمقاطع في ملف movies.json`);

    } catch (error) {
        console.error(`❌ خطأ عام أثناء التشغيل: ${error.message}`);
        if (!fs.existsSync('movies.json')) fs.writeFileSync('movies.json', '[]', 'utf-8');
    }
}

startScraping();
