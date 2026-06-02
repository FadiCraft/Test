const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://clip.cafe/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// دالة مبسطة لجلب تفاصيل الفيلم ورابط فيديو واحد فقط
async function fetchMovieDetails(movieLink) {
    try {
        const response = await fetch(movieLink, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. استخراج الوصف
        const description = $('.movie-description').text().trim() || "";

        // 2. استخراج المخرج والسنة ببساطة
        let director = "";
        let year = "";
        $('.movie-meta-item').each((i, elem) => {
            const label = $(elem).find('.movie-meta-label').text().trim().toLowerCase();
            const value = $(elem).find('.movie-meta-value').text().trim();
            if (label.includes('director')) director = value;
            if (label.includes('year')) year = value;
        });

        // 3. جلب أول مقطع فيديو يواجهه السكربت فقط لتوفير المساحة والسرعة
        let videoLink = "";
        const firstClip = $('.clip-card-collect-wrapper').first().find('a.smallClipContainer').attr('href');
        if (firstClip) {
            videoLink = firstClip.startsWith('http') ? firstClip : BASE_URL + firstClip;
        }

        return { description, director, year, videoLink };
    } catch (error) {
        return null;
    }
}

async function startScraping() {
    const targetUrl = 'https://clip.cafe/?srsltid=AfmBOoq8ftECMI7zkvwfoPP4peOCKBY8z5YdXn7IlNOqVLCtQJb6pHK0';
    console.log(`🚀 جاري جلب البيانات ببساطة وبسرعة...`);

    try {
        const response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) throw new Error(`خطأ: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const moviesList = [];
        const promises = [];

        $('a.moviePosterBox').each((index, element) => {
            const elem = $(element);
            const title = elem.attr('title')?.trim() || elem.find('.movieTitle').text().trim();
            const href = elem.attr('href') || '';
            const link = href.startsWith('http') ? href : BASE_URL + href;
            const img = elem.find('picture img').attr('src') || elem.find('picture img').attr('data-src') || '';

            if (title && link) {
                const item = {
                    title,
                    link,
                    image: img.startsWith('http') ? img : BASE_URL + img,
                    description: "",
                    director: "",
                    year: "",
                    videoLink: ""
                };
                moviesList.push(item);

                // جلب التفاصيل بشكل متوازٍ وسريع جداً
                promises.push(
                    fetchMovieDetails(link).then(details => {
                        if (details) {
                            item.description = details.description;
                            item.director = details.director;
                            item.year = details.year;
                            item.videoLink = details.videoLink;
                        }
                    })
                );
            }
        });

        await Promise.all(promises);

        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ تم حفظ ${moviesList.length} عنصر بنجاح في movies.json`);

    } catch (error) {
        console.error(`❌ خطأ: ${error.message}`);
        fs.writeFileSync('movies.json', '[]', 'utf-8');
    }
}

startScraping();
