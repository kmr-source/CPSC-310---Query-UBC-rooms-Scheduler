import {InsightDatasetKind} from "./IInsightFacade";
import DataSetObject from "./DataSetObject";
import DiskDataHandler from "./DiskDataHandler";


interface IDataType { [index: string]: string | number; }
export default class MemoryStructure {
    // to access the memory to get ID kind mem[id].kind id is the key kind is the what you return
    // access kind of id do mem[id string name].kind
    private mem: { [indexId: string]:
            { DataID: string, kind: InsightDatasetKind, data: DataSetObject[], dataArr: IDataType[]}} = {};
    // private dataArr: IDataType[] = [];
    // private fileHandle: any;

    constructor() {
        this.mem = null;
    }

    /*public addDataset(data: DataSetObject[]) {
        return null;
    }*/
    public getDataArr(datasetId: string): Promise<IDataType[]> {
        if (this.mem !== null) {
            let dataset = this.mem[datasetId];
            if (dataset !== undefined) {
                let dataArr: IDataType[] = dataset.dataArr;
                if (dataArr !== null && dataArr !== undefined && dataArr.length !== 0) {
                    return Promise.resolve(dataArr);
                }
            } else {
                delete this.mem[datasetId];
            }
        }
        // else
        return this.readData(datasetId)
                .then( (datasetObjArr: DataSetObject[]) => {
                    return DiskDataHandler.readAllCourseDataIntoJsonAsync(datasetObjArr)
                        .then((result) => {
                            this.mem[datasetId].dataArr = result;
                            return result;
                        }); // Dose not access the disk
                });
    }

    private addElement(idData: string, kind: string, loadData: DataSetObject[]): void {
        if (this.mem === null || this.mem === undefined) {
            this.mem = {};
        }
        let newElement: { [indexId: string]: { DataID: string, kind: InsightDatasetKind,
                data: DataSetObject[], dataArr: IDataType[] } } = {};
        newElement[idData] = {DataID: "", kind: null , data: [], dataArr: [] };
        this.mem = {...this.mem, ...newElement}; // This adds the newElement to out object
        this.mem[idData].DataID = idData;
        this.mem[idData].kind = kind === "courses" ?
            InsightDatasetKind.Courses :
            InsightDatasetKind.Rooms; // mem[idData] adds the key idData to mem --> {idData: {...}}
        this.mem[idData].data = loadData;
    }

    // this is loading data to mem and to our disk
    public loadData(loadData: DataSetObject[]): Promise<DataSetObject[]> {
        let kind = loadData[0].getKind();
        let idData = loadData[0].getDatasetId();
        this.addElement(idData, kind, loadData);
        return DiskDataHandler.loadDataAsync(loadData);
    }

    private loadDataLocal(loadData: DataSetObject[]): void {
        if (loadData === null || loadData === undefined || loadData === []) {
            return;
        }
        let kind = loadData[0].getKind();
        let idData = loadData[0].getDatasetId();
        this.addElement(idData, kind, loadData);
    }

    // reads the data from our mem and disk
    public removeData(id: string): Promise<string> {
        // TODO: check if it works?
        if (this.mem !== null) {
            if (this.mem[id] !== undefined) {
                if (id === this.mem[id].DataID) {
                    delete this.mem[id];
                }
            } else {
                delete this.mem[id];
            }
        }
        return DiskDataHandler.removeDatasetAsync(id);
    }

    public readData(id: string): Promise<DataSetObject[]> {
        // check if id in data set
        // check if it is in disk
        if (this.mem !== null) {
            if (this.mem[id] !== undefined) {
                if (id === this.mem[id].DataID) {
                    return Promise.resolve(this.mem[id].data);
                }
            } else {
                delete this.mem[id];
            }
        }
        return DiskDataHandler.readDataAsync(id).then((result) => {
                return this.loadData(result).then(() => {
                    return result;
                });
        });
    }

    // gives the id's of each dataset added
    public readIds(): Promise<string[]> {
        let idNameArr: string[] = [];
        let keys: string[] = [];
        if (this.mem !== null && this.mem !== undefined) {
            // this gets me the keys of the mem ... so the dataIds
            keys = Object.keys(this.mem);
            // if (keys.length !== 0) {
            for (let id of keys) {
                idNameArr.push(id);
            }
            return Promise.resolve(idNameArr);
            // }
        } else {
            let promiseArr: Array<Promise<DataSetObject[]>> = [];
            let finalResult: string[];
            return DiskDataHandler.readDatasetIds().then((result: string[]) => {
                finalResult = result;
                for (let id of result) {
                    promiseArr.push(DiskDataHandler.readDataAsync(id));
                }
                return Promise.all(promiseArr);
            }).then((result: DataSetObject[][]) => {
                for (let dataset of result) {
                    this.loadDataLocal(dataset);
                }
                return Promise.resolve(finalResult);
            });
        }
    }

    public getKind(datasetId: string): Promise<string> {
        if (this.mem !== null && this.mem !== undefined && this.mem[datasetId].kind !== null ) {
            return Promise.resolve(this.mem[datasetId].kind);
        } else {
            return this.readData(datasetId).then( (result: DataSetObject[]) => {
                return result[0].getKind();
            });
        }
    }
}
