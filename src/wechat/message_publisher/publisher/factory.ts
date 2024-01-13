import {IWechatConfig} from "#/config";
import {MqttPublisher} from "#wechat/message_publisher/publisher/mqtt_publisher";
import {LocalPublisher} from "#wechat/message_publisher/publisher/local_publisher";
import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import {DisabledPublisher} from "#wechat/message_publisher/publisher/disabled_publisher";
import {BaseWechatClient} from "#wechat/clients/wechat_client";

export type publisherType = 'mqtt' | 'local' | 'disabled';

export function publisherFactory(type: publisherType, config: IWechatConfig, client: BaseWechatClient): BaseMessagePublisher {
    switch (type) {
        case "mqtt":
            return new MqttPublisher(config, client);
        case "local":
            return new LocalPublisher(config, client);
        case "disabled":
            return new DisabledPublisher(config, client);
    }
}
