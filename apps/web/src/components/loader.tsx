export default function Loader() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 pt-8">
      <div className="flex gap-3">
        {["\u2660", "\u2665", "\u2666", "\u2663"].map((suit, i) => (
          <span
            key={suit}
            className="text-xl text-primary/40"
            style={{
              animation: `float 1.8s ease-in-out ${i * 0.2}s infinite`,
            }}
          >
            {suit}
          </span>
        ))}
      </div>
      <p className="ornate-label text-primary/40">Loading</p>
    </div>
  );
}
