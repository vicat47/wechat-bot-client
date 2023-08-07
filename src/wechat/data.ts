export interface IBaseContentMessage<T> {
	content: T[];
	id: string;
	type: number;
}

/**
 * 用户
 */
export interface IUserContent {
	headimg: string;
	name: string;
	node: number;
	remarks: string;
	wxcode: string;
	wxid: string;
}

/**
 * 群组
 */
export interface IGroupUserContent {
	address: number;
	member: string[];
	room_id: string;
}