export interface IJenkinsMainPageApi {
	"_class": string;
	assignedLabels: IAssignedLabel[];
	mode: string;
	nodeDescription: string;
	nodeName: string;
	numExecutors: number;
	description: void /* 未知类型 */;
	jobs: IJob[];
	overallLoad: IOverallLoad;
	primaryView: IPrimaryView;
	quietDownReason: void /* 未知类型 */;
	quietingDown: boolean;
	slaveAgentPort: number;
	unlabeledLoad: IUnlabeledLoad;
	url: string;
	useCrumbs: boolean;
	useSecurity: boolean;
	views: IView[];
}


/* 自动生成的 Interface */
interface IView {
	"_class": string;
	name: string;
	url: string;
}


interface IUnlabeledLoad {
	"_class": string;
}


interface IPrimaryView {
	"_class": string;
	name: string;
	url: string;
}


interface IOverallLoad {
}

interface IJob {
	"_class": string;
	name: string;
	url: string;
	color: string;
}

interface IAssignedLabel {
	name: string;
}