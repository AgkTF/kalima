import { Navigate, Route, Routes } from "react-router-dom";
import { BottomTabBar } from "./components/BottomTabBar";
import { CaptureScreen } from "./screens/CaptureScreen/CaptureScreen";
import { PrototypeOneOffFlow } from "./screens/PrototypeOneOffFlow";
import { ReviewScreen } from "./screens/ReviewScreen";
import { WordBankScreen } from "./screens/WordBankScreen";

export function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-page font-ui text-ink">
      <Routes>
        <Route path="/" element={<Navigate to="/capture" replace />} />
        <Route path="/capture" element={<CaptureScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/wordbank" element={<WordBankScreen />} />
        <Route
          path="/prototype/one-off-flow"
          element={<PrototypeOneOffFlow />}
        />
      </Routes>
      <BottomTabBar />
    </div>
  );
}
