CREATE TABLE IF NOT EXISTS product_records (
    webflowProductId INTEGER NOT NULL,
    printfulProductId INTEGER NOT NULL,
    UNIQUE(webflowProductId, printfulProductId)
)
