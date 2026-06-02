const cheerio = require('cheerio');
const fs = require('fs');

// استخدام بروكسب وسيط مجاني لتخطي حظر جدار حماية الموقع لخوادم الجيتهاب (Error 451)
function getBypassUrl(targetUrl) {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
}

async function scrapeMovies() {
    const targetUrl = 'https://www.hdfilmcehennemi.nl/category/film-izle-2/';
    const bypassUrl = getBypassUrl(targetUrl);
    console.log(`جاري جلب الأفلام (عبر البوابة الآمنة) من: ${targetUrl}`);

    try {
        const response = await fetch(bypassUrl, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(`فشل الاتصال بالبوابة الآمنة: ${response.status}`);
        
        const jsonResult = await response.json();
        const htmlData = jsonResult.contents; // استخراج الـ HTML النظيف للموقع الأصلي

        if (!htmlData) throw new Error("لم يتم استرجاع أي محتوى من الموقع.");

        const $ = cheerio.load(htmlData);
        const moviesList = [];

        // استخراج الأفلام بناءً على هيكل الـ HTML المرسل
        $('a.poster').each((index, element) => {
            try {
                const elem = $(element);
                const link = elem.attr('href')?.trim() || '';
                const titleAttr = elem.attr('title')?.trim() || '';

                const imgTag = elem.find('img');
                let image = imgTag.attr('src')?.trim() || imgTag.attr('data-src')?.trim() || '';

                const metaSpans = elem.find('div.poster-meta span');
                const year = $(metaSpans[0]).text().trim();
                const imdb = $(metaSpans[2]).text().trim();

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

        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ نجح السحب! تم حفظ ${moviesList.length} فيلم في movies.json`);
    } catch (error) {
        console.error(`❌ خطأ أثناء جلب صفحة الأفلام: ${error.message}`);
        // إنشاء مصفوفة فارغة لحماية سير العمل من الانهيار
        if (!fs.existsSync('movies.json') || fs.readFileSync('movies.json', 'utf-8') === '') {
            fs.writeFileSync('movies.json', '[]', 'utf-8');
        }
    }
}

async function scrapeSeries() {
    const targetUrl = 'https://www.hdfilmcehennemi.nl/yabancidiziizle-5/';
    const bypassUrl = getBypassUrl(targetUrl);
    console.log(`جاري جلب المسلسلات (عبر البوابة الآمنة) من: ${targetUrl}`);

    try {
        const response = await fetch(bypassUrl, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(`فشل الاتصال بالبوابة الآمنة: ${response.status}`);
        
        const jsonResult = await response.json();
        const htmlData = jsonResult.contents;

        if (!htmlData) throw new Error("لم يتم استرجاع أي محتوى من الموقع.");

        const $ = cheerio.load(htmlData);
        const seriesList = [];

        // استخراج المسلسلات بناءً على هيكل الـ HTML المرسل
        $('a.mini-poster').each((index, element) => {
            try {
                const elem = $(element);
                const link = elem.attr('href')?.trim() || '';

                const imgTag = elem.find('img');
                const image = imgTag.attr('src')?.trim() || imgTag.attr('data-src')?.trim() || '';

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

        fs.writeFileSync('series.json', JSON.stringify(seriesList, null, 4), 'utf-8');
        console.log(`✅ نجح السحب! تم حفظ ${seriesList.length} حلقة مسلسل في series.json`);
    } catch (error) {
        console.error(`❌ خطأ أثناء جلب صفحة المسلسلات: ${error.message}`);
        // إنشاء مصفوفة فارغة لحماية سير العمل من الانهيار
        if (!fs.existsSync('series.json') || fs.readFileSync('series.json', 'utf-8') === '') {
            fs.writeFileSync('series.json', '[]', 'utf-8');
        }
    }
}

async function main() {
    await scrapeMovies();
    console.log('-'.repeat(30));
    await scrapeSeries();
}

main();
