interface FreezeDialogProps {
  habitName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FreezeDialog({ habitName, onConfirm, onCancel }: FreezeDialogProps) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl, 1.25rem)",
          padding: 24,
          maxWidth: 360,
          width: "100%",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
          Protect your streak?
        </h3>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 8, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
          Use a freeze to keep your "{habitName}" streak alive for one day. You can miss a day without losing momentum.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          <button
            onClick={onConfirm}
            style={{
              width: "100%",
              height: 40,
              borderRadius: "var(--radius-lg, 0.75rem)",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Use a freeze
          </button>
          <button
            onClick={onCancel}
            style={{
              width: "100%",
              height: 40,
              borderRadius: "var(--radius-lg, 0.75rem)",
              background: "transparent",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Let it reset
          </button>
        </div>
      </div>
    </div>
  );
}
