import { Database } from "bun:sqlite";

interface ProductRecord {
    webflowProductId: number;
    printfulProductId: number;
}

class ProductRecords {
    private db: Database;

    constructor() {
        const dbPath = Bun.env.NODE_ENV === "production" ?
            "/data/data.db" :
            "./data/data.db";

        this.db = new Database(dbPath);
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

    deleteFromWebflow(webflowProductId: number) {
        this.db.run(`
            DELETE FROM product_records WHERE webflowProductId = ?
       `, [webflowProductId]);
    }

    deleteFromPrintful(printfulProductId: number) {
        this.db.run(`
            DELETE FROM product_records WHERE printfulProductId = ?
       `, [printfulProductId]);
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

export const productRecords = new ProductRecords();
