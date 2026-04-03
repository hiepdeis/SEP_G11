ALTER TABLE StockTakeDetails
ADD CountRound INT NOT NULL
    CONSTRAINT DF_StockTakeDetails_CountRound DEFAULT (1);