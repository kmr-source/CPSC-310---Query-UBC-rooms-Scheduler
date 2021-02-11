
export default class BuildingTools {

    public static getTable(arrayNode: NodeListOf<ChildNode>, searchString: string): Node {
        let tableNode = null;
        for (let i in arrayNode) {
            let value = arrayNode[i];
            if (this.matchingNodeName(searchString, value)) {
                return value;
            } else if (value.childNodes !== undefined) {
                tableNode = this.getTable(value.childNodes, searchString);
                if (tableNode !== null) {
                    return tableNode;
                }
            }
        }
        return tableNode;
    }
    // public static getTable(arrayNode: NodeListOf<ChildNode>, searchString: string): Node {
    //     let node = null;
    //     let tableNode;
    //     for (const n in arrayNode) {
    //         node = arrayNode[n];
    //         tableNode = this.recurseNode(node, searchString);
    //         if (tableNode !== null) {
    //             return tableNode;
    //         }
    //     }
    // }
    //
    // private static recurseNode(node: ChildNode, searchString: string): Node {
    //     let tableNode;
    //     if (node !== null && node !== undefined) {
    //         if (node.nodeName === searchString) {
    //             return node;
    //         } else {
    //             for (const n in node.childNodes) {
    //                 tableNode = this.recurseNode(node.childNodes[n], searchString);
    //                 if (tableNode !== null) {
    //                     return tableNode;
    //                 }
    //             }
    //         }
    //     } else {
    //         return null;
    //     }
    // }

    public static recurseTable(node: any, searchString: string) {
        if (node.nodeName === searchString) {
            return node;
        } else {
            this.recurseTable(node, searchString);
        }
    }

    // public static getTable(arrayNode: NodeListOf<ChildNode>, searchString: string): Node {
    //     let node = null;
    //     for (let n in arrayNode) {
    //         node = arrayNode[n];
    //         if (node.nodeName === searchString) {
    //             return node;
    //         } else if (node.childNodes !== undefined) {
    //             return this.getTable(node.childNodes, searchString);
    //         }
    //     }
    //     return null;
    // }

    // gets the table of the searchTerm we are looking for
    private static matchingNodeName(tag: string, n: Node): boolean {
        if (n.nodeName === tag) {
            return true;
        }
    }

    public static cleanValue(value: string) {
        if (value === undefined) {
            return "";
        }
        let cleanSlashN = value.replace(/\n|\r/g, "");
        return cleanSlashN.trim();
    }

    public static getIndexSearchTerms(table: Node, setSearchTermsForIndex:
        (searchTerms: object, value: string, child: any) => void) {
        let searchTerms: { code: string, address: string, building: string } = {
            code: null,
            address: null, building: null
        };
        for (const index in table.childNodes) {
            let child = table.childNodes[index];
            if (child.nodeName === "th") {
                let grandChilds = child.childNodes;
                for (const gcIndex in grandChilds) {
                    let granchildOne: any = grandChilds[gcIndex];
                    if (grandChilds[gcIndex].nodeName === "#text") {
                        let value = this.getNodeValue(granchildOne);
                        value = this.cleanValue(value);
                        setSearchTermsForIndex(searchTerms, value, child);
                    }
                }
            }
        }
        return searchTerms;
    }

    // assume node only has one attr
    public static getNodeValue(node: any): string {
        if (node.nodeName === "#text") {
            return node["value"];
        }
        let attr = node["attrs"][0];
        return attr["value"];
    }

    public static getThreadTr(table: Node): ChildNode {
        for (const i in table.childNodes) {
            if (table.childNodes[i].nodeName === "thead") {
                let child = table.childNodes[i];
                for (const j in child.childNodes) {
                    if (child.childNodes[j].nodeName === "tr") {
                        return child.childNodes[j];
                    }
                }
            }
        }
    }

    public static getTextNodeValue(trChild: ChildNode): string {
        let child = trChild.childNodes;
        for (let c in child) {
            if (child[c].nodeName === "#text") {
                return BuildingTools.cleanValue(BuildingTools.getNodeValue(child[c]));
            }
        }
        return null;
    }
}
