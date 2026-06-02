const cheerio = require('cheerio');
const fs = require('fs');

// استخدام بوابة بروكسب قوية تقوم بتشغيل الجافاسكريبت وتخطي حماية Cloudflare تماماً
function getBypassUrl(targetUrl) {
    return `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
}

async function scrapeMovies() {
    const targetUrl = 'https://www.hdfilmcehennemi.nl/category/film-izle-2/';
    console.log(`🚀 جاري جلب الأفلام من: ${targetUrl}`);

    try {
        // إضافة مرونة في الطلب: نقوم بطلب الصفحة عبر الخدمة الوسيطة مع ترويسة متصفح حقيقي
        const response = await fetch(getBypassUrl(targetUrl), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        if (!response.ok) throw new Error(`فشل الاتصال: ${response.status}`);
        
        const jsonResult = await response.json();
        let htmlData = jsonResult.contents;

        if (!htmlData) throw new Error("المحتوى فارغ");

        const $ = cheerio.load(htmlData);
        const moviesList = [];

        // السحب المرن: يبحث عن الروابط التي تحتوي على الكلاس poster أو تبدأ برابط الفيلم
        $('a').each((index, element) => {
            const elem = $(element);
            const href = elem.attr('href') || '';
            
            // التحقق من أن الرابط يطابق كلاس الفيلم أو هيكل البوستر المرفق
            if (elem.hasClass('poster') || href.includes('hdfilmcehennemi.nl/')) {
                const title = elem.attr('title')?.trim() || elem.find('strong.poster-title').text().trim();
                const link = href.trim();
                
                // تخطي الروابط العامة أو المكررة
                if (!title || link.includes('/category/') || link.includes('/yabancidizi')) return;

                const imgTag = elem.find('img');
                const image = imgTag.attr('src') || imgTag.attr('data-src') || imgTag.attr('data-srcset') || '';

                const metaSpans = elem.find('.poster-meta span, span');
                const year = $(metaSpans[0]).text().trim() || "غير محدد";
                const imdb = elem.find('.imdb').text().trim() || "0.0";

                const lang = elem.find('.poster-lang').text().replace(/\s+/g, ' ').trim() || "Türkçe";

                // منع تكرار نفس الفيلم في المصفوفة
                if (!moviesList.some(m => m.link === link)) {
                    moviesList.push({
                        title,
                        link,
                        image: image.split(' ')[0], // جلب أول رابط صورة فقط في حال وجود srcset
                        year,
                        imdb: imdb.replace(/[^0-9.]/g, ''), // استخراج الرقم فقط
                        language: lang
                    });
                }
            }
        });

        fs.writeFileSync('movies.json', JSON.stringify(moviesList, null, 4), 'utf-8');
        console.log(`✅ تم استخراج ${moviesList.length} فيلم بنجاح!`);
        
    } catch (error) {
        console.error(`❌ خطأ في الأفلام: ${error.message}`);
        if (!fs.existsSync('movies.json')) fs.writeFileSync('movies.json', '[]', 'utf-8');
    }
}

async function scrapeSeries() {
    const targetUrl = 'https://www.hdfilmcehennemi.nl/yabancidiziizle-5/';
    console.log(`🚀 جاري جلب المسلسلات من: ${targetUrl}`);

    try {
        const response = await fetch(getBypassUrl(targetUrl), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        if (!response.ok) throw new Error(`فشل الاتصال: ${response.status}`);
        
        const jsonResult = await response.json();
        const htmlData = jsonResult.contents;

        if (!htmlData) throw new Error("المحتوى فارغ");

        const $ = cheerio.load(htmlData);
        const seriesList = [];

        // السحب المرن للمسلسلات بناءً على كلاس mini-poster أو روابط الحلقات /dizi/
        $('a').each((index, element) => {
            const elem = $(element);
            const href = elem.attr('href') || '';

            if (elem.hasClass('mini-poster') || href.includes('/dizi/')) {
                const link = href.trim();
                const title = elem.find('.mini-poster-title').text().trim() || elem.attr('alt')?.trim();
                
                if (!title) return;

                const imgTag = elem.find('img');
                const image = imgTag.attr('src') || imgTag.attr('data-src') || '';

                const episodeInfo = elem.find('.mini-poster-episode-info').text().replace(/\s+/g, ' ').trim() || "1. Sezon";
                const date = elem.find('time').text().trim() || "اليوم";
                const lang = elem.find('.mini-poster-lang').text().trim() || "Türkçe";

                if (!seriesList.some(s => s.link === link)) {
                    seriesList.push({
                        title,
                        episode: episodeInfo,
                        link,
                        image,
                        date,
                        language: lang
                    });
                }
            }
        });

        fs.writeFileSync('series.json', JSON.stringify(seriesList, null, 4), 'utf-8');
        console.log(`✅ تم استخراج ${seriesList.length} حلقة مسلسل بنجاح!`);
        
    } catch (error) {
        console.error(`❌ خطأ في المسلسلات: ${error.message}`);
        if (!fs.existsSync('series.json')) fs.writeFileSync('series.json', '[]', 'utf-8');
    }
}

async function main() {
    await scrapeMovies();
    console.log('-'.repeat(30));
    await scrapeSeries();
}

main();
