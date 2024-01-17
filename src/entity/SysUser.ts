import {Column, CreateDateColumn, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class SysUser {
    @PrimaryColumn()
    id!: string;
    @Column()
    name!: string;
    @Column({name: "nick_name"})
    nickName!: string;
    @Column({name: "user_type"})
    userType!: string;
    @CreateDateColumn({name: "create_time"})
    createTime!: string;
}
