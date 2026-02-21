import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <Navbar />
      <div className="flex min-h-[calc(100vh-65px)] flex-col">
        <Dashboard />
        <footer className="mt-auto border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-400">
          Ledger-driven. Privacy-first. Open-source.
        </footer>
      </div>
    </div>
  );
};

export default App;
