
CREATE TABLE InventoryCurrents (
    ID BIGINT IDENTITY(1,1) PRIMARY KEY,

    WarehouseID INT NULL,
    BinID INT NOT NULL,
    MaterialID INT NOT NULL,
    BatchID INT NOT NULL,

    QuantityOnHand DECIMAL(18,4) NULL,
    QuantityAllocated DECIMAL(18,4) NULL,

    LastUpdated DATETIME NULL
);


ALTER TABLE InventoryCurrents
ADD CONSTRAINT FK_InventoryCurrents_Warehouses
FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID);

ALTER TABLE InventoryCurrents
ADD CONSTRAINT FK_InventoryCurrents_Bins
FOREIGN KEY (BinID) REFERENCES BinLocations(BinID);

ALTER TABLE InventoryCurrents
ADD CONSTRAINT FK_InventoryCurrents_Materials
FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID);

ALTER TABLE InventoryCurrents
ADD CONSTRAINT FK_InventoryCurrents_Batches
FOREIGN KEY (BatchID) REFERENCES Batches(BatchID);