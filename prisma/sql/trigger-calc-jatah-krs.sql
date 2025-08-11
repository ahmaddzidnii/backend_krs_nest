-- (Opsional) Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS before_krs_insert;

DELIMITER $$

CREATE TRIGGER before_krs_insert
BEFORE INSERT ON mahasiswas
FOR EACH ROW
BEGIN
    -- Gunakan CASE statement untuk logika yang lebih ringkas
    SET NEW.jatah_sks = CASE
        WHEN NEW.ips_lalu >= 3.00 THEN 24
        WHEN NEW.ips_lalu >= 2.50 THEN 22
        WHEN NEW.ips_lalu >= 2.00 THEN 20
        WHEN NEW.ips_lalu >= 1.50 THEN 18
        ELSE 16
    END;
END$$

DELIMITER ;

-- (Opsional) Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS before_krs_update;

DELIMITER $$

CREATE TRIGGER before_krs_update
BEFORE UPDATE ON mahasiswas
FOR EACH ROW
BEGIN
    -- Logikanya sama persis dengan trigger INSERT
    SET NEW.jatah_sks = CASE
        WHEN NEW.ips_lalu >= 3.00 THEN 24
        WHEN NEW.ips_lalu >= 2.50 THEN 22
        WHEN NEW.ips_lalu >= 2.00 THEN 20
        WHEN NEW.ips_lalu >= 1.50 THEN 18
        ELSE 16
    END;
END$$

DELIMITER ;