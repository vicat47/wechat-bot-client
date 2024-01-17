import {Column, CreateDateColumn, Entity, PrimaryColumn} from "typeorm";

@Entity()
export class SysGroup {
    @PrimaryColumn()
    id!: string;
    @Column()
    name!: string;
    @Column({name: "nick_name"})
    nickName!: string;
    @CreateDateColumn({name: "create_time"})
    createTime!: string;
}
