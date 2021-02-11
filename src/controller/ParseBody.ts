import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import QueryTools from "./QueryTools";

interface IDataType { [index: string]: string | number; }
type ComparatorCallback = ( element: {[index: string]: number | string}) => boolean;
type Filter = (query: object) => ComparatorCallback; //  TODO: consider renaming to ComparatorCallbackCreator

export default class ParseBody {
    // Queries test are failing (GT/OR/AND problems)
    private data: IDataType[];
    private query: any;
    private datasetId: string;
    constructor (datasetId: string, data: IDataType[], query: any) {
        this.datasetId = datasetId;
        this.data = data;
        this.query = query;
    }

    public parseBody(): IDataType[] {
        if (!("WHERE" in this.query)) {
            throw new InsightError("Body missing: WHERE");
        }
        let queryBody = this.query["WHERE"];
        let resultArr: IDataType[] = [];
        if (!(Object.keys(queryBody).length === 0)) { // checks if there are filters
            let filterFunction: ComparatorCallback = this.createFilter(queryBody);
            for (const obj of this.data) {
                if (obj.Section === "overall") {
                    obj[QueryTools.keyToDataMap["year"]] = 1900;
                }
                if ( filterFunction(obj) ) {
                    if (obj.Section === "overall") {
                       obj.Year = 1900;
                    }
                    resultArr.push(obj);
                }
            }
        } else { // Note that this does not set year too 1900 if section === overall
            resultArr = this.data; // if there is no filters return entire dataset
        }
        return resultArr;
    }

    private createFilter: Filter = (filterQuery: object): ComparatorCallback => { // TODO: specify 'object' type input
        let allKeys = Object.keys(filterQuery);
        if (allKeys.length !== 1) {
            throw new InsightError(`Invalid Filter Format: should have 1 key has ${allKeys.length}`);
        }
        let key = allKeys[0];
        if ( !(key in this.filterFunctionTable) ) {
            throw new InsightError(`Invalid Filter: ${key}`);
        }
        let value: object = Object.values(filterQuery)[0];
        if (value === {} || value === null || Object.keys(value).length === 0) {
            throw new InsightError("Empty AND");
        }
        let filterFunction: Filter = this.filterFunctionTable[key];
        return filterFunction(value); // filterFunction(value)
    }

    private AND: Filter = (queryArr: object[]): ComparatorCallback => {
        if (queryArr.length === 0) {
            throw new InsightError("OR must have at least one filter");
        }

        let callbackArr: ComparatorCallback[] = [];
        for (let i = 0; i < queryArr.length; i++) {
            callbackArr[i] = this.createFilter(queryArr[i]);
        }
        return (element: { [index: string]: number | string }): boolean => {
            for (const callback of callbackArr) {
                if (!callback(element)) {
                    return false;
                }
            }
            return true;
        };
    }

    private OR: Filter = (queryArr: object[]): ComparatorCallback => {
        if (queryArr.length === 0) {
            throw new InsightError("OR must have at least one filter");
        }

        let callbackArr: ComparatorCallback[] = [];
        for (let i = 0; i < queryArr.length; i++) {
            callbackArr[i] = this.createFilter(queryArr[i]);
        }
        return (element: { [index: string]: number | string }): boolean => {
            for (const callback of callbackArr) {
                if (callback(element)) {
                    return true;
                }
            }
            return false;
        };
    }

    private NOT: Filter = (queryFilter: {[index: string]: object}): ComparatorCallback => {
        let keys = Object.keys(queryFilter);
        if (keys.length !== 1) {
            throw new InsightError(`NOT must only have 1 filter has ${keys.length}`);
        }
        let callback: ComparatorCallback = this.createFilter(queryFilter);
        return (element: { [index: string]: number | string }): boolean => {
            return !(callback(element));
        };
    }

    // this was well documented, but lint didn't like that
    private IS: Filter = (queryPair: object): ComparatorCallback => {
        QueryTools.throwAnyErrInSValue(queryPair, this.datasetId);
        let value = Object.keys(queryPair)[0];

        let sfield: string = QueryTools.getField(value); // datasetId_field --> field
        let queryValue: string = Object.values(queryPair)[0];
        return (element: { [index: string]: string}): boolean => {
            let dataValue = element[sfield];
            dataValue = QueryTools.valueToCorrectType(sfield, dataValue) as string;
            let startsWithAst = queryValue.startsWith("*");
            let endsWithAst = queryValue.endsWith("*");
            if (startsWithAst && !(endsWithAst)) {
                return dataValue.endsWith(queryValue.slice(1)); // returns true if: comparing "math" with "*th"
            } else if (!startsWithAst && endsWithAst) {
                return dataValue.startsWith(queryValue.slice(0, queryValue.length - 1));
            } else if (startsWithAst && endsWithAst) {
                return dataValue.includes(queryValue.slice(1, queryValue.length - 1));
            } else {
                return dataValue === queryValue;
            }
        };
    }
    /* https://stackoverflow.com/questions/56833469/typescript-error-ts7053-element-implicitly-has-an-any-type
    * https://stackoverflow.com/questions/14638990/are-strongly-typed-functions-as-parameters-possible-in-typescript
    */

    private GT: Filter = (queryPair: object): ComparatorCallback => {
        QueryTools.throwAnyErrInMValue(queryPair, this.datasetId);
        let mfield: string = QueryTools.getField(Object.keys(queryPair)[0]); // Object.keys(query)[0]--> datasetId_field
        let queryValue = Object.values(queryPair)[0];
        return (element: { [index: string]: number | string}): boolean => {
            let tempValue = this.setElementValue(element, mfield);
            let elementValue: number = QueryTools.valueToCorrectType(mfield, tempValue) as number;
            return elementValue  > queryValue ;
        };
    }

    private LT: Filter = (queryPair: object): ComparatorCallback => {
        QueryTools.throwAnyErrInMValue(queryPair, this.datasetId);
        let mfield: string = QueryTools.getField(Object.keys(queryPair)[0]);
        let queryValue = Object.values(queryPair)[0];
        return (element: { [index: string]: number | string}): boolean => {
            let tempValue = this.setElementValue(element, mfield);
            let elementValue: number = QueryTools.valueToCorrectType(mfield, tempValue) as number;
            return elementValue  < queryValue ;
        };
    }

    private EQ: Filter = (queryPair: object): ComparatorCallback => {
        QueryTools.throwAnyErrInMValue(queryPair, this.datasetId);
        let mfield: string = QueryTools.getField(Object.keys(queryPair)[0]);
        let queryValue = Object.values(queryPair)[0];
        return (element: { [index: string]: number | string}): boolean => {
            let tempValue = this.setElementValue(element, mfield);
            let elementValue: number = QueryTools.valueToCorrectType(mfield, tempValue) as number;
            return elementValue === queryValue;
        };
    }

    private setElementValue (element: { [index: string]: number | string}, mfield: string): number {
        let elementValue: number;
        let fieldValue: string | number = element[mfield];
        if (typeof fieldValue === "string") {
            elementValue = ( + fieldValue) as number; // +"2" --> 2, +"" --> 0 (assumes dataset is valid)
        } else {
            elementValue = fieldValue;
        }
        return elementValue;
    }

    // https://basarat.gitbooks.io/typescript/docs/types/index-signatures.html
    private filterFunctionTable: { [index: string]: Filter } = {
        AND: this.AND,
        OR: this.OR,
        NOT: this.NOT,
        GT: this.GT,
        LT: this.LT,
        EQ: this.EQ,
        IS: this.IS
    };
}
