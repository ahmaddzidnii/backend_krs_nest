-- ===================================================
-- SKRIP UNTUK MEMBUAT TRIGGER DETAIL KRS (PERBAIKAN)
-- ===================================================

-- (Opsional tapi disarankan) Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS after_detail_krs_insert;

-- Mengubah delimiter agar bisa menggunakan ';' di dalam trigger
DELIMITER $$

-- --- TRIGGER UNTUK INSERT ---
CREATE TRIGGER after_detail_krs_insert
AFTER INSERT ON detail_krs
FOR EACH ROW
BEGIN
    -- Deklarasikan variabel untuk menampung SKS
    DECLARE sks_to_add INT;

    -- Ambil jumlah SKS dari mata kuliah yang baru ditambahkan
    -- COALESCE akan mengubah hasil NULL (jika tidak ditemukan) menjadi 0
    SELECT COALESCE(mk.sks, 0) INTO sks_to_add
    FROM kelas_ditawarkan kd
    JOIN mata_kuliah mk ON kd.id_matkul = mk.id_matkul
    WHERE kd.id_kelas = NEW.id_kelas;

    -- Update tabel krs, tambahkan total SKS
    -- COALESCE juga digunakan di sini untuk melindungi jika total_sks_diambil awalnya NULL
    UPDATE krs
    SET
        total_sks_diambil = COALESCE(total_sks_diambil, 0) + sks_to_add,
        updated_at = NOW()
    WHERE id_krs = NEW.id_krs;
END$$

-- Mengembalikan delimiter ke default
DELIMITER ;


-- Hapus trigger lama untuk digantikan dengan versi baru yang lebih baik
DROP TRIGGER IF EXISTS after_detail_krs_delete;

DELIMITER $$

CREATE TRIGGER after_detail_krs_delete
AFTER DELETE ON detail_krs
FOR EACH ROW
BEGIN
    DECLARE sks_to_subtract INT;

    SELECT COALESCE(mk.sks, 0) INTO sks_to_subtract
    FROM kelas_ditawarkan kd
    JOIN mata_kuliah mk ON kd.id_matkul = mk.id_matkul
    WHERE kd.id_kelas = OLD.id_kelas;

    -- --- PERUBAHAN DI SINI ---
    UPDATE krs
    SET
        -- Gunakan GREATEST untuk memastikan total SKS tidak pernah kurang dari 0
        total_sks_diambil = GREATEST(0, COALESCE(total_sks_diambil, 0) - sks_to_subtract),
        updated_at = NOW()
    WHERE id_krs = OLD.id_krs;
END$$

DELIMITER ;