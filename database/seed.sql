CREATE TABLE IF NOT EXISTS products (
    webflowProductId INTEGER NOT NULL,
    printfulProductId INTEGER NOT NULL,
    UNIQUE(webflowProductId, printfulProductId)
)
