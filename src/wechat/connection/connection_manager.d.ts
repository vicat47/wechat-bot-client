export type ConnectionEvent = 'open' | 'message' | 'close' | 'error';

export interface IConnectionManager {
    /**
     * connect 并在建立连接时 resolve；超时时间可选（ms）
     */
    connect(url: string, timeoutMs?: number): Promise<void>;

    /**
     * 关闭连接，manual 表示是否为手动关闭（用于控制是否自动重连）
     */
    close(manual?: boolean): Promise<void>;

    /**
     * 发送数据（字符串或二进制）
     */
    send(data: string | Buffer): void;

    /**
     * 注册事件
     */
    on(event: ConnectionEvent, handler: (...args: any[]) => void): void;

    /**
     * 移除事件
     */
    off(event: ConnectionEvent, handler: (...args: any[]) => void): void;

    /**
     * 是否已打开
     */
    isOpen(): boolean;
}