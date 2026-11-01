"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, UserPlus } from "lucide-react";
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  // Banco sem nenhum usuário = sistema recém-instalado numa congregação nova.
  // Nesse caso a tela vira "criar o primeiro administrador".
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!error && count === 0) setPrimeiroAcesso(true);
      });
  }, []);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    const expiry = localStorage.getItem('loginExpiry');
    if (isAdmin === 'true' && expiry && Date.now() < parseInt(expiry, 10)) {
      router.push('/admin');
    }
  }, [router]);

  const entrar = (u: { nome: string; tipo: string }) => {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("userName", u.nome);
    localStorage.setItem("userRole", u.tipo);
    // Expira em 1 dia (24 horas)
    localStorage.setItem("loginExpiry", (Date.now() + 24 * 60 * 60 * 1000).toString());
    router.push("/admin");
  };

  const handleCriarAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !usuario.trim() || !senha) return alert("Preencha todos os campos!");

    setLoading(true);
    // Confere de novo na hora de gravar: se alguém já criou, não cria outro.
    const { count } = await supabase.from('usuarios').select('id', { count: 'exact', head: true });
    if (count !== 0) {
      setLoading(false);
      setPrimeiroAcesso(false);
      return alert("O administrador já foi criado. Faça login.");
    }

    const novo = { nome: nome.trim(), login: usuario.toLowerCase().trim(), senha, tipo: 'admin' };
    const { error } = await supabase.from('usuarios').insert([novo]);
    setLoading(false);

    if (error) return alert("Erro ao criar o administrador: " + error.message);
    entrar(novo);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !senha) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('login', usuario.toLowerCase().trim())
      .limit(1)
      .single();

    setLoading(false);

    if (data && data.senha === senha) {
      entrar(data);
    } else {
      alert("Usuário ou senha incorretos!");
    }
  };

  if (primeiroAcesso) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#0A4D3C]/10 text-[#0A4D3C] rounded-full flex items-center justify-center mb-6">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Primeiro acesso</h1>
          <p className="text-gray-500 text-sm text-center mb-8">O sistema ainda não tem nenhum usuário. Crie o administrador principal para começar.</p>

          <form onSubmit={handleCriarAdmin} className="w-full flex flex-col gap-3">
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-700"
            />
            <input
              type="text"
              placeholder="Usuário (para entrar)"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-700"
            />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-700"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A4D3C] hover:bg-[#083d2f] text-white font-bold rounded-xl px-4 py-3 transition-colors md:mt-2 shadow-sm disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar administrador'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-sm border border-gray-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#0A4D3C]/10 text-[#0A4D3C] rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
        <p className="text-gray-500 text-sm text-center mb-8">Faça login para gerenciar o sistema e realizar os bloqueios.</p>
        
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Usuário" 
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-700" 
          />
          <input 
            type="password" 
            placeholder="Senha de acesso" 
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-700" 
          />
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#0A4D3C] hover:bg-[#083d2f] text-white font-bold rounded-xl px-4 py-3 transition-colors md:mt-2 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Acessando...' : 'Entrar'}
          </button>
        </form>

        <Link href="/" className="mt-8 text-sm text-gray-400 hover:text-gray-600 font-medium">
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
}
