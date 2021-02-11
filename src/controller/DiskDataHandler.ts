import DataSetObject from "./DataSetObject";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";

interface IDataType { [index: string]: string | number; }
interface IDatasetTemplate {[index: string]: IDataType[] | number; }
export default class DiskDataHandler {
    private static dataPath: string = "data/";
    private static fileHandle = require("fs").promises;
    private static fs = require("fs-extra");

    // Assumes all data is of the same kind in the same Dataset
    public static loadDataAsync(datasetArr: DataSetObject[]): any {
        let promiseArr: Array<Promise<void>> = [];
        let writeJsonFile: Promise <void>;
        let id = datasetArr[0].getDatasetId();
        let kind = datasetArr[0].getKind();
        let contents: string;
        let resultJson: {[index: string]: any} = {};
        // makes a directory for this file path
        return this.fs.pathExists(this.getPathDir(id, kind))
            .then ( (isTherePath: boolean) => {
                if ( ! (isTherePath) ) {  // This is new and might break everything <---- ^^^
                return this.fileHandle.mkdir(this.dataPath + id + "/").then(() => {
                    return this.fileHandle.mkdir(this.getPathDir(id, kind));
                }).then(() => {
                    for (let data of datasetArr) {
                        contents = data.getContentsAsString();
                        // contents = this.getResultArr(contents);
                        // let tempArr = [contents];
                        resultJson[data.getCodeId()] = JSON.parse(contents);
                    }
                    return writeJsonFile = this.fileHandle.writeFile(
                        this.getPathJson(id, kind, id), JSON.stringify(resultJson));
                });
            }
        });

    }

    private static getResultArr(contents: string): string {
        let regex = /(^.*\[|\].*$)/g; // gets string between brackets
        return contents.replace( regex, "" );
    }

    public static readDataAsync(datasetId: string): Promise<DataSetObject[]> {
        let insightDatasetKind: InsightDatasetKind;
        let insightDatasetKindString: string = "";
        return this.fileHandle.readdir(this.dataPath + datasetId + "/")
            .then( (result: string[]) => {
                if (result.length !== 1) {
                    return Promise.reject(`Must only have one dataset kind has: ${result.length}`);
                } else {
                    insightDatasetKindString = result[0];
                    if (insightDatasetKindString === InsightDatasetKind.Courses) {
                        insightDatasetKind = InsightDatasetKind.Courses;
                    } else if (insightDatasetKindString === InsightDatasetKind.Rooms) {
                        insightDatasetKind = InsightDatasetKind.Rooms;
                    } else {
                        return Promise.reject(`InsightDatasetKind: ${insightDatasetKindString} not found`);
                    }
                }
                return this.datasetObjCreator(datasetId, insightDatasetKind, datasetId);
            });
            //     for (let courseId of result) {
            //         promiseArr.push(this.datasetObjPromiseCreator(datasetId, insightDatasetKind, courseId));
            //     }
            //     return promiseArr;
            //     })
            // .then((resultPromiseArr: Array<Promise<DataSetObject>>) => Promise.all(resultPromiseArr));
    }

    public static readDatasetIds(): Promise<string[]> {
        return this.fileHandle.readdir(this.dataPath);
    }

    public static readAllCourseDataIntoJsonAsync(datasetObjArr: DataSetObject[]): Promise<IDataType[]> {
        let data: IDataType[] = [];
        let resultArr: IDataType[] = [];
        let stringContents: string;
        let json;
        return new Promise((resolve, reject) => {
            for (const datasetObj of datasetObjArr) {
                try {
                    stringContents = datasetObj.getContentsAsString();
                    json = JSON.parse(stringContents);
                    data = json["result"];
                } catch (e) {
                    return reject(new InsightError(e));
                }
                resultArr = [...resultArr, ...data];
            }
            resolve(resultArr as IDataType[]);
        });
    }

    private static datasetObjPromiseCreator (datasetId: string,
                                             datasetKind: InsightDatasetKind,
                                             courseId: string): Promise<DataSetObject> {
        return this.fs
            .readFile(this.getPathDir(datasetId, datasetKind) + courseId, "utf8")
                .then((contents: string) => {
                    return new DataSetObject(datasetId, courseId, contents, datasetKind);
                });
    }

    private static datasetObjCreator (datasetId: string,
                                      datasetKind: InsightDatasetKind,
                                      keyId: string): Promise<DataSetObject[]> {
        return this.fs
            .readFile(this.getPathDir(datasetId, datasetKind) + datasetId + ".json", "utf8")
                .then((contents: string) => {
                    let resultArr: DataSetObject[] = [];
                    let obj = JSON.parse(contents);
                    let courseContents: string = "{";
                    for (let courseId of Object.keys(obj)) {
                        courseContents = JSON.stringify(obj[courseId]);
                        resultArr.push(new DataSetObject(datasetId, courseId, courseContents, datasetKind));
                    }
                    return resultArr;
                });
    }

    public static removeDatasetAsync(datasetId: string): Promise<string> {
        let path: string = this.dataPath + datasetId + "/";
        let findKinds: Promise<string[]> = this.fileHandle.readdir(path);
        let emptyDataset: Promise<void> = this.fs.emptyDir(path);
        let removeDatasetDir = this.fs.remove(path); // this should remove all empty dir's within dir
        return findKinds.then( (kinds: string[]) => {
            let resultPromiseArr: Array<Promise<any>> = [];
            for (let s of kinds) {
                resultPromiseArr.push(emptyDataset.then(() => removeDatasetDir));
            }
            return Promise.all(resultPromiseArr).then( () => datasetId);
        });
    }

    private static getPathJson(datasetId: string, datasetKind: InsightDatasetKind, courseId: string): string {
        return this.getPathDir(datasetId, datasetKind) + courseId + ".json";
    }

    private static getPathDir(datasetId: string, datasetKind: InsightDatasetKind): string {
        return this.dataPath + datasetId + "/" + datasetKind + "/";
    }
}
