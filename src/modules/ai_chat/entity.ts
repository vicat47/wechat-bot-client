import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity({
    name: "mod_chat_gpt_api_model_request"
})
export class ChatGptRequest {
    @PrimaryGeneratedColumn()
    id!: string;
    @Column({name: "remote_id"})
    remoteId!: string;
    @Column({name: "user_id"})
    userId!: string;
    @Column({name: "group_id"})
    groupId!: string;
    @Column()
    model!: string;
    @Column({name: "define_price"})
    definePrice!: string;
    @Column({name: "completion_tokens"})
    completionTokens!: number;
    @Column({name: "prompt_tokens"})
    promptTokens!: number;
    @Column({name: "total_tokens"})
    totalTokens!: number;
    @Column()
    price!: number;
    @Column({name: "create_time"})
    createTime!: string;
}
