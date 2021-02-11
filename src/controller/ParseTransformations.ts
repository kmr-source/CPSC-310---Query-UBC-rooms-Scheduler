import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import QueryTools from "./QueryTools";

interface IDataType { [index: string]: string | number; }
interface IGroupTable {[identifier: string]: IDataType[]; }
type applyFunction = (key: string, group: IDataType[]) => number;
export default class ParseTransformations {
    private readonly query: any;
    constructor (query: any) {
        this.query = query;
    }

    public parseTran (bodyResult: IDataType[]): IDataType[] {
        if ( !("TRANSFORMATIONS" in this.query) ) {
            if (bodyResult.length > 5000) {
                throw new ResultTooLargeError(); // throws early so columns dont apply
            }
            return bodyResult;
        }
        const innerQuery = this.query["TRANSFORMATIONS"];
        if (!("GROUP" in innerQuery) || !("APPLY" in innerQuery)  ) {
            throw new InsightError("TRANSFORMATIONS missing GROUP or  APPLY");
        }
        const groupsData: IGroupTable = this.createGroups(innerQuery["GROUP"], bodyResult);
        const newDataWithApplyKeys = this.APPLY(innerQuery["APPLY"], groupsData);
        const result: IDataType[] = this.GROUP(newDataWithApplyKeys);
        return result;
    }

    private GROUP (groupObjects: {data: IGroupTable, appliedKeys: {[identifier: string]: IDataType}}): IDataType[] {
        let result: IDataType[] = [];
        let groupElement: IDataType;
        let appliedKeys: IDataType;
        let combined: IDataType;
        for (const id in groupObjects.data) {
            groupElement = this.chooseRepresentativeGroupElement(groupObjects.data[id]);
            appliedKeys = groupObjects.appliedKeys[id];
            combined = {...groupElement, ...appliedKeys};
            result.push(combined);
        }
        return result;
    }

    private APPLY (toApply: Array<{[index: string]: {[index: string]: string}}>,
                   groups: IGroupTable): {data: IGroupTable, appliedKeys: {[identifier: string]: IDataType}} {
        let appliedTable: {[identifier: string]: IDataType} = {};
        const applyObj = this.parseAPPLY(toApply);
        let applyKeys: string[] = applyObj.applyKeys; // name of variable to apply to
        let applyTokens: string[] = applyObj.applyTokens; // type of function to apply
        let tokenKeys: string[] = applyObj.tokenKeys; // the raw query string eg: "courses_avg"

        let tempApplyFunction: applyFunction;
        for (const id of Object.keys(groups)) {
            for (const index in applyKeys) { // note that applykeys.length === applyTokens.length === tokenKeys.length
                tempApplyFunction = this.applyFunctionTable[applyTokens[index]]; // gets the function MAX, MIN, ect
                appliedTable[id] = {};
                appliedTable[id][applyKeys[index]] = tempApplyFunction(tokenKeys[index], groups[id]);
            }
        }
        return {data: groups, appliedKeys: appliedTable};
    }

    private parseAPPLY(
        toApply: Array<{[index: string]: {[index: string]: string}}>):
        {applyKeys: string[], applyTokens: string[], tokenKeys: string[]} {
        if (toApply === null || toApply === undefined) {
            throw new InsightError("APPLY must have array");
        }
        let applyKeys: string[] = []; // of the form APPLY: {applyKey: {applyToken: tokenKey}}
        let applyTokens: string[] = []; // eg; MAX, SUM, COUNT
        let tokenKeys: string[] = []; // eg: courses_avg, rooms_seats
        let tempApplyKey: string;
        let tempTokenObject: {[index: string]: string};
        let tempApplyToken: string;
        let tempTokenKey: string;
        for (const o of toApply) {
            if (Object.keys(o).length !== 1) {
                throw new InsightError("APPLY objects must each have only one applyKey");
            }
            tempApplyKey = Object.keys(o)[0];
            applyKeys.push(tempApplyKey);
            tempTokenObject = o[tempApplyKey];
            if (Object.keys(tempTokenObject).length !== 1) {
                throw new InsightError("APPLY token objects must each have only one APPLYTOKEN");
            }
            tempApplyToken = Object.keys(tempTokenObject)[0];
            applyTokens.push(tempApplyToken);
            tempTokenKey = tempTokenObject[tempApplyToken];
            if (QueryTools.isOrderKeyApplyKey(tempTokenKey)) {
                throw new InsightError("APPLYTOKEN's key cannot be applyKey");
            } else {
                QueryTools.throwAnyErrInOrderKey(tempTokenKey, QueryTools.getDatasetIdFromKey(tempTokenKey));
            }
            tokenKeys.push(tempTokenKey);
        }
        return {applyKeys: applyKeys, applyTokens: applyTokens, tokenKeys: tokenKeys};
    }

    private createGroups(requestedGroupColumns: string[], bodyResult: IDataType[]): IGroupTable {
        if (requestedGroupColumns === null || requestedGroupColumns === undefined ) {
            throw new InsightError("GROUP cannot be null");
        } else if (requestedGroupColumns.length === 0 ) {
            throw new InsightError("GROUP cannot be empty");
        }
        for (const rc of requestedGroupColumns) {
            if (QueryTools.isOrderKeyApplyKey(rc)) {
                throw new InsightError("Cannot Group by APPLYKEY");
            }
        }
        let groups: IGroupTable = {};
        let id: string;
        for (const row of bodyResult) {
            id = this.createIGroupTableIdentifier(row, requestedGroupColumns); // creates a unique identifier for group
            if (id in groups) {
                groups[id].push(row);
            } else {
                groups[id] = new Array(row); // creates a new group with key as id and one row in array
            }
        }
        return groups;
    }

    // creates new row ID (combination of each requestedRowString)
    private createIGroupTableIdentifier(row: IDataType, requestedGroupColumns: string[]): string {
        let id: string = "";
        let field: string;
        for (const st of requestedGroupColumns) {
            field = QueryTools.getField(st);
            id += row[field];
        }
        return id;
    }

    private MAX: applyFunction = (key: string, group: IDataType[]) => {
        const keyField = QueryTools.getField(key);
        this.numericApplyFunctionSetup(keyField, group);
        let max: number = null;
        let value: number;
        for (const element of group) {
            value = element[keyField] as number;
            if (max === null) {
                max = value; // we already know its a number
            } else if (value > max) {
                max = value;
            }
        }
        return max; // might return null
    }

    private AVG: applyFunction = (key: string, group: IDataType[]) => {
        let sum = this.SUM(key, group); // this might break for really large numbers?
        let avg = sum / group.length;
        return Number(avg.toFixed(2));
    }

    private MIN: applyFunction = (key: string, group: IDataType[]) => {
        const keyField = QueryTools.getField(key);
        this.numericApplyFunctionSetup(keyField, group);
        let min: number = null;
        let value: number;
        for (const element of group) {
            value = element[keyField] as number;
            if (min === null) {
                min = value; // we already know its a number
            } else if (value < min) {
                min = value;
            }
        }
        return min; // might return null
    }

    private SUM: applyFunction = (key: string, group: IDataType[]) => {
        const keyField = QueryTools.getField(key);
        this.numericApplyFunctionSetup(keyField, group);
        let sum: number = 0;
        let value: number;
        for (const element of group) {
            value = element[keyField] as number;
            sum += value;
        }
        return Number(sum.toFixed(2));
    }

    private COUNT: applyFunction = (key: string, group: IDataType[]) => {
        const keyField = QueryTools.getField(key);
        let uniqueValues: any[] = [];
        let value;
        let count = 0;
        for (const element of group) {
            value = element[keyField];
            if ( !(uniqueValues.includes(value)) ) {
                uniqueValues.push(value);
                count++;
            }
        }
        return count;
    }

    private numericApplyFunctionSetup (keyField: string, group: IDataType[]): void {
        if ( !(QueryTools.isNumericField(keyField)) ) {
            throw new InsightError("Invalid key type");
        }
        let value;
        for (const index in group) {
            value = group[index][keyField];
            group[index][keyField] = QueryTools.valueToCorrectType(keyField, value);
        }
    }

    private applyFunctionTable: { [index: string]: applyFunction } = {
        MAX: this.MAX,
        MIN: this.MIN,
        AVG: this.AVG,
        SUM: this.SUM,
        COUNT: this.COUNT
    };

    // returns an element which can best represent the group
    private chooseRepresentativeGroupElement(group: IDataType[]) {
        return group[0]; // all elements best represent the group so we choose the first one
    }
}
