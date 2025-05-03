import { Database } from "bun:sqlite";

interface ProductRecord {
    webflowProductId: number;
    printfulProductId: number;
}

export class ProductRecords {
    private db: Database;

    constructor() {
        this.db = new Database("./database/data.db");
    }

    findFromWebflow(webflowProductId: number): ProductRecord | undefined {
        const row = this.db.query(`
          SELECT * FROM product_records WHERE webflowProductId = ?
        `).get(webflowProductId);

        return row as ProductRecord | undefined;
    }

    findFromPrintful(printfulProductId: number): ProductRecord | undefined {
        const row = this.db.query(`
          SELECT * FROM product_records WHERE printfulProductId = ?
        `).get(printfulProductId);

        return row as ProductRecord | undefined;
    }

    add(record: ProductRecord): void {
        this.db.run(`
          INSERT OR IGNORE INTO product_records (webflowProductId, printfulProductId)
          VALUES (?, ?)
        `, [record.webflowProductId, record.printfulProductId]);
    }

    all(): ProductRecord[] {
        return this.db.query(`SELECT * FROM product_records`).all() as ProductRecord[];
    }
}

