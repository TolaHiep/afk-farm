// Các hằng số cho hệ thống quản lý nông trại

export const APP_NAME = 'Hệ thống Quản lý Sản xuất Nông trại'

export const CROP_TYPES = {
  GAC: 'Gấc',
  SAM: 'Sâm',
} as const

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const

export const TASK_STATUS_LABELS = {
  pending: 'Chưa bắt đầu',
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
  overdue: 'Quá hạn',
} as const

export const ABNORMALITY_TYPES = {
  WEATHER: 'weather',
  PEST: 'pest',
  DISEASE: 'disease',
  SUPPLY: 'supply',
  OTHER: 'other',
} as const

export const ABNORMALITY_LABELS = {
  weather: 'Thời tiết',
  pest: 'Côn trùng',
  disease: 'Bệnh',
  supply: 'Vật tư thiếu',
  other: 'Khác',
} as const

export const BLOCK_STATUS = {
  GREEN: 'green',   // Xanh: Đúng hạn
  YELLOW: 'yellow', // Vàng: Cảnh báo
  RED: 'red',       // Đỏ: Quá hạn / Bất thường
} as const

export const ALERT_TYPES = {
  OVERDUE: 'overdue',
  ABNORMALITY: 'abnormality',
  LOW_SUPPLY: 'low_supply',
} as const

export const ALERT_LABELS = {
  overdue: 'Công việc quá hạn',
  abnormality: 'Bất thường mới',
  low_supply: 'Vật tư sau này',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  TEAM_LEAD: 'team_lead',
  MEMBER: 'member',
} as const

export const USER_ROLE_LABELS = {
  admin: 'Quản trị viên',
  team_lead: 'Tổ trưởng',
  member: 'Thành viên',
} as const

// Colors cho hệ thống
export const COLORS = {
  SIDEBAR: '#2C3E50',
  SIDEBAR_TEXT: '#FFFFFF',
  GREEN: '#27AE60',
  GREEN_LIGHT: '#2ECC71',
  YELLOW: '#F39C12',
  RED: '#E74C3C',
  WHITE: '#FFFFFF',
  GRAY_LIGHT: '#F5F5F5',
  GRAY_LIGHTER: '#FAFAFA',
  GRAY: '#E0E0E0',
  GRAY_DARK: '#666666',
  BLACK: '#1A1A1A',
} as const

// Messages
export const MESSAGES = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  WELCOME: 'Chào mừng',
  ERROR: 'Lỗi',
  SUCCESS: 'Thành công',
  CONFIRM: 'Xác nhận',
  CANCEL: 'Hủy',
  SAVE: 'Lưu',
  DELETE: 'Xóa',
  EDIT: 'Chỉnh sửa',
  CREATE: 'Tạo',
  CLOSE: 'Đóng',
  BACK: 'Quay lại',
  LOADING: 'Đang tải...',
  NO_DATA: 'Không có dữ liệu',
  OFFLINE: 'Không có mạng',
  SYNC: 'Đồng bộ',
  SEND: 'Gửi',
  REPORT: 'Báo cáo',
  DETAIL: 'Chi tiết',
  FILTER: 'Lọc',
  SEARCH: 'Tìm kiếm',
} as const
