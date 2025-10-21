import WebSocket from "ws";
import { IConnectionManager, ConnectionEvent } from "../connection_manager";

type Options = {
    /**
     * 最大重连次数；不设置（undefined）表示无限重连
     */
    maxReconnectAttempts?: number;
    baseReconnectDelayMs?: number;
    /**
     * 最大重连延迟（ms），默认 1 小时
     */
    maxReconnectDelayMs?: number;
    autoReconnect?: boolean;
};

class WebSocketConnectionManager implements IConnectionManager {
    private ws?: WebSocket;
    private url?: string;
    private manualClose: boolean = false;
    private reconnectTimer?: NodeJS.Timeout;
    private reconnectAttempts: number = 0;
    /**
     * 当为 undefined 时表示无限重连
     */
    private readonly maxReconnectAttempts?: number;
    private readonly baseReconnectDelay: number;
    private readonly maxReconnectDelay: number;
    private readonly autoReconnect: boolean;
    private listeners: Map<ConnectionEvent, Set<(...args: any[]) => void>> = new Map();

    constructor(opts?: Options) {
        // 不设置 maxReconnectAttempts 即为永久重连
        this.maxReconnectAttempts = opts?.maxReconnectAttempts;
        this.baseReconnectDelay = opts?.baseReconnectDelayMs ?? 1000;
        // 默认最大延迟设为 1 小时（3600000 ms）
        this.maxReconnectDelay = opts?.maxReconnectDelayMs ?? 3600_000;
        this.autoReconnect = opts?.autoReconnect ?? true;
    }

    async connect(url: string, timeoutMs = 15000): Promise<void> {
        this.manualClose = false;
        this.url = url;
        // 如果已有连接，先关闭（避免重复）
        if (this.ws) {
            try { this.ws.removeAllListeners(); this.ws.terminate(); } catch (e) { /* ignore */ }
            this.ws = undefined;
        }
        return new Promise<void>((resolve, reject) => {
            this.clearReconnectTimer();
            this.createWebSocket(url, resolve, reject);
            const to = setTimeout(() => {
                clearTimeout(to);
                reject(new Error("websocket connect timeout"));
            }, timeoutMs);
        });
    }

    private createWebSocket(url: string, resolve?: () => void, _reject?: (err: any) => void) {
        this.ws = new WebSocket(url);
        this.ws.on("open", () => {
            this.reconnectAttempts = 0;
            this.clearReconnectTimer();
            this.emit("open");
            if (resolve) resolve();
        });
        this.ws.on("message", (data) => this.emit("message", data));
        this.ws.on("error", (err) => {
            this.emit("error", err);
            // 不在这里直接重连，等待 close 事件统一处理
        });
        this.ws.on("close", (code, reason) => {
            this.emit("close", code, reason);
            if (!this.manualClose && this.autoReconnect) {
                this.scheduleReconnect();
            }
        });
    }

    private scheduleReconnect() {
        // 当 maxReconnectAttempts 未定义时视为无限重连
        if (this.maxReconnectAttempts !== undefined && this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`ConnectionManager: reach max reconnect attempts ${this.maxReconnectAttempts}`);
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        const attemptsInfo = this.maxReconnectAttempts !== undefined ? `#${this.reconnectAttempts}/${this.maxReconnectAttempts}` : `#${this.reconnectAttempts}/∞`;
        console.log(`ConnectionManager: will try reconnect ${attemptsInfo} after ${delay}ms`);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (!this.url) return;
            try {
                this.createWebSocket(this.url);
            } catch (e) {
                console.error("ConnectionManager reconnect creation failed:", e);
                // 继续安排下一次重连（无限或直到达到上限）
                this.scheduleReconnect();
            }
        }, delay);
    }

    async close(manual = true): Promise<void> {
        this.manualClose = manual;
        this.clearReconnectTimer();
        if (this.ws) {
            try { this.ws.removeAllListeners(); this.ws.terminate(); } catch (e) { /* ignore */ }
            this.ws = undefined;
        }
    }

    send(data: string | Buffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
            return;
        }
        throw new Error("ConnectionManager: websocket not open");
    }

    on(event: ConnectionEvent, handler: (...args: any[]) => void) {
        const set = this.listeners.get(event) ?? new Set();
        set.add(handler);
        this.listeners.set(event, set);
    }

    off(event: ConnectionEvent, handler: (...args: any[]) => void) {
        const set = this.listeners.get(event);
        if (set) set.delete(handler);
    }

    isOpen(): boolean {
        return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
    }

    private emit(event: ConnectionEvent, ...args: any[]) {
        const set = this.listeners.get(event);
        if (!set) return;
        for (const h of Array.from(set)) {
            try { h(...args); } catch (e) { console.error("ConnectionManager handler error:", e); }
        }
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
    }
}

export default WebSocketConnectionManager;
