import {AppDataSource} from "#/data_source";
import {SysClient} from "#entity/SysClient";

const sysClientRepository = AppDataSource.getRepository(SysClient);

export async function saveSysClient(client: SysClient) {
    return await sysClientRepository.save(client);
}

export async function insertSysClient(client: SysClient): Promise<SysClient> {
    await sysClientRepository.createQueryBuilder()
        .insert()
        .into(SysClient, ["id", "httpUrl", "webSocketUrl", "mqttUrl", "name", "clientType"])
        .values(client)
        .execute();
    return client;
}

export async function updateSysClientPersonInfo(beforeId: string, client: SysClient) {
    await sysClientRepository.createQueryBuilder()
        .update()
        .set({
            id: client.id,
            name: client.name,
        })
        .where("id = :id", {id: beforeId})
        .execute();
    return client;
}
