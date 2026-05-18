import {
    Chapter,
    ChapterDetails,
    ContentRating,
    SourceManga,
    PartialSourceManga,
    PagedResults,
    Response,
    SearchRequest,
    Source,
    SourceInfo,
    SourceIntents,
    Tag,
    TagSection,
} from '@paperback/types'

export const MangaKakalotInfo: SourceInfo = {
    version: '1.0.0',
    name: 'MangaKakalot',
    icon: 'icon.png',
    author: 'Cusa9227',
    authorWebsite: 'https://github.com/Cusa9227',
    description: 'Extension that pulls manga from MangaKakalot',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: 'https://mangakakalot.com',
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
}

export class MangaKakalot extends Source {
    baseUrl = 'https://mangakakalot.com'

    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
    })

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({ url: `${this.baseUrl}/manga/${mangaId}`, method: 'GET' })
        const response: Response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const title = $('.manga-info-text h1').text().trim()
        const author = $('.manga-info-text li:contains("Author") a').text().trim()
        const desc = $('#contentBox').text().trim()
        const image = $('.manga-info-pic img').attr('src') ?? ''
        const isOngoing = $('.manga-info-text li:contains("Status")').text().includes('Ongoing')
        const tags: Tag[] = []
        $('.manga-info-text .manga-info-genre a').each((_: any, el: any) => {
            const label = $(el).text().trim()
            tags.push(App.createTag({ id: label.toLowerCase(), label }))
        })
        const tagSection: TagSection = App.createTagSection({ id: 'genres', label: 'Genres', tags })
        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [title],
                image,
                author,
                desc,
                status: isOngoing ? 'Ongoing' : 'Completed',
                tags: [tagSection],
            })
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({ url: `${this.baseUrl}/manga/${mangaId}`, method: 'GET' })
        const response: Response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const chapters: Chapter[] = []
        $('.chapter-list .row').each((index: any, el: any) => {
            const anchor = $('a', el)
            const href = anchor.attr('href') ?? ''
            const name = anchor.text().trim()
            const id = href.split('/').pop() ?? ''
            const match = name.match(/chapter[- ]?(\d+(\.\d+)?)/i)
            const chapNum = match ? parseFloat(match[1] ?? '0') : index
            chapters.push(App.createChapter({
                id,
                name,
                chapNum,
                langCode: '🇬🇧',
            }))
        })
        return chapters
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({ url: `${this.baseUrl}/chapter/${mangaId}/${chapterId}`, method: 'GET' })
        const response: Response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const pages: string[] = []
        $('.container-chapter-reader img').each((_: any, el: any) => {
            const src = $(el).attr('src')
            if (src) pages.push(src)
        })
        return App.createChapterDetails({ id: chapterId, mangaId, pages })
    }

    async getSearchResults(query: SearchRequest, _metadata: any): Promise<PagedResults> {
        const searchTerm = encodeURIComponent(query.title ?? '')
        const request = App.createRequest({ url: `${this.baseUrl}/search/story/${searchTerm}`, method: 'GET' })
        const response: Response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const tiles: PartialSourceManga[] = []
        $('.story-item').each((_: any, el: any) => {
            const anchor = $('h3.story-name a', el)
            const href = anchor.attr('href') ?? ''
            const id = href.split('/').pop() ?? ''
            const title = anchor.text().trim()
            const image = $('img', el).attr('src') ?? ''
            if (id && title) tiles.push(App.createPartialSourceManga({ mangaId: id, title, image }))
        })
        return App.createPagedResults({ results: tiles })
    }
}
