import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class SysConfig {
    @PrimaryGeneratedColumn()
    id!: number;
    @Column()
    name!: string;
    @Column()
    key!: string;
    @Column()
    value!: string;
    @Column()
    type!: string;
    @CreateDateColumn({name: "create_time"})
    createTime!: string;
}
