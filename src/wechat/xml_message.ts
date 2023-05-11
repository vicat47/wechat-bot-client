import { XMLParser, XMLValidator } from 'fast-xml-parser'

// 这里是订阅号内容捏

export interface WechatXML {
    msg: Msg
}

export interface Msg {
    appmsg: Appmsg
    fromusername: string
    appinfo: Appinfo
    scene?: string
    commenturl?: string
}

export interface Appmsg {
    "-sdkver"?: string
    title: string
    des: string
    type: string
    showtype: string
    contentattr?: string
    url: string
    appattach: Appattach
    mmreader: Mmreader
    thumburl: string
    // 这个是转发追加的
    action?: string
    content?: string
    dataurl?: string
    lowurl?: string
    lowdataurl?: string
    recorditem?: string
    messageaction?: string
    md5?: string
    extinfo?: string
    sourceusername?: string
    sourcedisplayname?: string
    commenturl?: string
    weappinfo?: Weappinfo
    websearch?: string
}

export interface Weappinfo {
    pagepath: string
    username: string
    appid: string
    appservicetype: string
}

export interface Appattach {
    totallen: string
}

// 订阅号消息捏
export interface Mmreader {
    category: Category
    publisher: Publisher
    forbid_forward: string
}

export interface Category {
    "-type"?: string
    "-count"?: string
    name: string
    topnew: Topnew
    item: Item[]
}

/**
 * 最新文章
 */
export interface Topnew {
    cover: string
    width: string
    height: string
    digest: string
}

/**
 * 文章实体
 */
export interface Item {
    itemshowtype: string
    title: string
    url: string
    pub_time: string
    cover: string
    digest?: string
    fileid: string
    sources: Sources
    del_flag: string
    contentattr: string
    play_length: string
    music_source: string
    pic_num: string
    comment_topic_id: string
    cover_235_1: string
    cover_1_1: string
    appmsg_like_type: string
    video_width: string
    video_height: string
    is_pay_subscribe: string
    finder_feed: FinderFeed
}

export interface Sources {
    source: Source
}

export interface Source {
    name: string
}

export interface FinderFeed {
    feed_type: string
    media_count: string
    media_list: string
    mega_video: MegaVideo
}

export interface MegaVideo { }

export interface Publisher {
    username: string
    nickname: string
}

export interface Appinfo {
    version: string
    appname: string
    isforceupdate?: string
}

export class WechatXMLMessage implements WechatXML {
    msg: Msg
    constructor (xml: string) {
        if (XMLValidator.validate(xml)) {
            const parser = new XMLParser();
            this.msg = parser.parse(xml).msg;
        } else {
            throw new Error("cannot convert xml...");
        }
    }
}

export interface XMLMessageProcessor {
    onMessage(): Promise<string>
    onReceve(xmlMessage: WechatXMLMessage): Promise<string | undefined>
}