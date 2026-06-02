const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// إعدادات الـ Headers لمحاكاة المتصفح
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function scrapeMovies() {
    const url = 'https://www.hdfilmcehennemi.nl/category/film-izle-2/';
    console.log(`جاري جلب الأفلام من: ${url}`);

    try {
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        const moviesList = [];

        // استهداف عناصر الأفلام بناءً على كلاس poster
        $('a.poster').each((index, element) => {
            try {
                const elem = $(element);
                const link = elem.attr('href')?.trim() || '';
                const titleAttr = elem.attr('title')?.trim() || '';

                // استخراج الصورة
                const imgTag = elem.find('img');
                let image = imgTag.attr('src')?.trim() || imgTag.attr('data-src')?.trim() || '';

                // استخراج الميتا (السنة والتقييم)
                const metaSpans = elem.find('div.poster-meta span');
                const year = $(metaSpans[0]).text().trim();
                const imdb = $(metaSpans[2]).text().trim();

                // استخراج العنوان واللغة
                const title = elem.find('strong.poster-title').text().trim() || titleAttr;
                const lang = elem.find('span.poster-lang').text().replace(/\s+/g, ' ').trim();

                moviesList.push({
                    title,
                    link,
                    image,
                    year,
                    imdb,
                    language: lang
                });
            } catch (err) {
                console.error('خطأ في استخراج بيانات فيلم معين:', err.message);
            }
        });

        // حفظ الملف بصيغة JSON
        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(` تم حفظ ${moviesList.length} فيلم بنجاح في movies.json`);

    } catch (error) {
        console.error('خطأ أثناء جلب صفحة الأفلام:', error.message);
    }
}

async function scrapeSeries() {
    const url = 'https://www.hdfilmcehennemi.nl/yabancidiziizle-5/';
    console.log(`جاري جلب المسلسلات من: ${url}`);

    try {
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        const seriesList = [];

        // استهداف عناصر المسلسلات بناءً على كلاس mini-poster
        $('a.mini-poster').each((index, element) => {
            try {
                const elem = $(element);
                const link = elem.attr('href')?.trim() || '';

                // استخراج الصورة
                const imgTag = elem.find('img');
                const image = imgTag.attr('src')?.trim() || imgTag.attr('data-src')?.trim() || '';

                // استخراج معلومات الحلقة والعنوان والوقت
                const episodeInfo = elem.find('div.mini-poster-episode-info').text().replace(/\s+/g, ' ').trim();
                const title = elem.find('h4.mini-poster-title').text().trim();
                const date = elem.find('time.episode-date').text().trim();
                const lang = elem.find('span.mini-poster-lang').text().replace(/\s+/g, ' ').trim();

                seriesList.push({
                    title,
                    episode: episodeInfo,
                    link,
                    image,
                    date,
                    language: lang
                });
            } catch (err) {
                console.error('خطأ في استخراج بيانات مسلسل معين:', err.message);
            }
        });

        // حفظ الملف بصيغة JSON
        fs.writeFileSync('series.json', JSON.stringify(seriesList, null, 4), 'utf-8');
        console.log(` تم حفظ ${seriesList.length} حلقة مسلسل بنجاح في series.json`);

    } catch (error) {
        console.error('خطأ أثناء جلب صفحة المسلسلات:', error.message);
    }
}

// تشغيل الدوال بالتتابع
async function main() {
    await scrapeMovies();
    console.log('-'.repeat(30));
    await scrapeSeries();
}

main();
