-- stocksテーブルにmemoカラムを追加
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS memo VARCHAR(50) DEFAULT NULL;
