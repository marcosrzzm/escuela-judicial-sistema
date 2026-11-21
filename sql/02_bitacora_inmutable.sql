-- La bitácora solo se inserta: ni la aplicación ni nadie puede editarla o borrarla.
-- Deshacer: DROP TRIGGER bitacora_sin_update; DROP TRIGGER bitacora_sin_delete;
CREATE TRIGGER bitacora_sin_update BEFORE UPDATE ON bitacora_cambio FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitacora no se edita';
CREATE TRIGGER bitacora_sin_delete BEFORE DELETE ON bitacora_cambio FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitacora no se borra';
