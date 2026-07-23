import { useState, useEffect, useRef }  from "react";
import { WORDS } from "./words";

const KEYBOARD = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

const VALID_WORDS = new Set(WORDS.map(w => w.toUpperCase()));

function pickWord() {
  const list = [...VALID_WORDS];
  return list[Math.floor(Math.random() * list.length)];
}

function scoreGuess(guess, answer) {
  const result = Array(5).fill("absent");
  const pool = answer.split("");
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) { result[i] = "correct"; pool[i] = null; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const j = pool.indexOf(guess[i]);
    if (j > -1) { result[i] = "present"; pool[j] = null; }
  }
  return result;
}

const COLORS = {
  correct: "#538d4e",
  present: "#b59f3b",
  absent:  "#3a3a3c",
  empty:   "transparent",
};

// Brooklyn Nine-Nine themed win copy, keyed by number of guesses used.
const WIN_MESSAGES = {
  1: "Boom did it!",
  2: "Noice",
  3: "Bingpot!",
  4: "Nine-Nine!",
  5: "Cool cool cool cool cool, no doubt",
  6: "Vindication!",
};

const LOSE_MESSAGE = "Cool cool cool, this is bad, this is very bad";

const TILE_STAGGER = 250; // ms between each tile starting its flip
const FLIP_DURATION = 500; // ms for a single tile's flip animation
const REVEAL_TOTAL = TILE_STAGGER * 4 + FLIP_DURATION; // time for the whole row to finish

export default function Wordle() {
  const [answer, setAnswer] = useState(pickWord);
  const [guesses, setGuesses] = useState([]);        // array of { word, result }
  const [current, setCurrent] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("playing");   // "playing" | "won" | "lost"
  const [revealRow, setRevealRow] = useState(null);   // row index currently flipping
  const [bounceRow, setBounceRow] = useState(null);   // row index currently bouncing (win)
  const [shakeRow, setShakeRow] = useState(null);     // row index currently shaking (invalid)

  const msgTimeout = useRef(null);
  const revealTimeout = useRef(null);
  const shakeTimeout = useRef(null);
  const bounceTimeout = useRef(null);

  function clearTimers() {
    clearTimeout(msgTimeout.current);
    clearTimeout(revealTimeout.current);
    clearTimeout(shakeTimeout.current);
    clearTimeout(bounceTimeout.current);
  }

  useEffect(() => clearTimers, []);

  function newGame() {
    clearTimers();
    setAnswer(pickWord(answer));
    setGuesses([]);
    setCurrent("");
    setMsg("");
    setStatus("playing");
    setRevealRow(null);
    setBounceRow(null);
    setShakeRow(null);
  }

  function flash(text, duration = 2000) {
    clearTimeout(msgTimeout.current);
    setMsg(text);
    if (duration) {
      msgTimeout.current = setTimeout(() => setMsg(""), duration);
    }
  }

  function shake(row) {
    clearTimeout(shakeTimeout.current);
    setShakeRow(row);
    shakeTimeout.current = setTimeout(() => setShakeRow(null), 500);
  }

  function handleKey(key) {
    if (status !== "playing" || revealRow !== null) return; // block input mid-animation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (key === "⌫") { setCurrent(c => c.slice(0, -1)); return; }
    if (key === "ENTER") { submit(); return; }
    if (/^[A-Z]$/.test(key) && current.length < 5) setCurrent(c => c + key);
  }

  function submit() {
    const row = guesses.length;

    if (current.length < 5) {
      flash("Not enough letters");
      shake(row);
      return;
    }
    if (!VALID_WORDS.has(current)) {
      flash("Not in word list");
      shake(row);
      return;
    }

    const result = scoreGuess(current, answer);
    const newGuesses = [...guesses, { word: current, result }];
    const won = current === answer;
    setGuesses(newGuesses);
    setRevealRow(row);
    setCurrent("");

    revealTimeout.current = setTimeout(() => {
      setRevealRow(null);
      if (won) {
        setStatus("won");
        setBounceRow(row);
        bounceTimeout.current = setTimeout(() => setBounceRow(null), 1000);
        flash(WIN_MESSAGES[newGuesses.length] || "You got it!");
      } else if (newGuesses.length === 6) {
        setStatus("lost");
        flash(`${LOSE_MESSAGE} — it was ${answer}`, 0); // stays until New Game
      }
    }, REVEAL_TOTAL);
  }

  const handleKeyRef = useRef(handleKey);
  useEffect(() => { handleKeyRef.current = handleKey; });

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Backspace") handleKeyRef.current("⌫");
      else if (e.key === "Enter") handleKeyRef.current("ENTER");
      else if (/^[a-zA-Z]$/.test(e.key)) handleKeyRef.current(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // build key colour state from past guesses
  const keyState = {};
  const priority = { correct: 3, present: 2, absent: 1 };
  guesses.forEach(({ word, result }) => {
    word.split("").forEach((l, i) => {
      if ((priority[result[i]] || 0) > (priority[keyState[l]] || 0))
        keyState[l] = result[i];
    });
  });

  function shareResult() {
    const won = status === "won";
    const grid = guesses.map(({ result }) =>
      result.map(r => r === "correct" ? "🟩" : r === "present" ? "🟨" : "⬛").join("")
    ).join("\n");
    const text = `Wordle ${won ? guesses.length : "X"}/6\n\n${grid}`;
    navigator.clipboard.writeText(text);
    flash("Copied results to clipboard");
  }

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes flipTile {
          0%   { transform: rotateX(0deg); }
          45%  { transform: rotateX(90deg); background: var(--empty-bg); border-color: #999; color: #000; }
          55%  { transform: rotateX(90deg); background: var(--tile-bg); border-color: var(--tile-bg); color: #fff; }
          100% { transform: rotateX(0deg); background: var(--tile-bg); border-color: var(--tile-bg); color: #fff; }
        }
        @keyframes shakeRow {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        @keyframes bounceTile {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-18px); }
          50% { transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>WORDLE</h1>
        <button
          onClick={(e) => {
            newGame();
            e.currentTarget.blur();
          }}
          style={styles.newGameBtn}
          aria-label="Start a new game"
        >
          New Game
        </button>
      </div>

      {/* Board + toast */}
      <div style={styles.boardWrap}>
        {msg && <div style={styles.toast} role="status">{msg}</div>}

        <div style={styles.board}>
          {Array.from({ length: 6 }).map((_, row) => {
            const guess = guesses[row];
            const isActive = row === guesses.length && status === "playing" && revealRow === null;
            const isRevealing = row === revealRow;
            const isBouncing = row === bounceRow;
            const isShaking = row === shakeRow;

            return (
              <div
                key={row}
                style={{
                  ...styles.row,
                  animation: isShaking ? "shakeRow 0.5s" : undefined,
                }}
              >
                {Array.from({ length: 5 }).map((_, col) => {
                  const letter = guess ? guess.word[col] : isActive ? current[col] : "";
                  const state = guess ? guess.result[col] : "empty";
                  const tileBg = COLORS[state];

                  const tileStyle = {
                    ...styles.tile,
                    "--tile-bg": tileBg,
                    "--empty-bg": "transparent",
                  };

                  if (isRevealing) {
                    tileStyle.animation = `flipTile ${FLIP_DURATION}ms ease`;
                    tileStyle.animationDelay = `${col * TILE_STAGGER}ms`;
                    tileStyle.animationFillMode = "forwards";
                    tileStyle.background = "transparent";
                    tileStyle.color = "#000";
                    tileStyle.border = `2px solid ${letter ? "#999" : "#ddd"}`;
                  } else if (isBouncing) {
                    tileStyle.animation = "bounceTile 0.4s ease";
                    tileStyle.animationDelay = `${col * 80}ms`;
                    tileStyle.background = tileBg;
                    tileStyle.color = "#fff";
                    tileStyle.border = `2px solid ${tileBg}`;
                  } else {
                    tileStyle.background = tileBg;
                    tileStyle.color = state === "empty" ? "#000" : "#fff";
                    tileStyle.border = `2px solid ${state === "empty" ? (letter ? "#999" : "#ddd") : tileBg}`;
                  }

                  return <div key={col} style={tileStyle}>{letter}</div>;
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Share button */}
      {status !== "playing" && (
        <button onClick={shareResult} style={styles.shareBtn} aria-label="Share result">
          Share
        </button>
      )}

      {/* Keyboard */}
      <div style={styles.keyboard}>
        {KEYBOARD.map((row, i) => (
          <div key={i} style={styles.kbRow}>
            {row.map(key => {
              const state = keyState[key];
              const label = key === "⌫" ? "Backspace" : key === "ENTER" ? "Enter" : key;
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  aria-label={label}
                  style={{
                    ...styles.key,
                    ...(key.length > 1 ? styles.keyWide : {}),
                    background: state ? COLORS[state] : "#d3d6da",
                    color: state ? "#fff" : "#000",
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  app:      { display:"flex", flexDirection:"column", alignItems:"center", gap:"1rem",
              fontFamily:"sans-serif", padding:"2rem 1rem", maxWidth:480, margin:"0 auto" },
  header:   { display:"flex", alignItems:"center", justifyContent:"center", gap:16, position:"relative", width:"100%" },
  title:    { fontSize:28, fontWeight:700, letterSpacing:6, margin:0 },
  newGameBtn:{ position:"absolute", right:0, padding:"6px 12px", background:"#787c7e", color:"#fff",
              border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" },
  boardWrap:{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" },
  toast:    { position:"absolute", top:-46, left:"50%", transform:"translate(-50%, 0)",
              whiteSpace:"nowrap", fontSize:14, fontWeight:600, background:"#111", color:"#fff",
              padding:"8px 16px", borderRadius:6, zIndex:10, animation:"toastIn 0.15s ease-out",
              boxShadow:"0 2px 8px rgba(0,0,0,0.25)" },
  board:    { display:"flex", flexDirection:"column", gap:6 },
  row:      { display:"flex", gap:6 },
  tile:     { width:58, height:58, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, fontWeight:700, textTransform:"uppercase", borderRadius:4 },
  shareBtn: { padding:"10px 24px", background:"#538d4e", color:"#fff", border:"none",
              borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer" },
  keyboard: { display:"flex", flexDirection:"column", alignItems:"center", gap:6 },
  kbRow:    { display:"flex", gap:5 },
  key:      { height:56, minWidth:42, padding:"0 6px", border:"none", borderRadius:4,
              fontSize:13, fontWeight:700, cursor:"pointer", textTransform:"uppercase" },
  keyWide:  { minWidth:62, fontSize:11 },
};