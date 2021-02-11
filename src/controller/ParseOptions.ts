import {InsightError} from "./IInsightFacade";
import QueryTools from "./QueryTools";

interface IDataType { [index: string]: string | number; }
type sortFunction = (columns: IDataType[]) => IDataType[];
export default class ParseOptions {

    private query: any;
    private datasetId: string;
    private finalTieBreakerSortFunction = (a: any , b: any) => -1;
    constructor (datasetId: string, query: any) {
        this.datasetId = datasetId;
        this.query = query;
    }

    // returns an "incomplete" OPTIONS result, with empty applyKey's and a un-applied sorting function
    public parseOptions(data: IDataType[]): IDataType[] {
        let columnsResult:  IDataType[];
        let sortFunctionResult: sortFunction;
        if (!("OPTIONS" in this.query)) {
            throw new InsightError("Query missing: OPTIONS");
        }

        let queryOptions = this.query["OPTIONS"];
        if (!("COLUMNS" in queryOptions)) {
            throw new InsightError("OPTIONS missing: COLUMNS");
        }

        let requestedColumns = queryOptions["COLUMNS"];
        if (!(requestedColumns instanceof Array)) {
            throw new InsightError("COLUMNS value must be an array");
        }

        if (requestedColumns === null || requestedColumns === undefined || requestedColumns.length === 0) {
            throw new InsightError("COLUMNS cant be empty");
        }

        columnsResult = this.COLUMNS(data, requestedColumns);
        if (!("ORDER" in queryOptions)) {
            sortFunctionResult = this.defaultOrderFunction();
        } else {
            let requestedOrder: object | string = queryOptions["ORDER"];
            sortFunctionResult = this.SORT(requestedOrder, requestedColumns);
        }
        return sortFunctionResult(columnsResult);
    }

    private COLUMNS(data: IDataType[], requestedColumns: string[]):  IDataType[] {
        let result: IDataType[] = [];
        let tempField: string;
        if (data.length === 0) {
            result = [];
            return result;
        }

        for (let temp of requestedColumns) {
            QueryTools.throwAnyErrInOrderKey(temp, this.datasetId);
            // desiredKeys[i] = temp; // "course"_"field"
        }
        for (let i = 0; i < data.length; i++) {
            result[i] = {};
            for (const rc of requestedColumns) {
                if (QueryTools.isOrderKeyApplyKey(rc)) {
                    result[i][rc] = data[i][rc];
                } else {
                    tempField = QueryTools.getField(rc);
                    if (tempField in data[i]) {
                        result[i][rc] = data[i][tempField]; // columns[i][key] creates key: results[i][tempField]
                        result[i][rc] = QueryTools.valueToCorrectType(tempField, result[i][rc]);
                    } else {
                        throw new InsightError("orderKey not in data");
                    }
                }
            }
        }
        return result;
    }

    private defaultOrderFunction (): sortFunction {
        return (columns: IDataType[]): IDataType[] => {
            return columns;
        };
    }

    private singleOrderKeyFunction (orderKey: string, requestedColumns: string[]): sortFunction {
        if ( !(requestedColumns.includes(orderKey)) ) {
            throw new InsightError("orderKey not found in Columns");
        }
        QueryTools.throwAnyErrInOrderKey(orderKey, this.datasetId);
        return (columns: IDataType[]): IDataType[] => {
            if (columns.length === 0) {
                return [];
            }
            const sortBy = orderKey;
            columns.sort((a, b) => {
                if (a[sortBy] > b[sortBy]) {
                    return 1;
                } else {
                    return -1;
                }
            });
            return columns;
        };
    }

    private DirectionOrderKeyFunction (orderKey: {[index: string]: any}, requestedColumns: string[]): sortFunction {
        if ( !("dir" in orderKey) ) {
            throw new InsightError("ORDER object missing \"dir\"");
        } else if ( !("keys" in orderKey) ) {
            throw new InsightError("ORDER object missing \"keys\"");
        } else if (Object.keys(orderKey).length > 2) {
            throw new InsightError("ORDER object contains");
        }
        const dir = orderKey["dir"];
        const keys = orderKey["keys"];
        this.throwAnyErrInDir(dir);
        this.throwAnyErrInKeys(keys, requestedColumns);
        let columnSortingFunction: (a: any , b: any) => number;
        if (dir === "UP") {
            columnSortingFunction = this.makeSortUPFunction(keys, 0);
        } else if (dir === "DOWN") {
            columnSortingFunction = this.makeSortDOWNFunction(keys, 0);
        } else {
            throw new InsightError("This error should never be thrown since throwAnyErrInKeys is called");
        }
        return (columns: IDataType[]): IDataType[] => {
            return columns.sort(columnSortingFunction);
        };
    }

    private SORT(orderValue: object | string, requestedColumns: string[]): sortFunction {
        if (typeof orderValue === "string") {
            return this.singleOrderKeyFunction(orderValue, requestedColumns);
        } else if (typeof orderValue === "object") {
            return this.DirectionOrderKeyFunction(orderValue, requestedColumns);
        } else {
            throw new InsightError("ORDER value must be string or object");
        }
    }

    public sortColumns (transformationsResult: IDataType[], sortFunctionResult: sortFunction): IDataType[] {
        return sortFunctionResult(transformationsResult);
    }

    private throwAnyErrInKeys(keys: any, requestedColumns: string[]): void {
        if (keys === null || keys === undefined) {
            throw new InsightError("ORDER keys cannot be null");
        } else if ( !(keys instanceof Array) ) {
            throw new InsightError("ORDER keys must be of type Array");
        } else if (keys.length === 0) {
            throw new InsightError("ORDER keys cannot be empty");
        }
        for (const k of keys) {
            if ( !(requestedColumns.includes(k)) ) {
                throw new InsightError("ORDER key must be in COLUMNS keys");
            }
            QueryTools.throwAnyErrInOrderKey(k, this.datasetId);
        }
    }

    private throwAnyErrInDir(dir: any): void {
        if (dir === null || dir === undefined) {
            throw new InsightError("ORDER dir cannot be null");
        } else if (typeof dir !== "string") {
            throw new InsightError("ORDER dir must be of type string");
        } else if (dir !== "UP" && dir !== "DOWN") {
            throw new InsightError("ORDER dir must be \"UP\" or \"DOWN\"");
        }
    }

    // sets up sort fnction, return 1 if it x or -1 is x, else if they are equal they do the nextffunction which
    // recusiverly create sort functions to break ties, with the base case (Sort up)
    private makeSortUPFunction(keys: string[], index: number): (a: any , b: any) => number {
        const sortBy = keys[index];
        let nextFunction: (a: any , b: any) => number;
        if (index === keys.length) {
            nextFunction = this.finalTieBreakerSortFunction;
        } else {
            const nextIndex = index + 1;
            nextFunction = this.makeSortUPFunction(keys, nextIndex);
        }
        return (a, b) => {
            if (a[sortBy] > b[sortBy]) {
                return 1;
            } else if (a[sortBy] < b[sortBy]) {
                return -1;
            } else if (a[sortBy] === b[sortBy]) {
                return nextFunction(a, b);
            }
        };
    }

    // same things as above, but the equalities flipped aroud. sort down
    private makeSortDOWNFunction(keys: string[], index: number): (a: any , b: any) => number {
        const sortBy = keys[index];
        let nextFunction: (a: any , b: any) => number;
        if (index === keys.length) {
            return nextFunction = this.finalTieBreakerSortFunction;
        } else {
            const nextIndex = index + 1;
            nextFunction = this.makeSortDOWNFunction(keys, nextIndex);
        }
        return (a, b) => {
            if (a[sortBy] < b[sortBy]) {
                return 1;
            } else if (a[sortBy] > b[sortBy]) {
                return -1;
            } else if (a[sortBy] === b[sortBy]) {
                return nextFunction(a, b);
            }
        };
    }
}
