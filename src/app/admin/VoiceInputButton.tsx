"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceInputButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setMessage("Este navegador não faz ditado. Use o Chrome ou o Edge, ou o microfone do teclado do celular.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text.trim()) onTextRef.current(text.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") setMessage("Permita o uso do microfone no navegador para ditar.");
      else if (event.error !== "no-speech" && event.error !== "aborted") setMessage("Não consegui ouvir direito. Tente de novo.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setMessage("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMessage("Não consegui iniciar o microfone. Tente de novo.");
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${listening ? "border-red-400 bg-red-500/20 text-red-200 animate-pulse" : "border-[var(--color-gold)] text-[var(--color-gold-light)] hover:bg-[var(--color-gold)]/10"}`}
      >
        {listening ? "⏹ Parar de ouvir" : "🎤 Falar em vez de digitar"}
      </button>
      {listening && <span className="text-xs text-[var(--color-gold-light)] opacity-70">Estou ouvindo… pode falar, o texto aparece aqui em cima.</span>}
      {message && <span className="text-xs text-red-300">{message}</span>}
    </div>
  );
}
