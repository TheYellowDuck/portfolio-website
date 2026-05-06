import GameCanvas from "@/components/GameCanvas";

export default function Home() {
  return (
    <main style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#0f0f1a",
    }}>
      <GameCanvas />
    </main>
  );
}