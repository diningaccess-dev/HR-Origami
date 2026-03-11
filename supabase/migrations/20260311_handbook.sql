-- ============================================================
-- Company Handbook: owner-editable content for AI system prompt
-- ============================================================

CREATE TABLE IF NOT EXISTS company_handbook (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL DEFAULT 'all',
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  updated_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed mặc định
INSERT INTO company_handbook (location_id, title, content) VALUES
('all', 'Đồ uống', '**Latte:**
1. Xay 18g cà phê espresso, chiết xuất 30ml (25-30 giây)
2. Đánh sữa nóng 60-65°C, tạo bọt mịn
3. Rót sữa vào ly 240ml, tạo latte art
4. Phục vụ ngay

**Cappuccino:**
1. Chiết xuất 30ml espresso
2. Đánh sữa nóng: 1/3 espresso, 1/3 sữa nóng, 1/3 bọt sữa
3. Ly 180ml, rắc bột cacao

**Matcha Latte:**
1. 2g bột matcha + 30ml nước nóng 80°C, khuấy đều
2. Đánh sữa nóng 60-65°C
3. Rót sữa, đặt matcha lên trên

**Trà đào:**
1. 200ml trà đen + 30ml syrup đào
2. 3-4 lát đào ngâm + đá viên, khuấy đều'),
('all', 'Nội quy', '**Giờ làm việc:**
- Ca sáng: 10:30 - 15:00
- Ca chiều: 15:00 - 22:00
- Có mặt trước ca 10 phút
- Check-in trên app khi bắt đầu ca

**Đồng phục:**
- Áo đồng phục sạch sẽ, quần dài đen
- Giày kín mũi, chống trượt
- Tóc gọn gàng, không sơn móng tay

**Quy tắc:**
- Không sử dụng điện thoại trong giờ làm
- Không ăn uống ở khu vực phục vụ
- Lịch sự, thân thiện với khách'),
('all', 'Quy trình HR', '**Xin nghỉ phép:**
1. Vào app → Hồ sơ → Nghỉ phép
2. Chọn ngày, ghi lý do → gửi
3. Gửi trước ít nhất 2 tuần

**Báo ốm:**
1. Gọi/nhắn quản lý TRƯỚC giờ ca
2. App → Hồ sơ → Báo ốm
3. Ốm > 3 ngày: cần giấy khám bệnh

**Đổi ca:**
1. App → Lịch → Chợ ca
2. Đăng ca muốn đổi → đồng nghiệp nhận → quản lý duyệt');

ALTER TABLE company_handbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handbook_select" ON company_handbook FOR SELECT TO authenticated USING (true);
CREATE POLICY "handbook_update" ON company_handbook FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner')));
