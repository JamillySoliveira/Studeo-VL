import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-slate-600">Página não encontrada</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
