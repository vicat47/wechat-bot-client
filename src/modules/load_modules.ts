import * as fs from "fs";
import * as path from "path";

function load(path: string, name: string) {
    if (name) {
        return require(path + name);
    }
    return require(path);
};

export default function (dir: string) {
    let patcher: {
        [key: string] : any
    } = {}

    let dirs = fs.readdirSync(__dirname + '/' + dir);
    for (let moduleDir of dirs) {
        if (fs.statSync(`${ __dirname }/${ dir }/${ moduleDir }`).isDirectory()) {
            let name = path.basename(moduleDir);
            let isDisabled = false;

            try {
                fs.accessSync(`${ __dirname }/${ dir }/${ moduleDir }/disabled.ts`, fs.constants.F_OK);
                isDisabled = true;
            } catch(err) {}
            try {
                fs.accessSync(`${ __dirname }/${ dir }/${ moduleDir }/disabled.js`, fs.constants.F_OK);
                isDisabled = true;
            } catch(err) {}
            if (isDisabled) {
                console.log(`模块 ${name} 已跳过（通过 disabled.js）`);
                continue;
            }
            
            let _load = load.bind(null, './' + name + '/', "service");

            patcher[name] = _load;
        }
    }

    return patcher;
}