import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class SysGroup {
    @PrimaryColumn()
    id!: string;
    @Column()
    name!: string;
    @Column({name: "nick_name"})
    nickName!: string;
    @Column("time with time zone", {name: "create_time"})
    createTime!: string;
}