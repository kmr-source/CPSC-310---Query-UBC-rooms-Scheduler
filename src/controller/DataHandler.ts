import * as JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import DataSetObject from "./DataSetObject";
import BuildingHelper from "./BuildingHelper";

interface IdJsonObject {[index: string]: string| number; }
const parse5 = require("parse5");

export default class DataHandler {
    private fs = require("fs").promises;
    private numRows: number;

    constructor() {
        let x = null;
        this.numRows = 0;

    }

    // parsing content
    // loadAsync checks if file is zip, if not automatically rejects for us
    // TODO - are we keeping name of each courseFile in parseJSonFiles?
    public parseZipIntoFiles(dataSetID: string, content: string, kind: InsightDatasetKind): Promise<DataSetObject[]> {
        // let bufferContent =  Buffer.from(content, "base64");
        let theZip = new JSZip();

        return theZip.loadAsync(content, {base64: true})
            .then((zipContent: JSZip) => {
                // checks if room/course folder in zip/index.htm is in zip if not error is thrown
                /*if (!("rooms/" in theZip.files) || (Object.keys(theZip.folder("rooms").files).
                includes("rooms/index.htm")) === false || Object.keys(theZip.files).includes("courses/") === false ) {
                    return Promise.reject(new InsightError("No rooms folder or course folder/ index.htm/ in the zip"));
                }*/
                // checking if Zip has Course Directory...JSzip
                // TODO: catch the zip error --- somehow? check tsconfig doc
                // returns a promise<DatasetObject[]); and deals with courses.
                if (kind === InsightDatasetKind.Courses) {
                    return this.parseCourseZip(zipContent, dataSetID , kind);
                } else if (kind === InsightDatasetKind.Rooms) {
                    let trialZip = zipContent;
                    if (!("rooms/" in zipContent.files)) {
                        return Promise.reject(new InsightError("no room directory under the dataSet being parsed"));
                    }
                    return zipContent.folder("rooms").file("index.htm").async("text")
                        .then((resultString) => {
                            let buildingHelper = new BuildingHelper(dataSetID);
                            return buildingHelper.getRoomDataObjectArray(resultString, trialZip);
                    }).catch((err: any) => {
                      return Promise.reject(err);
                    });
                } else {
                    throw new InsightError("Invalid Kind");
                }
            }).catch((err: any) => {
                // returning promise with rejected zip error...Sanity check it later?
                return Promise.reject("Invalid Json Course File" + err);
            }).catch((err: any) => {
                // catch not a Valid zip file error
             return Promise.reject(new InsightError(err));
        });
    }

    // parses the course Zip file to extracts it's contents to a DataSetObject and put it into an array
    private parseCourseZip(zipContent: JSZip, datasetID: string, kind: InsightDatasetKind): Promise<DataSetObject[]> {
        let rootZipDir = "courses/";
        let path = rootZipDir;
        if (!(rootZipDir in zipContent.files)) {
            return Promise.reject(new InsightError("no course directory under the dataSet being parsed"));
        }
        /* zipContent.forEach(function (relativePath: string, file: JsonObject) {

             if (!file.dir){
                 if()
             }
         })*/
        let objectDataSetArray: DataSetObject[] = [];
        // let promiseArray: Array<Promise<DataSetObject>> = [];
        let objectTemp: DataSetObject;
        let promiseArrayParse: Array<Promise<DataSetObject>> = [];
        // let PromiseArray: Array<Promise<string>> = [];
        let fileID: string;
        // let promiseArray: Array<Promise<string[]>> = [];
        zipContent.folder(path).forEach((fileId: string ) => { // not a promise
            // fileID is the id
            // enforce id to match the filename by indexing
            // get into courses folder and check format of every JSON file inside
            // make sure fileid is not null
            if ( fileId == null) {
                throw new InsightError("file Id is null.... REJECTED");
            }
            let filePromise: Promise<DataSetObject> = zipContent.file(path + fileId).async("text")
                .then((resultFile: string) => {
                    // TODO valdiate the file (json)
                    objectTemp = new DataSetObject(datasetID, fileId, resultFile, kind);
                    return objectTemp;
                }).catch((err) => {
                    return Promise.reject(err + "NOT a ZIP :D ");
                });
            // let objDataSetObject = new DataSetObject();
            // let resultPromiseWithId: Promise<string[]> = filePromise.then( (file) => {
            //     return [fileId, file];
            // });
            // promiseArray.push(resultPromiseWithId);
            promiseArrayParse.push(filePromise);

        });
        // return promiseArray;
        return  Promise.all(promiseArrayParse).then((dataSetObjects: DataSetObject[]) => {
            objectDataSetArray = this.DataArrayMaker(dataSetObjects); // _filename (what is this?)
            // return idJsonObject;
            return objectDataSetArray;
        });
    }

    // jsonArray has all files in it (fix id)
    public DataArrayMaker(DataSetObjectArr: DataSetObject[]): DataSetObject[] {
        let dataSetArray: DataSetObject[] = [];
        let objString: string;
        let count: number = 0;
        // looping through our DataSetObjectArr and adding valid files Sections to the dataSetArray
        for (let obj of DataSetObjectArr) {
            objString = obj.getContentsAsString();
            // Log.trace(objString);
            // getting the array in object string...
            // TODO LOOK UP INTERFACES/ TYPESCRIPT ERRORS TS---- (Refractor below)
            // let objTemp: IdFinalObjectA = JSON.parse(objString);
            let objTemp: {[index: string]: number | IdJsonObject[]} = JSON.parse(objString);
            let result = objTemp["result"];
            // Log.trace(objTemp.toString());
            if (typeof result !== "number") {
                let resultObjArr: IdJsonObject[] = result; // gives me the array of data I need to parse.
                // fileObjNumRows = resultObjArr.length;
                // let resultObjArr: Array<{[index: string]: string | number}> = result;
                count += resultObjArr.length;
                // Log.trace(count.toString());
                if (this.isObjValidJsonFileAndValidSection(resultObjArr)) {
                    // new Code
                    // obj.setNumRows(count);
                    this.setNumRowsInDataSet(count);
                    // new Code
                    dataSetArray.push(obj);
                }
            }
        }
        return dataSetArray; // a
    }

    // check values exist in side? if fail
    private isObjValidJsonFileAndValidSection(objArr: IdJsonObject[]): boolean {
        if (objArr.length === 0 || objArr === undefined) {
            return false;
        }
        for (let obj of objArr) {

            if ("Professor" in obj && "Year" in obj
                && "Audit" in obj && "Subject" in obj
                && "Pass" in obj && "Title" in obj &&
                "Fail" in obj && "Avg" in obj &&
                "id" in obj && "Section" in obj ) {
                // add this setting year to 1900 might change our code ..causing errors
                // if (obj.Section === "overall") {
                //     obj.Year = 1900;
                // }
                return true;
            }
        }
        return false;
    }

    public setNumRowsInDataSet(n: number): void {
        this.numRows = n;
    }

}
