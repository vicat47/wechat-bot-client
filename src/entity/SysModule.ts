import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {SysModuleConfig} from "#/entity/SysModuleConfig";

@Entity()
export class SysModule {
    @PrimaryGeneratedColumn()
    id!: string;
    @Column()
    code!: string;
    @Column()
    name!: string;
    @Column({name: "module_code"})
    moduleCode!: string;
    @Column({name: "client_id"})
    clientId!: string;
    @Column()
    type!: string;
    @Column()
    priority!: number;
    @Column()
    enable!: string;
    @Column({name: "create_time"})
    createTime!: string;
    @OneToMany(() => SysModuleConfig, (moduleConfig) => moduleConfig.sysModule, {
        createForeignKeyConstraints: false,
    })
    configs!: SysModuleConfig[]
}
