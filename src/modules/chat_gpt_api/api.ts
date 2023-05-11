export interface IChatGPTReply {
    id: string
    object: string
    created: number
    model: string
    usage: IUsage
    choices: IChoice[]
}

export interface IChatGPTSendMessage {
    model: string
    messages: IMessage[]
    temperature?: number
}

export interface IUsage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export interface IChoice {
    message: IMessage
    finish_reason: string
    index: number
}

export interface IMessage {
    role: string
    content: string
}

export interface IChatHistoryHolder {
    [k: string]: IMessage[]
}