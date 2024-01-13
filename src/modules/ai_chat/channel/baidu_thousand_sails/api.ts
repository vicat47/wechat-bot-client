import {IMessage} from "#/modules/ai_chat/lib";

export interface IBaiduThousandSailsReply {
    id: string;
    object: string;
    created: number;
    sentence_id: number;
    is_end?: boolean;
    is_truncated: boolean;
    need_clear_history: boolean;
    result: string;
    ban_round?: number;
    usage: IUsage;
}

export interface IBaiduThousandSailsSendMessage {
    messages: IMessage[];
    temperature?: number;
    top_p?: number;
    penalty_score?: number;
    stream?: boolean;
    user_id?: string;
}

export interface IUsage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export interface IChatHistoryHolder {
    [k: string]: IMessage[]
}
