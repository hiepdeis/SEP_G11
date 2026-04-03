CREATE TABLE IssueSlipApprovals (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,

    IssueID BIGINT NOT NULL,

    Step VARCHAR(50) NOT NULL,
    StepOrder INT NOT NULL,

    ApprovedBy INT NULL,
    ApprovedDate DATETIME NULL,

    Status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    Note NVARCHAR(500) NULL,

    CONSTRAINT FK_IssueSlipApprovals_IssueSlip
        FOREIGN KEY (IssueID) REFERENCES IssueSlips(IssueID)
        ON DELETE CASCADE,

    CONSTRAINT FK_IssueSlipApprovals_User
        FOREIGN KEY (ApprovedBy) REFERENCES Users(UserId)
);


ALTER TABLE IssueSlipApprovals
ADD IsActive BIT NOT NULL DEFAULT 1;