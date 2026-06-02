const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://clip.cafe/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// دالة لمعالجة وتصحيح الروابط النسبية لتصبح روابط كاملة
function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return BASE_URL + url.replace(/^\//, ''); // إزالة الشرطة المائلة الأولى إن وجدت لمنع التكرار
}

// دالة جلب تفاصيل الفيلم الكاملة من داخل صفحته
async function fetchMovieDetails(movieLink) {
    try {
        const response = await fetch(movieLink, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. استخراج الوصف
        const description = $('.movie-description').text().trim() || "";

        // 2. استخراج الميتا جرد بالكامل (Director, Year, Genre, Box Office, Production, Awards)
        let director = "";
        let year = "";
        let genre = [];
        let boxOffice = "";
        let production = "";
        let awards = "";

        $('.movie-meta-item').each((i, elem) => {
            const label = $(elem).find('.movie-meta-label').text().trim().toLowerCase();
            const valueElem = $(elem).find('.movie-meta-value');
            const valueText = valueElem.text().trim();

            if (label.includes('director')) director = valueText;
            if (label.includes('year')) year = valueText;
            if (label.includes('box office')) boxOffice = valueText;
            if (label.includes('production')) production = valueText;
            if (label.includes('awards')) awards = valueText;
            if (label.includes('genre')) {
                genre = valueElem.find('a').map((index, a) => $(a).text().trim()).get();
            }
        });

        // 3. استخراج الموقع الرسمي (Homepage)
        const homepage = $('.movie-collection-box').find('a').attr('href')?.trim() || "";

        // 4. استخراج الأفلام المشابهة (You Might Also Like)
        const similarMovies = [];
        $('.movie-recommendation-box').find('a.similarMovie').each((i, elem) => {
            const mTitle = $(elem).text().trim();
            const mHref = $(elem).attr('href') || '';
            if (mTitle) {
                similarMovies.push({
                    title: mTitle,
                    link: fixUrl(mHref)
                });
            }
        });

        // 5. جلب أول مقطع فيديو فقط
        let videoLink = "";
        const firstClip = $('.clip-card-collect-wrapper').first().find('a.smallClipContainer').attr('href');
        if (firstClip) {
            videoLink = fixUrl(firstClip);
        }

        return { description, director, year, genre, boxOffice, production, awards, homepage, similarMovies, videoLink };
    } catch (error) {
        return null;
    }
}

async function startScraping() {
    const targetUrl = 'https://clip.cafe/?srsltid=AfmBOoq8ftECMI7zkvwfoPP4peOCKBY8z5YdXn7IlNOqVLCtQJb6pHK0';
    console.log(`🚀 جاري تشغيل سحب البيانات المطور...`);

    try {
        const response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) throw new Error(`خطأ في الاتصال: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const moviesList = [];
        const promises = [];

        $('a.moviePosterBox').each((index, element) => {
            const elem = $(element);
            const title = elem.attr('title')?.trim() || elem.find('.movieTitle').text().trim();
            const href = elem.attr('href') || '';
            const link = fixUrl(href);
            
            // تصحيح جلب الرابط الكامل للصورة بدقة
            const imgTag = elem.find('picture img');
            const rawImg = imgTag.attr('src') || imgTag.attr('data-src') || '';
            const image = fixUrl(rawImg);

            if (title && link) {
                const item = {
                    title,
                    link,
                    image,
                    description: "",
                    director: "",
                    year: "",
                    genre: [],
                    boxOffice: "",
                    production: "",
                    awards: "",
                    homepage: "",
                    videoLink: "",
                    similarMovies: []
                };
                moviesList.push(item);

                // جلب التفاصيل العميقة بالتوازي وبسرعة فائقة
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
                            item.homepage = details.homepage;
                            item.videoLink = details.videoLink;
                            item.similarMovies = details.similarMovies;
                        }
                    })
                );
            }
        });

        await Promise.all(promises);

        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ اكتملت العملية! تم جلب وتصحيح روابط ${moviesList.length} فيلم في movies.json`);

    } catch (error) {
        console.error(`❌ خطأ عام: ${error.message}`);
        fs.writeFileSync('movies.json', '[]', 'utf-8');
    }
}

startScraping();
