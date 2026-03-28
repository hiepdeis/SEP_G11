ALTER TABLE Projects
ADD BudgetUsed DECIMAL(18,2) NULL;

ALTER TABLE Projects
ADD BudgetRemaining AS (Budget - BudgetUsed);