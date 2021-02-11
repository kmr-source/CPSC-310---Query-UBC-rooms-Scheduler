import {InsightError} from "./IInsightFacade";


interface IDataType { [index: string]: string | number; }
export default class QueryTools {
    public static keyToDataMap: { [index: string]: string } = { // maps keys from query to matching name in data
        dept: "Subject",
        id: "Course",
        avg: "Avg",
        instructor: "Professor",
        title: "Title",
        pass: "Pass",
        fail: "Fail",
        audit: "Audit",
        uuid: "id",
        year: "Year",
        fullname: "fullname",
        shortname: "shortname",
        number: "number",
        address: "address",
        lat: "lat",
        lon: "lon",
        seats: "seats",
        type: "type",
        furniture: "furniture",
        href: "href",
        name: "name"
    };

    private static numberFields = [
        "avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];

    private static stringFields = [
        "dept", "id", "instructor", "title", "uuid", "fullname",
        "shortname", "number", "name", "address", "type", "furniture", "href"];

    public static isNumericField(s: string): boolean {
        if (this.numberFields.includes(s)) {
            return true;
        } else {
            let keyMap = Object.keys(this.keyToDataMap);
            for (const v of this.numberFields) {
                if ( !(keyMap.includes(v)) ) {
                    // do nothing
                } else if (this.keyToDataMap[v] === s) {
                    return true;
                }
            }
        }
        return false;
    }

    public static isStringField(s: string): boolean {
        if (this.stringFields.includes(s)) {
            return true;
        } else {
            let keyMap = Object.keys(this.keyToDataMap);
            for (const v of this.stringFields) {
                if ( !(keyMap.includes(v)) ) {
                    // do nothing
                } else if (this.keyToDataMap[v] === s) {
                    return true;
                }
            }
        }
        return false;
    }

    public static getField(key: string): string {
        let field: string = key.split("_")[1]; // datasetId_field --> [datasetId, field]
        field = this.keyToDataMap[field];
        return field;
    }

    public static getDatasetIdFromKey(key: string): string {
        let ID: string = key.split("_")[0]; // datasetId_field --> [datasetId, field]
        return ID;
    }

    public static throwAnyErrInKey(s: string, datasetId: string) {
        let IDAndField = s.split("_");
        if (IDAndField.length !== 2) {
            throw new InsightError("Invalid key format, must match 'ID_FIELD'");
        }
        if (IDAndField[0] !== datasetId) {
            throw new InsightError("ID must match dataset ID");
        }
        if (!(IDAndField[1] in this.keyToDataMap)) {
            throw new InsightError("Invalid field: not found");
        }
    }

    // This is hacked together, dont ask how it works just accept that is does
    public static getDatasetId(query: any) {
        let queryType: {[index: string]: {[index: string]: string[]}} = query;
        let queryOptions: {[index: string]: string[]};
        let queryColumn: string[];
        if ("OPTIONS" in queryType) {
            queryOptions = queryType["OPTIONS"];
            if ("COLUMNS" in queryOptions) {
                queryColumn = queryOptions["COLUMNS"];
                if (queryColumn.length === 0) {
                    throw new InsightError("COLUMNS cannot be empty");
                }
                let IDAndField = queryColumn[0].split("_");
                if (IDAndField.length !== 2) {
                    throw new InsightError("Invalid key format, must match 'ID_FIELD'");
                }
                if (!(IDAndField[1] in this.keyToDataMap)) {
                    throw new InsightError("Invalid field: not found");
                }
                return IDAndField[0];
            } else {
                throw new InsightError("COLUMNS missing from query");
            }
        } else {
            throw new InsightError("OPTIONS missing from query");
        }
    }

    private static throwAnyErrInPair(pair: object, datasetId: string) {
        let key = Object.keys(pair);
        if (key.length !== 1) {
            throw new InsightError("COMPARATOR must only have one pair");
        }
        this.throwAnyErrInKey(key[0], datasetId);
    }

    public static throwAnyErrInMValue(pair: object, datasetId: string) {
        this.throwAnyErrInPair(pair, datasetId);
        let inputNumber = Object.values(pair)[0];
        if (typeof inputNumber !== "number") {
            throw new InsightError("MCOMPARATOR value must be number");
        }
    }

    public static throwAnyErrInSValue(pair: object, datasetId: string) {
        this.throwAnyErrInPair(pair, datasetId);
        let inputString = Object.values(pair)[0];
        if (inputString === null || inputString === undefined || inputString.length === 0) {
            throw new InsightError("Empty S value");
        } else if (typeof inputString !== "string") {
            throw new InsightError("S value must be string");
        }
        let middle = inputString.slice(1, inputString.length - 1);  // "*string" --> "strin"
        if (middle.includes("*")) {
            throw new InsightError("Input string wild card indicator cannot be within string");
        }
    }

    public static throwAnyErrInOrderKey(orderKey: string, datasetId: string) {
        if (orderKey === null || orderKey === undefined) {
            throw new InsightError("ORDERKEY cannot be null or undefined");
        } else if (orderKey.length === 0) {
            throw new InsightError("ORDERKEY cannot have length zero");
        }
        if (orderKey.includes("_")) {
            this.throwAnyErrInKey(orderKey, datasetId);
        } else {
            this.throwAnyErrInApplyKey(orderKey, datasetId);
        }
    }

    private static throwAnyErrInApplyKey(applyKey: string, datasetId: string) {
        if (applyKey.length <= 1) { // This is already checked
            throw new InsightError("APPLYKEY cannot have length zero");
        } else if (applyKey.includes("_")) { // This is already checked
            throw new InsightError("APPLYKEY cannot contain underscores");
        }
    }

    public static valueToCorrectType(field: string, value: string | number): string | number {
        for (let s of QueryTools.numberFields) {
            if (field === s || field === this.keyToDataMap[s]) {
                return +value;
            }
        }
        for (let s of QueryTools.stringFields) {
            if (field === s || field === this.keyToDataMap[s]) {
                return value + "";
            }
        }
    }

    // ORDERKEY input must be valid
    public static isOrderKeyApplyKey (validOrderKey: string): boolean {
        if (validOrderKey.includes("_")) {
            return false;
        } else {
            return true;
        }
    }
}
