import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import ParseBody from "./ParseBody";
import ParseOptions from "./ParseOptions";
import QueryTools from "./QueryTools";
import DataSetObject from "./DataSetObject";
import DataHandler from "./DataHandler";
import MemoryStructure from "./MemoryStructure";
import ParseTransformations from "./ParseTransformations";
import BuildingHelper from "./BuildingHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
interface IDataType { [index: string]: string| number; }
const parse5 = require("parse5");
export default class InsightFacade implements IInsightFacade {
    private mem: MemoryStructure;
    private buildingHelper: BuildingHelper;
    constructor() {
        this.mem = new MemoryStructure();
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // let ext = id.substr(id.lastIndexOf(".") + 1);
        // this.buildingHelper = new BuildingHelper(id);
        if (id === null || id === undefined || id === "" || content === " "
            || content === undefined || content === null) {
            return Promise.reject(new InsightError());
        }
        if (kind !== InsightDatasetKind.Rooms && kind !== InsightDatasetKind.Courses) {
            return Promise.reject(new InsightError());
        }
        // TODO: check dataDisk memory if ID exist
        // for (let i in DiskDataHandler.readDataAsync())
        let dataHandler = new DataHandler();
        // DiskDataHandler.readDatasetIds()
        let key = Object.keys.length;

        return Promise.resolve(this.mem.readIds()).then( (idArr: string[]) => {
            // checks for duplicate ID being parsed that is already in the disk... rejects it if not add the dataSet
            // array "of" is for element in array --- "in" is for index of array
            if (idArr !== undefined) {
                for (let s of idArr) {
                    if (s === id) {
                        throw new InsightError("Duplicate ID");
                    }
                }
            }

            // parse the Zip file into the parser....
            return dataHandler.parseZipIntoFiles(id, content, kind);
            /* then ((result: DataSetObject[]) => {
                     // generate the Promise<string> of results for the file
                     return dataHandler.generatePromiseString(result);
                 });*/
        }).then( (result: DataSetObject[]) => {
            // load data to the internal disk;
            // DiskDataHandler.loadDataAsync
            return this.mem.loadData(result);
            // DiskDataHandler.readDatasetIds
        }).then( () => {
            return this.mem.readIds();
        }).catch( (err) => {
            return Promise.reject(err);
        });
    }

    public removeDataset(id: string): Promise<string> {
        // this is our local mem that is store..
        // z. no just the disk
        // let removedArr: string[] = [];
        // remove from both disk and mem
        if (id === " " || id === undefined || id === "_" || id === null) {
            return Promise.reject(new InsightError("id is undefined, space or underscore"));
        }
        // DiskDataHandler.readDatasetIds
        return this.mem.readIds()
            .then((result: string[]) => {
                if (checkIdInArr(id, result)) {
                    // DiskDataHandler.removeDatasetAsync
                    return this.mem.removeData(id);
                } else {
                    if (!(checkIdInArr(id, result)) || id === null || id === undefined) {
                        return Promise.reject(new NotFoundError("not in the memory :("));
                    }
                    // return Promise.reject(new NotFoundError("not in the memory :("));
                }
            }).catch((err: any) => {
                return Promise.reject(err);
            });

        // let promiseMemory = new Promise((resolve) => {
        //     return Promise.resolve(DiskDataHandler.readDatasetIds());
        // }).then((result: string[]) => {
        //     if (b(id, result)) {
        //         return Promise.resolve(DiskDataHandler.removeDatasetAsync(id));

        function checkIdInArr(s: string, sArr: string[]): boolean {
            let l = sArr.length;
            for (let i = 0; i < l; i++) {
                if (sArr[i] === s) {
                    return true;
                }
            }
            return false;
        }

    }

    public performQuery(query: any): Promise <any[]> {
        let datasetId: string;
        let bodyParser: ParseBody;
        let optionsParser: ParseOptions;
        let tranParser: ParseTransformations;
        try {
            datasetId = QueryTools.getDatasetId(query);
        } catch (e) {
            return Promise.reject(e);
        }
        return this.mem.getDataArr(datasetId)
            .then( (data: IDataType[]) => { // TODO verify if data is expected data
                    try {
                        bodyParser = new ParseBody(datasetId, data, query);
                        optionsParser = new ParseOptions(datasetId, query);
                        tranParser = new ParseTransformations(query);
                        const bodyResult = bodyParser.parseBody();
                        const transformationResult = tranParser.parseTran(bodyResult);
                        if (transformationResult.length > 5000) {
                            throw new ResultTooLargeError("Results over 5000");
                        }
                        const result = optionsParser.parseOptions(transformationResult);
                        return Promise.resolve(result);
                    } catch (e) {
                        return Promise.reject(e);
                    }
            }).catch( (err: any) => {
                return Promise.reject(err);
            });
        // return Promise.reject(new InsightError());
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let promiseArr: Array<Promise<InsightDataset>> = [];
        let insightDataObj: InsightDataset;
        // let insightDataArr: InsightDataset[];
        //  DiskDataHandler.readDatasetIds()
        return this.mem.readIds().then( (result: string[]) => {
            // Log.info("hello123");
            let count = 0;

            for (let id of result) {
                // get the number of rows....
                // DiskDataHandler.readDataAsyn
                promiseArr.push(this.mem.getDataArr(id).then( (resultDatasetObj: IDataType[]) => {
                    // Log.info("hello3873598");
                    // new code
                    // new code
                    return this.mem.getKind(id).then((kind: InsightDatasetKind) => {
                        insightDataObj = {
                            id: id,
                            kind: kind,
                            numRows: resultDatasetObj.length,
                            // num of courses in the dataSet
                            // numRows: resultDatasetObj[0].getNumRows(),
                        };
                        return insightDataObj;
                    });
                    // Log.info("DOESITPASS"); // it does not reach this line
                    // NUM OF ROWS IS WRONG;
                    // insightDataArr.push(insightDataObj);
                    return insightDataObj;
                }));
            }
            return Promise.all(promiseArr);
        });
        // return Promise.reject("Not implemented.");
    }
}
/*
    public listDatasets(): Promise<InsightDataset[]> {
        let promiseArr: Array<Promise<InsightDataset>> = [];
        let insightDataObj: InsightDataset;
        // let insightDataArr: InsightDataset[];
        //  DiskDataHandler.readDatasetIds()
        return this.mem.readIds().then( (result: string[]) => {
            // Log.info("hello123");
            let count = 0;

            for (let id of result) {
                // get the number of rows....
                // DiskDataHandler.readDataAsyn
                promiseArr.push(this.mem.getDataArr(id).then( (resultDatasetObj: IDataType[]) => {
                    // Log.info("hello3873598");
                    // new code
                    // new code
                    return this.mem.getKind(id).then((kind: InsightDatasetKind) => {
                        return this.mem.getKind(id).then((kind: InsightDatasetKind) => {
                            insightDataObj = {
                                id: id,
                                kind: kind,
                                numRows: resultDatasetObj.length,
                                // num of courses in the dataSet
                                // numRows: resultDatasetObj[0].getNumRows(),
                            };
                            return insightDataObj;
                    });
                    // Log.info("DOESITPASS"); // it does not reach this line
                    // NUM OF ROWS IS WRONG;
                    // insightDataArr.push(insightDataObj);
                    return insightDataObj;
                });
                    return insightDataObj;
            });
            return Promise.all(promiseArr);
        });
        // return Promise.reject("Not implemented.");
    }
}
*/
