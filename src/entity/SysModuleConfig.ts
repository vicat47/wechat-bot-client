import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {SysModule} from "#/entity/SysModule";

@Entity()
export class SysModuleConfig {
    @PrimaryGeneratedColumn()
    id!: string;
    @Column({ name: 'sys_module_id'})
    sysModuleId!: string;
    @Column()
    key!: string;
    @Column()
    value!: string;
    @Column({name: "user_id"})
    userId!: string;
    @Column({name: "group_id"})
    groupId!: string;
    @Column()
    type!: string;
    @CreateDateColumn({name: "create_time"})
    createTime!: string;
    @Column()
    enable!: string;
    @ManyToOne(() => SysModule, (module) => module.configs, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn({ name: "sys_module_id", referencedColumnName: "id" })
    sysModule!: SysModule;
}
