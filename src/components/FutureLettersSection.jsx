import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Zap, Send, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import ProModal from "./ProModal";

const DAY_MS = 24 * 60 * 60 * 1000;
const LETTER_STORAGE_KEY = "dayclose_future_letters";
const LETTER_DELAYS = [7, 14, 30];
const MAX_FREE_LETTERS = 1;

const loadLetters = () => {
  try {
    const saved = localStorage.getItem(LETTER_STORAGE_KEY);
    const data = saved;
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export default function FutureLettersSection({ isPro }) {
  const { t } = useLanguage();
  const [letters, setLetters] = useState(() => loadLetters());
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState("");
  const [letterDelay, setLetterDelay] = useState(7);
  const [activeLetter, setActiveLetter] = useState(null);
  const [proModalOpen, setProModalOpen] = useState(false);

  const orderedLetters = useMemo(
    () => [...letters].sort((a, b) => a.openAt - b.openAt),
    [letters],
  );
  const now = Date.now();
  const readyLetters = orderedLetters.filter((l) => l.openAt <= now);
  const daysLeft = orderedLetters[0]
    ? Math.max(0, Math.ceil((orderedLetters[0].openAt - now) / DAY_MS))
    : null;

  const persistLetters = (next) => {
    setLetters(next);
    localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(next));
  };

  const handleOpenWriter = () => {
    if (!isPro && letters.length >= MAX_FREE_LETTERS) {
      setProModalOpen(true);
      return;
    }
    setIsLetterOpen(true);
  };

  const handleSaveLetter = () => {
    if (!letterText.trim()) return;
    const next = [
      ...letters,
      {
        id: `${Date.now()}`,
        message: letterText.trim(),
        openAt: Date.now() + letterDelay * DAY_MS,
      },
    ];
    persistLetters(next);
    setLetterText("");
    setIsLetterOpen(false);
  };

  const renderPortal = (node) => {
    if (typeof document === "undefined") return null;
    return createPortal(node, document.body);
  };

  return (
    <div className="bg-neutral-900/40 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
      <ProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            {t("more_letters_title")}
          </h2>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            {t("more_letters_desc")}
          </p>
        </div>
        {!isPro && letters.length >= MAX_FREE_LETTERS && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400">
            <Zap size={10} /> Pro
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-neutral-900/60 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
            <Clock size={12} />
            {orderedLetters[0] ? (
              readyLetters.length > 0 ? (
                <span className="text-emerald-400 font-black">
                  {t("more_letters_ready")}
                </span>
              ) : (
                <span>{daysLeft}d</span>
              )
            ) : (
              <span>{t("more_letters_empty")}</span>
            )}
          </div>

          <div className="flex gap-2">
            {readyLetters.length > 0 && (
              <button
                onClick={() => setActiveLetter(readyLetters[0])}
                className="text-[10px] font-black text-white bg-emerald-500 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
              >
                {t("more_letters_open")}
              </button>
            )}
            <button
              onClick={handleOpenWriter}
              className="text-[10px] font-black text-white bg-white/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 border border-white/5"
            >
              <Send size={10} /> {t("more_letters_action")}
            </button>
          </div>
        </div>

        {orderedLetters.length > 0 && (
          <div className="flex gap-1.5 px-1">
            {orderedLetters.map((l) => (
              <div
                key={l.id}
                className={`h-1 w-6 rounded-full transition-colors ${l.openAt <= now ? "bg-emerald-500" : "bg-neutral-800"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal escritor */}
      {isLetterOpen && renderPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsLetterOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-neutral-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold mb-1 text-base">
              {t("more_letters_modal_title")}
            </h3>
            <p className="text-[10px] text-neutral-500 uppercase font-black mb-4">
              {t("more_letters_modal_subtitle")}
            </p>

            <textarea
              autoFocus
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              className="w-full h-24 bg-black border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/20 mb-4 resize-none"
              placeholder={t("more_letters_placeholder")}
            />

            <div className="flex gap-2 mb-6">
              {LETTER_DELAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setLetterDelay(d)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${
                    letterDelay === d
                      ? "bg-white text-black border-white"
                      : "bg-neutral-800 text-neutral-400 border-white/5"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsLetterOpen(false)}
                className="flex-1 py-3 text-xs font-black text-neutral-500"
              >
                {t("more_letters_cancel")}
              </button>
              <button
                onClick={handleSaveLetter}
                className="flex-1 py-3 bg-white text-black text-xs font-black rounded-xl active:scale-95 transition-all"
              >
                {t("more_letters_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal carta abierta */}
      {activeLetter && renderPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActiveLetter(null)}
        >
          <div
            className="w-full max-w-xs bg-neutral-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-base mb-4">
              {t("more_letters_open_title")}
            </h3>
            <div className="bg-black p-4 rounded-xl text-sm text-neutral-300 italic mb-6 border border-white/5 whitespace-pre-wrap">
              "{activeLetter.message}"
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveLetter(null)}
                className="flex-1 py-3 text-xs font-black text-neutral-500 bg-neutral-800 rounded-xl"
              >
                {t("more_letters_close")}
              </button>
              <button
                onClick={() => {
                  persistLetters(letters.filter((l) => l.id !== activeLetter.id));
                  setActiveLetter(null);
                }}
                className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}