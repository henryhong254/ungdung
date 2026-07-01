export const PRODUCT_TYPES = [
  { value: "workshop", label: "Workshop" },
  { value: "coaching", label: "Coaching 1:1" },
  { value: "b2b", label: "Đào Tạo DN" },
  { value: "course", label: "Khóa học" },
] as const;

export const PRODUCTS = [
  { value: "Workshop Landing Page 3 Không", type: "workshop" },
  { value: "Coaching 1:1 Offer Khó Cưỡng", type: "coaching" },
  { value: "Đào Tạo Doanh Nghiệp", type: "b2b" },
  { value: "Khóa học làm web", type: "course" },
  { value: "Workshop Design Social bằng AI", type: "workshop" },
] as const;

export const SOURCES = [
  { value: "gioi-thieu", label: "Giới thiệu" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "su-kien", label: "Sự kiện" },
  { value: "khac", label: "Khác" },
] as const;

export const STATUSES = [
  { value: "moi-dang-ky", label: "Mới đăng ký", color: "bg-blue-100 text-blue-800" },
  { value: "da-tu-van", label: "Đã tư vấn", color: "bg-yellow-100 text-yellow-800" },
  { value: "da-chot", label: "Đã chốt", color: "bg-green-100 text-green-800" },
  { value: "cham-soc-sau", label: "Chăm sóc sau", color: "bg-purple-100 text-purple-800" },
] as const;

export const SEGMENTS = [
  { value: "vip", label: "VIP", color: "bg-amber-100 text-amber-800" },
  { value: "thuong", label: "Thường", color: "bg-gray-100 text-gray-800" },
  { value: "moi", label: "Mới", color: "bg-sky-100 text-sky-800" },
] as const;

export const COACHING_FIELDS = [
  { key: "revenue", label: "Doanh thu hiện tại" },
  { key: "teamSize", label: "Quy mô team" },
  { key: "mainProblem", label: "Vấn đề muốn giải quyết" },
  { key: "concern", label: "Lo ngại chính" },
  { key: "previousCoaching", label: "Đã đầu tư coaching chưa" },
] as const;

export const B2B_FIELDS = [
  { key: "companyName", label: "Tên công ty" },
  { key: "position", label: "Chức vụ" },
  { key: "companySize", label: "Quy mô nhân sự" },
  { key: "trainingNeed", label: "Nhu cầu đào tạo" },
  { key: "budget", label: "Ngân sách dự kiến" },
  { key: "timeline", label: "Timeline" },
] as const;

export const WORK_TYPE_COLORS: Record<string, { bar: string; bg: string; text: string; dot: string }> = {
  "truyen-thong":   { bar: "bg-purple-400", bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  "build-product":  { bar: "bg-blue-400",   bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400" },
  "delivery":       { bar: "bg-green-400",  bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-400" },
  "build-he-thong": { bar: "bg-orange-400", bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  "cskh":           { bar: "bg-pink-400",   bg: "bg-pink-50",    text: "text-pink-700",   dot: "bg-pink-400" },
  "report-meeting": { bar: "bg-gray-400",   bg: "bg-gray-50",    text: "text-gray-600",   dot: "bg-gray-400" },
};

export const WORK_TYPES = [
  { value: "truyen-thong", label: "Truyền Thông", desc: "Đăng bài, ads, content marketing" },
  { value: "build-product", label: "Build Product", desc: "Phát triển khóa học, tài liệu, offer" },
  { value: "delivery", label: "Delivery", desc: "Dạy, coaching, đào tạo trực tiếp" },
  { value: "build-he-thong", label: "Build Hệ Thống", desc: "Web, Landing Page, App, Tool" },
  { value: "cskh", label: "CSKH", desc: "Chăm sóc, tư vấn, xử lý hồ sơ khách" },
  { value: "report-meeting", label: "Report & Meeting", desc: "Báo cáo, họp nội bộ, review" },
] as const;

export const ALL_PRODUCTS = [
  "Workshop Landing Page 3 Không",
  "Coaching 1:1 Offer Khó Cưỡng",
  "Đào Tạo Doanh Nghiệp",
  "Khóa học làm web",
  "Workshop Design Social bằng AI",
  "Chung (không gắn sản phẩm)",
] as const;

export const ROLES = [
  { value: "expert", label: "Expert" },
  { value: "assistant", label: "Trợ lý" },
] as const;
