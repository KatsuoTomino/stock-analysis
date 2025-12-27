-- stocksテーブルにdividend_amountカラムを追加
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS dividend_amount DECIMAL(10, 2) DEFAULT NULL;

