import React, { useState, useEffect } from "react";
import InteractiveApp from "./components/InteractiveApp";
import { DeviceSimulator } from "./components/DeviceSimulator";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_mode");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    // Listen for storage changes to keep simulator synced
    const handleStorageChange = () => {
      const saved = localStorage.getItem("theme_mode");
      if (saved !== null) {
        setDarkMode(saved === "dark");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Also set up a custom event listener for internal changes
    window.addEventListener("theme_mode_changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("theme_mode_changed", handleStorageChange);
    };
  }, []);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIos, setIsIos] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      // Sense if screen is mobile-sized or runs on touch agent
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isSmallViewport = window.innerWidth <= 640;
      setIsMobileDevice(isMobileUA || isSmallViewport);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);



  return (
    <div 
      className="w-full bg-[#030712] text-slate-100 flex flex-col items-center justify-center antialiased font-sans overflow-hidden relative"
      style={{ height: `${viewportHeight}px` }}
    >
      {isMobileDevice ? (
        <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
          <InteractiveApp darkMode={darkMode} />
        </div>
      ) : (
        <DeviceSimulator isIos={isIos} setIsIos={setIsIos} darkMode={darkMode}>
          <div className="w-full h-full relative overflow-hidden bg-slate-950">
            <InteractiveApp darkMode={darkMode} />
          </div>
        </DeviceSimulator>
      )}
    </div>
  );
}


