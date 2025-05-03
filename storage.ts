import { Database } from "bun:sqlite";

interface ProductsRecord {
    webflowProductId: number;
    printfulProductId: number;
}

export class ProductRecords {
    private db: Database;

    constructor() {
        this.db = new Database("./database/data.db");
    }

    findFromWebflow(webflowProductId: number): ProductsRecord | undefined {
        const row = this.db.query(`
          SELECT * FROM product_records WHERE webflowProductId = ?
        `).get(webflowProductId);

        return row as ProductsRecord | undefined;
    }

    findFromPrintful(printfulProductId: number): ProductsRecord | undefined {
        const row = this.db.query(`
          SELECT * FROM product_records WHERE printfulProductId = ?
        `).get(printfulProductId);

        return row as ProductsRecord | undefined;
    }

    add(record: ProductsRecord): void {
        this.db.run(`
          INSERT OR IGNORE INTO product_records (webflowProductId, printfulProductId)
          VALUES (?, ?)
        `, [record.webflowProductId, record.printfulProductId]);
    }

    all(): ProductsRecord[] {
        return this.db.query(`SELECT * FROM product_records`).all() as ProductsRecord[];
    }
}

