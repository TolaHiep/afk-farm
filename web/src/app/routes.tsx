import { createBrowserRouter } from "react-router";
import { AdminLayout } from "./components/layouts/AdminLayout";
import { MobileLayout } from "./components/layouts/MobileLayout";
import { AdminLogin } from "./components/admin/AdminLogin";
import { Dashboard } from "./components/admin/Dashboard";
import { HeatMap } from "./components/admin/HeatMap";
import { ZoneManagement } from "./components/admin/ZoneManagement";
import { PlotForm } from "./components/admin/PlotForm";
import { TeamManagement } from "./components/admin/TeamManagement";
import { ProcessManagement } from "./components/admin/ProcessManagement";
import { CropCycleManagement } from "./components/admin/CropCycleManagement";
import { WorkCalendar } from "./components/admin/WorkCalendar";
import { TeamLeaderKPI } from "./components/admin/TeamLeaderKPI";
import { Notifications } from "./components/admin/Notifications";
import { AnomalyDetail } from "./components/admin/AnomalyDetail";
import { MobileLogin } from "./components/mobile/MobileLogin";
import { TodayTasks } from "./components/mobile/TodayTasks";
import { UpcomingTasks } from "./components/mobile/UpcomingTasks";
import { TaskDetail } from "./components/mobile/TaskDetail";
import { DailyReport } from "./components/mobile/DailyReport";
import { ReportSuccess } from "./components/mobile/ReportSuccess";
import { OfflineSync } from "./components/mobile/OfflineSync";
import { MobileNotifications } from "./components/mobile/MobileNotifications";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminLogin />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "heatmap", element: <HeatMap /> },
      { path: "zones", element: <ZoneManagement /> },
      { path: "zones/add", element: <PlotForm /> },
      { path: "zones/edit/:id", element: <PlotForm /> },
      { path: "teams", element: <TeamManagement /> },
      { path: "processes", element: <ProcessManagement /> },
      { path: "crop-cycles", element: <CropCycleManagement /> },
      { path: "calendar", element: <WorkCalendar /> },
      { path: "kpi", element: <TeamLeaderKPI /> },
      { path: "notifications", element: <Notifications /> },
      { path: "anomaly/:id", element: <AnomalyDetail /> },
    ],
  },
  {
    path: "/mobile",
    element: <MobileLayout />,
    children: [
      { index: true, element: <TodayTasks /> },
      { path: "tasks", element: <TodayTasks /> },
      { path: "upcoming", element: <UpcomingTasks /> },
      { path: "task/:id", element: <TaskDetail /> },
      { path: "report", element: <DailyReport /> },
      { path: "success", element: <ReportSuccess /> },
      { path: "offline", element: <OfflineSync /> },
      { path: "notifications", element: <MobileNotifications /> },
    ],
  },
  {
    path: "/mobile/login",
    element: <MobileLogin />,
  },
]);
