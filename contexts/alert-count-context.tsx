"use client";

import React, { createContext, useContext, useState } from "react";

type AlertCountContextType = {
  alertCount: number;
  setAlertCount: (count: number) => void;
};

const AlertCountContext = createContext<AlertCountContextType>({
  alertCount: 0,
  setAlertCount: () => {},
});

export function AlertCountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alertCount, setAlertCount] = useState(0);
  return (
    <AlertCountContext.Provider value={{ alertCount, setAlertCount }}>
      {children}
    </AlertCountContext.Provider>
  );
}

export const useAlertCount = () => useContext(AlertCountContext);
