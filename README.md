# Dự án phần mềm quản lý sản xuất nông trại AKF

Hệ thống quản lý sản xuất cho dự án 250ha (5 zone × 25 block, gấc trên giàn + sâm đất dưới tán), xây dựng trên nền ERPNext v15 với custom app `akf_farm`.

## Trạng thái

**Đang chờ nhà đầu tư trả lời câu hỏi nhóm A** (xem `docs/cau-hoi-nha-dau-tu.md`) — chưa bắt đầu code.

## Tài liệu

| Tài liệu | Vị trí |
|---|---|
| Spec thiết kế 3 giai đoạn | `docs/superpowers/specs/2026-06-12-akf-farm-design.md` |
| Câu hỏi gửi nhà đầu tư | `docs/cau-hoi-nha-dau-tu.md` |
| Tài liệu IT-BA (Word) | `C:\Users\SE-HiepNM\Downloads\AKF_Tai-lieu_IT-BA_v1.0.docx` |
| Mô tả nhu cầu gốc | `C:\Users\SE-HiepNM\Downloads\38833FF26BA1D...\AKF_v0__18-3-2026.md` |

## Lộ trình

1. **GĐ1 (MVP):** zone/block, thư viện đầu việc, lệnh việc, phiếu in A4/A5, nhật ký + ảnh hiện trường (PWA mobile, offline), dashboard, phân quyền 7 vai trò.
2. **GĐ2:** kho vật tư, nghiệm thu QA checklist, chấm công, chu kỳ mùa vụ tự sinh việc, cảnh báo, báo cáo tuần/mùa vụ.
3. **GĐ3:** QR truy xuất nguồn gốc, GIS, cân điện tử, cảm biến, dự báo năng suất, bảo trì, tài chính.

## Môi trường phát triển

- Docker (frappe_docker) trên máy Windows này — site demo `akf.localhost`.
- Production dự kiến: VPS 4 vCPU / 8GB RAM, HTTPS, backup hằng đêm.
