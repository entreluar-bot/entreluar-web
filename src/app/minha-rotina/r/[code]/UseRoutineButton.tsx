"use client";

import { useRouter } from "next/navigation";
import { saveRoutine, type Routine } from "@/lib/routine";

export default function UseRoutineButton({ routine }: { routine: Routine }) {
  const router = useRouter();

  const clone = () => {
    saveRoutine(routine);
    router.push("/minha-rotina");
  };

  return (
    <button type="button" onClick={clone} className="luxe-button">
      ✨ Usar esta rotina também
    </button>
  );
}
