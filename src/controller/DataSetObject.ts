import {InsightDatasetKind} from "./IInsightFacade";

// TODO: only store needed data
export default class DataSetObject {
    private readonly codeId: string; // TODO: remove
    private readonly datasetId: string;
    private readonly contents: string;
    private readonly kind: InsightDatasetKind; // TODO: remove
    private numRows: number;
    constructor(datasetId: string, codeId: string, contents: string, kind: InsightDatasetKind) {
        this.datasetId = datasetId;
        this.codeId = codeId;
        this.contents = contents;
        this.kind = kind;
        this.numRows = 0;
    }

    public getCodeId(): string {
        return this.codeId;
    }

    public getDatasetId(): string {
        return this.datasetId;
    }

    public getContentsAsString(): string {
        return this.contents;
    }

    public getKind(): InsightDatasetKind {
        return this.kind;
    }

    public getNumRows(): number {
        return this.numRows;
    }

    public setNumRows(n: number): void {
        this.numRows = n;
    }

    public getKindAsString(): string {

        if (this.kind === InsightDatasetKind.Courses) {
            return "courses";
        }
        if (this.kind === InsightDatasetKind.Rooms) {
            return "rooms";
        }
        return null;
    }
}
