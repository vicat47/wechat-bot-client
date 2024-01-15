export interface IBaseContentMessage<T> {
	content: T[];
	id: string;
	type: number;
}

export interface IPersonalInfo {
	id: string;
	name: string;
	code: string;
	/**
	 * 头像
	 */
	headImage: string;
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

/**
 * 群用户昵称
 */
export interface IGroupUserNickContent {
	nick: string;
	roomid: string;
	wxid: string;
}
