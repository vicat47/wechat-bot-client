import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class SysUserGroup {
    @PrimaryGeneratedColumn()
    id!: string;
    @Column({name: "user_id"})
    userId!: string;
    @Column({name: "group_id"})
    groupId!: string;
    @Column({name: "nick_name"})
    nickName!: string;
    @CreateDateColumn({name: "create_time"})
    createTime!: string;
}
