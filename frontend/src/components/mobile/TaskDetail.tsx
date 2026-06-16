import React from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, MapPin, Calendar, Camera, CheckCircle, LifeBuoy, Play } from "lucide-react";
import { getTaskDetail, completeTask, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid } from "../../lib/offline";

type TaskStatus = "pending" | "in-progress" | "completed" | "overdue";

const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: "Chưa bắt đầu", cls: "bg-gray-100 text-gray-700" },
  "in-progress": { label: "Đang làm", cls: "bg-blue-100 text-blue-800" },
  completed: { label: "Hoàn thành", cls: "bg-green-100 text-green-800" },
  overdue: { label: "Quá hạn", cls: "bg-red-100 text-red-800" },
};

// Mô hình xen canh: Gấc leo giàn (tầng trên) + Sâm dưới tán (tầng dưới)
function cropMeta(crop: string) {
  switch (crop) {
    case "Gấc":
      return { label: "Gấc · tầng giàn", layer: "Tầng trên — leo giàn", cls: "bg-emerald-100 text-emerald-800" };
    case "Sâm":
      return { label: "Sâm · dưới tán", layer: "Tầng dưới — dưới tán", cls: "bg-amber-100 text-amber-800" };
    default:
      return { label: crop, layer: "", cls: "bg-gray-100 text-gray-700" };
  }
}

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<TaskStatus>("pending");
  const [hasPhoto, setHasPhoto] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Map plotId -> tên lô thật (lấy từ API)
  const [plotNames, setPlotNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    getMyPlots()
      .then((plots) => {
        const map: Record<string, string> = {};
        for (const p of plots) map[p.id] = p.name;
        setPlotNames(map);
      })
      .catch(() => setPlotNames({}));
  }, []);

  React.useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getTaskDetail(id)
      .then((data) => {
        if (!alive) return;
        setTask(data);
        setStatus((data?.status as TaskStatus) || "pending");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Đang tải…</div>;
  }

  if (!task) {
    return <div className="p-4">Không tìm thấy công việc</div>;
  }

  // "Bắt đầu" chỉ bấm được khi đang ở pending/overdue (chưa bắt đầu)
  const canStart = status === "pending" || status === "overdue";
  // "Hoàn thành" chỉ bấm được khi đã bắt đầu (in-progress)
  const canComplete = status === "in-progress";

  const handleStart = () => {
    if (!canStart) return;
    setStatus("in-progress");
  };

  const handleComplete = () => {
    if (!canComplete) return;
    if (task.requirePhoto && !hasPhoto) {
      alert("Bạn cần chụp ảnh trước khi hoàn thành!");
      return;
    }
    setShowConfirmation(true);
  };

  const confirmCompletion = async () => {
    if (!id) return;
    setError(null);
    const photos = task.photos ?? [];
    const clientUuid = uid();
    try {
      await completeTask(id, clientUuid, photos);
      setStatus("completed");
      setShowConfirmation(false);
      navigate("/mobile/success");
    } catch (e: any) {
      if (isNetworkError(e)) {
        enqueueOffline({
          id: clientUuid, kind: "task",
          payload: { task: id, client_uuid: clientUuid, photos },
          title: task.title,
          date: new Date().toISOString(),
        });
        setStatus("completed");
        setShowConfirmation(false);
        navigate("/mobile/success");
      } else {
        setError(e?.message || "Không thể hoàn thành công việc. Vui lòng thử lại.");
      }
    }
  };

  const statusMeta = STATUS_META[status];
  const crop = cropMeta(task.crop);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <Link to="/mobile/tasks" className="inline-block mb-3">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusMeta.cls}`}
          >
            {statusMeta.label}
          </span>
          {/* Badge cây + tầng: phân biệt việc Gấc (giàn) / Sâm (dưới tán) trong cùng lô */}
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${crop.cls}`}
          >
            {crop.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Task Info */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Lô</p>
              <p className="font-bold text-gray-900">{plotNames[task.plotId] || task.plotId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="text-gray-600">🌱</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cây trồng (xen canh)</p>
              <p className="font-bold text-gray-900">
                {task.crop}
                {crop.layer && (
                  <span className="ml-2 text-sm font-medium text-gray-500">· {crop.layer}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Ngày</p>
              <p className="font-bold text-gray-900">
                {new Date(task.date).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
        </div>

        {/* SOP */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">Hướng dẫn thực hiện</h3>
          <div className="space-y-2 text-gray-700">
            {task.title === "Tưới nước" && (
              <>
                <p>• Tưới đều khắp khu vực</p>
                <p>• Đảm bảo độ ẩm đất 60-70%</p>
                <p>• Tránh tưới quá nhiều gây úng</p>
              </>
            )}
            {task.title === "Bón phân" && (
              <>
                <p>• Bón phân NPK theo liều lượng: 50kg/ha</p>
                <p>• Rải đều xung quanh gốc cây</p>
                <p>• Tưới nước sau khi bón phân</p>
                <p>• Chụp ảnh khu vực sau khi hoàn thành</p>
              </>
            )}
            {task.title === "Kiểm tra sâu bệnh" && (
              <>
                <p>• Kiểm tra lá, thân, rễ cây</p>
                <p>• Tìm dấu hiệu sâu đục thân, rệp</p>
                <p>• Chụp ảnh nếu phát hiện bất thường</p>
                <p>• Báo cáo ngay nếu có vấn đề</p>
              </>
            )}
          </div>
        </div>

        {/* Photo Requirement */}
        {task.requirePhoto && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">Yêu cầu chụp ảnh</p>
                <p className="text-sm text-yellow-800 mb-3">
                  Công việc này cần chụp ảnh để xác nhận hoàn thành
                </p>
                <button
                  onClick={() => setHasPhoto(!hasPhoto)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    hasPhoto
                      ? "bg-green-600 text-white"
                      : "bg-yellow-600 text-white hover:bg-yellow-700"
                  }`}
                >
                  {hasPhoto ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Đã chụp ảnh
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      Chụp ảnh ngay
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {status === "completed" ? (
            <div className="bg-green-100 border-2 border-green-600 rounded-xl p-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-900">Đã hoàn thành</p>
            </div>
          ) : (
            <>
              {/* Nút Bắt đầu: disable khi đã in-progress/completed */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className={`w-full py-4 rounded-xl text-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                  canStart
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-600 text-white opacity-50 cursor-not-allowed"
                }`}
              >
                <Play className="w-5 h-5" />
                Bắt đầu làm việc
              </button>

              {/* Nút Hoàn thành: disable khi chưa bắt đầu */}
              <button
                onClick={handleComplete}
                disabled={!canComplete}
                className={`w-full py-4 rounded-xl text-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                  canComplete
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-green-600 text-white opacity-50 cursor-not-allowed"
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Hoàn thành
              </button>
            </>
          )}

          {/* Nút Yêu cầu hỗ trợ */}
          <button
            onClick={() => navigate("/mobile/support")}
            className="w-full bg-white border-2 border-gray-300 text-gray-800 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <LifeBuoy className="w-5 h-5" />
            Yêu cầu hỗ trợ
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Xác nhận hoàn thành?
              </h3>
              <p className="text-gray-600">
                Bạn chắc chắn đã hoàn thành công việc "{task.title}"?
              </p>
            </div>
            {error && (
              <p className="mb-3 text-sm text-red-600 text-center">{error}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={confirmCompletion}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700"
              >
                Xác nhận
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-full bg-gray-200 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
