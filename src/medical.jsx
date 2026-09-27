import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/*
  Non-destructive bridge:
  Your existing Medical Stores page is already at /medical-stores.
  This file does NOT recreate or change that page's layout/functionality.
  It only makes /medical open the existing page.
*/
export default function Medical() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/medical-stores", { replace: true });
  }, [navigate]);

  return null;
}
