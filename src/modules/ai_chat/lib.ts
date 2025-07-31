import NodeCache from "node-cache";
import BaseWechatMessage from "#wechat/base_wechat";

export interface IMessage {
    role: string
    content: string
}

export abstract class BaseAiChatService {
    protected readonly historyManager: HistoryManager<IMessage>;
    constructor(historyManager: HistoryManager<IMessage>) {
        this.historyManager = historyManager;
    }
    abstract chat(message: BaseWechatMessage, content: string, target: string): Promise<string[]>;
    abstract saveToken(message: BaseWechatMessage, replyMessage: any): Promise<any>;
    clearHistory(target: string): boolean {
        return this.historyManager.clearHistory(target);
    }
    clearAll(target: string): boolean {
        return this.historyManager.clearAll(target);
    }
}

export abstract class HistoryManager<T> {
    protected readonly historyCache: NodeCache;
    constructor() {
        this.historyCache = new NodeCache({
            stdTTL: 3600,
            checkperiod: 1200,
            useClones: false,
        });
    }

    abstract setPrompt(target: string, prompt: string): boolean;
    abstract clearHistory(target: string): boolean;

    public get(target: string): T[] | undefined {
        return this.historyCache.get<T[]>(target);
    }
    public append(target: string, item: T): T[] {
        let history = this.get(target);
        if (history === undefined) {
            history = [item];
            this.historyCache.set(target, history);
            return history;
        }
        history.push(item);
        this.historyCache.set(target, history);
        return history;
    }
    public clearAll(target: string): boolean {
        let count = this.historyCache.del(target);
        if (count > 0) {
            return true;
        }
        return false;
    }
}

export class EmptyHistoryManager extends HistoryManager<IMessage> {

    get(target: string): IMessage[] | undefined {
        return undefined;
    }

    public append(target: string, item: IMessage): IMessage[] {
        return [];
    }

    public clearAll(target: string): boolean {
        return false;
    }

    setPrompt(target: string, prompt: string): boolean {
        return false;
    }

    clearHistory(target: string): boolean {
        return false;
    }
}
