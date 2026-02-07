-- Function to update card status in dm_the_cham
CREATE OR REPLACE FUNCTION update_card_status_on_borrow_return()
RETURNS TRIGGER AS $$
BEGIN
  -- If a new borrow record is created or updated to 'Đang mượn thẻ'
  IF (TG_OP = 'INSERT' AND NEW.trang_thai = 'Đang mượn thẻ') OR 
     (TG_OP = 'UPDATE' AND NEW.trang_thai = 'Đang mượn thẻ' AND OLD.trang_thai <> 'Đang mượn thẻ') THEN
      UPDATE dm_the_cham
      SET trang_thai = 'Đang mượn thẻ chăm'
      WHERE so_the = NEW.so_the;
  
  -- If a record is updated to 'Đã trả thẻ'
  ELSIF (TG_OP = 'UPDATE' AND NEW.trang_thai = 'Đã trả thẻ' AND OLD.trang_thai <> 'Đã trả thẻ') THEN
      -- Check if there are OTHER active borrows for this card (just in case of data inconsistency)
      -- If no other active borrow exists, mark as returned
      IF NOT EXISTS (
          SELECT 1 FROM quan_ly_the_cham 
          WHERE so_the = NEW.so_the 
          AND trang_thai = 'Đang mượn thẻ' 
          AND id <> NEW.id
      ) THEN
          UPDATE dm_the_cham
          SET trang_thai = 'Đã trả thẻ'
          WHERE so_the = NEW.so_the;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for quan_ly_the_cham
DROP TRIGGER IF EXISTS trigger_update_card_status ON quan_ly_the_cham;

CREATE TRIGGER trigger_update_card_status
AFTER INSERT OR UPDATE ON quan_ly_the_cham
FOR EACH ROW
EXECUTE FUNCTION update_card_status_on_borrow_return();
