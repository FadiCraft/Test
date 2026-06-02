const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://clip.cafe/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// دالة لتصحيح الروابط النسبية وتحويلها لروابط كاملة صحيحة
function buildFullUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // إزالة أي شرطة مائلة زائدة في البداية لتفادي تكرارها
    return BASE_URL + path.replace(/^\//, '');
}

// دالة جلب تفاصيل الفيلم من صفحته الخاصة
async function fetchMovieDetails(movieLink) {
    try {
        const response = await fetch(movieLink, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. استخراج الوصف
        const description = $('.movie-description').text().trim() || "";

        // 2. استخراج معلومات الـ Meta Grid المحددة فقط
        let director = "";
        let year = "";
        let genre = "";
        let boxOffice = "";
        let production = "";
        let awards = "";

        $('.movie-meta-item').each((i, elem) => {
            const label = $(elem).find('.movie-meta-label').text().trim().toLowerCase();
            const value = $(elem).find('.movie-meta-value').text().trim();

            if (label.includes('director')) director = value;
            if (label.includes('year')) year = value;
            if (label.includes('genre')) genre = value;
            if (label.includes('box office')) boxOffice = value;
            if (label.includes('production')) production = value;
            if (label.includes('awards')) awards = value;
        });

        // 3. جلب أول فيديو/كليب يظهر في الصفحة فقط وتصحيح رابطه
        let videoLink = "";
        const firstClipHref = $('.clip-card-collect-wrapper').first().find('a.smallClipContainer').attr('href');
        if (firstClipHref) {
            videoLink = buildFullUrl(firstClipHref);
        }

        return { description, director, year, genre, boxOffice, production, awards, videoLink };
    } catch (error) {
        return null;
    }
}

async function startScraping() {
    const targetUrl = 'https://clip.cafe/?srsltid=AfmBOoq8ftECMI7zkvwfoPP4peOCKBY8z5YdXn7IlNOqVLCtQJb6pHK0';
    console.log(`🚀 جاري سحب البيانات ببساطة وبأعلى سرعة...`);

    try {
        const response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) throw new Error(`خطأ اتصال: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const moviesList = [];
        const promises = [];

        // استخراج الأفلام من الصفحة الرئيسية بناءً على الكلاس المطلوب
        $('a.moviePosterBox').each((index, element) => {
            const elem = $(element);
            
            // استخراج الاسم ورابط الفيلم من التاج الرئيسي
            const title = elem.find('.movieTitle').text().trim() || elem.attr('title')?.trim() || '';
            const movieHref = elem.attr('href') || '';
            const link = buildFullUrl(movieHref);

            // استخراج الصورة وتصحيح رابطها بالكامل
            const imgTag = elem.find('picture img');
            const srcPath = imgTag.attr('data-src') || imgTag.attr('src') || '';
            const image = buildFullUrl(srcPath);

            if (title && link) {
                const item = {
                    title,
                    link,
                    image,
                    description: "",
                    director: "",
                    year: "",
                    genre: "",
                    boxOffice: "",
                    production: "",
                    awards: "",
                    videoLink: ""
                };
                moviesList.push(item);

                // الانتقال لصفحة الفيلم لجلب بقية التفاصيل بالتوازي
                promises.push(
                    fetchMovieDetails(link).then(details => {
                        if (details) {
                            item.description = details.description;
                            item.director = details.director;
                            item.year = details.year;
                            item.genre = details.genre;
                            item.boxOffice = details.boxOffice;
                            item.production = details.production;
                            item.awards = details.awards;
                            item.videoLink = details.videoLink;
                        }
                    })
                );
            }
        });

        // الانتظار حتى تنتهي جميع الصفحات
        await Promise.all(promises);

        // حفظ النتيجة النهائية
        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ نجح السحب! تم حفظ جميع الأفلام في ملف movies.json بتنسيق صحيح للروابط.`);

    } catch (error) {
        console.error(`❌ خطأ: ${error.message}`);
        fs.writeFileSync('movies.json', '[]', 'utf-8');
    }
}

startScraping();
