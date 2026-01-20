-- memoカラムをVARCHAR(50)からVARCHAR(100)に変更
ALTER TABLE stocks ALTER COLUMN memo TYPE VARCHAR(100);

-- payout_ratioカラムをDECIMAL(5, 2)からDECIMAL(10, 2)に変更（マイナス値と100%以上の値を許可）
ALTER TABLE stocks ALTER COLUMN payout_ratio TYPE DECIMAL(10, 2);
