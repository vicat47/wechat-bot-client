export interface IHomeAssistantState<T extends BaseHomeAssistantAttribute> {
    "entity_id": string;
    state: string;
    attributes: T;
    "last_changed": string;
    "last_updated": string;
    context: IContext;
}

export interface BaseHomeAssistantAttribute {
    "entity_class": string;
    "parent_entity_id": string;
    "service_description": string;
    "property_description": string;
    "unit_of_measurement": string;
    "friendly_name": string;
    "supported_features": number;
    "device_class"?: string;
}

/* 自动生成的 Interface */

interface IContext {
    id: string;
    "parent_id": void;
    "user_id": void;
}


export interface IPM25Attribute extends BaseHomeAssistantAttribute {
    "environment.pm2_5_density": number;
}

export interface ITemperatureAttribute extends BaseHomeAssistantAttribute {
    "environment.temperature": number;
}

export interface IHumidityAttribute extends BaseHomeAssistantAttribute {
    "environment.relative_humidity": number;
}