import {Column, Entity, PrimaryColumn} from "typeorm";
import {IWechatConfig} from "#/config";

@Entity()
export class SysClient implements IWechatConfig {
    @PrimaryColumn()
    id!: string;
    @Column({name: "http_url"})
    httpUrl!: string;
    @Column({name: "websocket_url"})
    webSocketUrl!: string;
    @Column({name: "mqtt_url"})
    mqttUrl!: string;
    @Column()
    name!: string;
    @Column({name: "client_type"})
    clientType!: 0 | 1;
    @Column({name: "create_time"})
    createTime!: string;
}
