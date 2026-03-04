"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "akqaretro_voter_id";

function getVoterIdSync(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Returns a stable voter/creator id (same for session). Use in client components. */
export function getVoterId(): string {
  return getVoterIdSync();
}

/** Hook: stable voter id after mount, avoids reading localStorage on every render. */
export function useVoterId(): string {
  const [id, setId] = useState("");
  useEffect(() => {
    setId(getVoterIdSync());
  }, []);
  return id;
}
