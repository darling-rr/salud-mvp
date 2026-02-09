import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">
        Evaluación preventiva de salud
      </h1>

      <p className="text-gray-600 max-w-md mb-6">
        Esta herramienta te ayudará a conocer tu perfil de riesgo preventivo
        mediante un breve cuestionario. No reemplaza evaluación médica.
      </p>

      <Link
        href="/quiz"
        className="bg-black text-white px-6 py-3 rounded-xl"
      >
        Comenzar evaluación
      </Link>
    </main>
  );
}
