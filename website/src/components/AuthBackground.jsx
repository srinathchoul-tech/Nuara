import SideRays from "./SideRays.jsx";

export default function AuthBackground({ children }) {
  return (
    <main className="app-shell">
      <div className="rays-layer" aria-hidden="true">
        <SideRays
          speed={3.2}
          rayColor1="#a855f7"
          rayColor2="#7f0aee"
          intensity={2.2}
          spread={1}
          origin="top-right"
          tilt={-13}
          saturation={2}
          blend={0.75}
          falloff={1.6}
          opacity={1}
        />
      </div>
      <div className="background-shade" aria-hidden="true" />
      {children}
    </main>
  );
}
