import * as JSZip from "jszip";
import BuildingTools from "./BuildingTools";
const parse5 = require("parse5");

interface IRoomAttributes {
    number: string; // found inside the tbody views-field views-field-field-room-number
    seats: string; // Capacity
    type: string;
    furniture: string;
    href: string;
}
export default class RoomHelper {
    private searchKeys =
        {number: "views-field views-field-field-room-number",
         seats: "views-field views-field-field-room-capacity",
         furniture: "views-field views-field-field-room-furniture",
         type: "views-field views-field-field-room-type",
         href: "views-field views-field-nothing"};

    private path = "rooms/campus/discover/buildings-and-classrooms/";
    public parseBuilding(shortName: string, theZip: JSZip): Promise<IRoomAttributes[]> {
        return theZip.folder(this.path).file(shortName).async("text")
            .then((resultString) => {
                let html = parse5.parse(resultString);
                // Log.info(html);
                // 0 -> generate room Attr
                // 1---> get the table -> tranverse
                let roomAttributesArr: IRoomAttributes[] = this.getRoomAttributes(html);
                return roomAttributesArr;
            }).then().catch((err: any) => {
            return Promise.reject(err);
        });
    }

    private getRoomAttributes(html: any): IRoomAttributes[] {
        let resultsAttribute: IRoomAttributes[] = [];
        let table = BuildingTools.getTable(html.childNodes, "table");
        if (table === null) {
            return null;
        }
        let tbody = BuildingTools.getTable(table.childNodes, "tbody");
        if (tbody === null) {
            return null;
        }
        for (const childIndex in tbody.childNodes) {
            let searchTerms: {[index: string]: string} = {
                number: null,
                seats: null,
                furniture: null,
                type: null,
                href: null};
            // grabs indexs from Array of children of tbody
            let child: Node = tbody.childNodes[childIndex];
            if (child.nodeName === "tr") {
                // creat dataset obj
                resultsAttribute.push(this.getRoomObject(child, searchTerms));
            } else {
                let trChild = BuildingTools.getTable(child.childNodes, "tr");
                if (trChild !== null) {
                    resultsAttribute.push(this.getRoomObject(trChild, searchTerms));
                }
            }
        }
        return resultsAttribute;
    }

    private getRoomObject(trNode: Node, searchTerms: {[index: string]: string}): IRoomAttributes {
        let roomNumber: string = "";
        let seats: string = "";
        let furniture: string = "";
        let type: string = "";
        let href: string = "";
        for (const child in trNode.childNodes) {
            let trChild: any = trNode.childNodes[child];
            if (trChild.nodeName === "td") {
                let value = BuildingTools.getNodeValue(trChild);
                value = BuildingTools.cleanValue(value);
                if (value === this.searchKeys.seats) {
                    seats = BuildingTools.getTextNodeValue(trChild);
                } else if (value === this.searchKeys.furniture) {
                    furniture = BuildingTools.getTextNodeValue(trChild);
                } else if (value === this.searchKeys.type) {
                    type = BuildingTools.getTextNodeValue(trChild);
                } else if (value === this.searchKeys.number) {
                    // special
                    roomNumber = this.getRoomNumber(trChild);
                } else if (value === this.searchKeys.href) {
                    href = this.getHrefString(trChild);
                }
            }
        }
        return {
            number: roomNumber,  // found inside the tbody views-field views-field-field-room-number
            seats:  seats, // Capacity
            type: type,
            furniture: furniture,
            href: href
        };
    }

    private getHrefString(trChild: any): string {
        let nodes = trChild.childNodes;
        for (let c in nodes) {
            if (nodes[c].nodeName === "a") {
                let childsAttr = nodes[c]["attrs"];
                for (let gc in childsAttr) {
                    if (childsAttr[gc]["name"] === "href") {
                        return childsAttr[gc]["value"];
                    }
                }
            }
        }
        return "";
    }

    private getRoomNumber(trChild: any): string {
        let nodes = trChild.childNodes;
        for (let c in nodes) {
            if (nodes[c].nodeName === "a") {
                let childsAttr = nodes[c].childNodes;
                for (let gc in childsAttr) {
                    if (childsAttr[gc].nodeName === "#text") {
                        return childsAttr[gc]["value"];
                    }
                }
            }
        }
        return "";
    }
}
