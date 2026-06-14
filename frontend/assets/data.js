/* ===== Dữ liệu mẫu cho prototype (không nối backend) ===== */
const LEADERS = [
  { id: "tt1", name: "Nguyễn Văn Ba", init: "B" },
  { id: "tt2", name: "Trần Văn Sáu", init: "S" },
  { id: "tt3", name: "Lê Thị Hoa", init: "H" },
];

// Bố cục lưới các lô trên bản đồ (x,y theo ô lưới)
const BLOCKS = [
  { id: "A1", zone: "Vùng A", area: 2.4, crops: ["gac","sam"], leader: "tt1", status: "green", gx:0, gy:0 },
  { id: "A2", zone: "Vùng A", area: 1.8, crops: ["sam"],        leader: "tt1", status: "amber", gx:1, gy:0 },
  { id: "A3", zone: "Vùng A", area: 3.1, crops: ["gac","sam"], leader: "tt2", status: "red",   gx:2, gy:0 },
  { id: "B1", zone: "Vùng B", area: 2.0, crops: ["gac"],        leader: "tt2", status: "green", gx:0, gy:1 },
  { id: "B2", zone: "Vùng B", area: 2.7, crops: ["gac","sam"], leader: "tt3", status: "green", gx:1, gy:1 },
  { id: "B3", zone: "Vùng B", area: 1.5, crops: ["sam"],        leader: "tt3", status: "amber", gx:2, gy:1 },
];

const STATUS = {
  green: { label:"Bình thường", cls:"b-green", dot:"s-green", fill:"#4A8A5E" },
  amber: { label:"Cần chú ý",   cls:"b-amber", dot:"s-amber", fill:"#D49321" },
  red:   { label:"Có vấn đề",   cls:"b-red",   dot:"s-red",   fill:"#BD4130" },
};
const CROP = { gac:{label:"Gấc",cls:"cr-gac",bd:"b-clay"}, sam:{label:"Sâm",cls:"cr-sam",bd:"b-green"}, share:{label:"Chung",cls:"cr-share",bd:"b-gray"} };

// Quy trình canh tác (rút gọn để demo — đủ minh hoạ tần suất & phạm vi)
const PROCESS = {
  sam: { name:"Quy trình canh tác cây Sâm", steps:[
    [1,"Rải phân cải tạo đất","2","1095 ngày/lần","Theo cây"],
    [6,"Xuống giống trồng","2","1095 ngày/lần","Theo cây"],
    [8,"Chu kỳ bón lá","1","20 ngày/lần","Theo cây"],
    [9,"Chu kỳ bón củ","2","30 ngày/lần","Theo cây"],
    [10,"Thu hoạch thân lá Sâm","1","75 ngày/lần","Theo cây"],
    [16,"Loại cỏ dại và cây dại","—","Hàng ngày","Dùng chung"],
    [18,"Kiểm tra hệ thống tưới","—","Hàng ngày","Dùng chung"],
    [21,"Nhập số liệu sản xuất","—","Hàng ngày","Dùng chung"],
    [22,"Báo cáo bất thường","—","Hàng ngày","Dùng chung"],
  ]},
  gac: { name:"Quy trình canh tác cây Gấc", steps:[
    [1,"Đào hố trồng 60x60cm","2","1 lần/20 năm","Theo cây"],
    [2,"Ép cọc giàn 400x500cm","2","1 lần/20 năm","Theo cây"],
    [7,"Bón phân nước định kỳ","2","60 ngày/lần","Theo cây"],
    [10,"Dẫn ngọn leo giàn","1","Hàng ngày","Theo cây"],
    [11,"Thu hoạch quả Gấc","2","Theo mùa","Theo cây"],
    [16,"Loại cỏ dại và cây dại","—","Hàng ngày","Dùng chung"],
    [19,"Kiểm tra sâu, bệnh","—","Hàng ngày","Dùng chung"],
    [21,"Nhập số liệu sản xuất","—","Hàng ngày","Dùng chung"],
    [22,"Báo cáo bất thường","—","Hàng ngày","Dùng chung"],
  ]},
};

// Việc trong 10 ngày (offset ngày từ hôm nay) — tên, lô, cây, tổ trưởng, trạng thái
const TASKS = [
  {d:0, t:"Chu kỳ bón lá", blk:"A1", crop:"sam", leader:"tt1", st:"green", mandays:2.4},
  {d:0, t:"Dẫn ngọn leo giàn", blk:"A1", crop:"gac", leader:"tt1", st:"green", mandays:2.4},
  {d:0, t:"Kiểm tra hệ thống tưới", blk:"A2", crop:"share", leader:"tt1", st:"amber", mandays:0},
  {d:0, t:"Loại cỏ dại", blk:"A3", crop:"share", leader:"tt2", st:"red", mandays:0},
  {d:0, t:"Thu hoạch thân lá Sâm", blk:"B3", crop:"sam", leader:"tt3", st:"green", mandays:1.5},
  {d:1, t:"Bón phân nước định kỳ", blk:"B1", crop:"gac", leader:"tt2", st:"green", mandays:4.0},
  {d:1, t:"Chu kỳ bón củ", blk:"A1", crop:"sam", leader:"tt1", st:"green", mandays:4.8},
  {d:1, t:"Kiểm tra sâu, bệnh", blk:"B2", crop:"share", leader:"tt3", st:"green", mandays:0},
  {d:2, t:"Dẫn ngọn leo giàn", blk:"A3", crop:"gac", leader:"tt2", st:"green", mandays:3.1},
  {d:2, t:"Loại cỏ dại", blk:"B2", crop:"share", leader:"tt3", st:"green", mandays:0},
  {d:3, t:"Chu kỳ bón lá", blk:"B3", crop:"sam", leader:"tt3", st:"green", mandays:1.5},
  {d:3, t:"Thu hoạch quả Gấc", blk:"A1", crop:"gac", leader:"tt1", st:"green", mandays:4.8},
  {d:4, t:"Kiểm tra hệ thống tưới", blk:"B1", crop:"share", leader:"tt2", st:"green", mandays:0},
  {d:5, t:"Chu kỳ bón củ", blk:"B2", crop:"sam", leader:"tt3", st:"green", mandays:5.4},
  {d:6, t:"Dẫn ngọn leo giàn", blk:"A1", crop:"gac", leader:"tt1", st:"green", mandays:2.4},
  {d:7, t:"Thu hoạch thân lá Sâm", blk:"A2", crop:"sam", leader:"tt1", st:"green", mandays:1.8},
  {d:8, t:"Bón phân nước định kỳ", blk:"A3", crop:"gac", leader:"tt2", st:"green", mandays:6.2},
  {d:9, t:"Chu kỳ bón lá", blk:"B2", crop:"sam", leader:"tt3", st:"green", mandays:2.7},
];

// KPI tổ trưởng (kỳ: 30 ngày gần nhất)
const KPI = [
  { id:"tt1", ontime:96, overdue:1, done:48, reportRate:100, abnormal:2, mandays:62 },
  { id:"tt2", ontime:82, overdue:4, done:41, reportRate:90,  abnormal:5, mandays:58 },
  { id:"tt3", ontime:94, overdue:2, done:45, reportRate:97,  abnormal:1, mandays:55 },
];

const ALERTS = [
  { type:"red", txt:"Lô A3 — Việc \"Loại cỏ dại\" quá hạn 1 ngày", who:"Trần Văn Sáu" },
  { type:"red", txt:"Lô A3 — Báo cáo bất thường: phát hiện sâu trên giàn gấc", who:"Trần Văn Sáu" },
  { type:"amber", txt:"Lô A2 — Việc \"Kiểm tra hệ thống tưới\" đến hạn chưa xong", who:"Nguyễn Văn Ba" },
  { type:"amber", txt:"Lô B3 — Tiến độ thu hoạch chậm so với kế hoạch", who:"Lê Thị Hoa" },
];

const DOW = ["CN","T2","T3","T4","T5","T6","T7"];
function leaderName(id){ return (LEADERS.find(l=>l.id===id)||{}).name || "—"; }
function leaderInit(id){ return (LEADERS.find(l=>l.id===id)||{}).init || "?"; }
