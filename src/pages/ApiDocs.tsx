
import React, { useState } from 'react';
import {
    Book,
    ChevronRight,
    Terminal,
    Copy,
    Check,
    Server,
    Shield,
    Truck,
    MapPin,
    Menu
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Components ---

const CodeBlock = ({ code, language = 'json' }: { code: string, language?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-lg overflow-hidden border border-border bg-[#0f172a] text-slate-50 my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-slate-700">
                <span className="text-xs font-mono text-slate-400">{language}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-white"
                    onClick={handleCopy}
                >
                    {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </Button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

const Endpoint = ({ method, path, title }: { method: string, path: string, title?: string }) => {
    const colors = {
        GET: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        POST: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        PATCH: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
        DELETE: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };

    return (
        <div className="my-6">
            {title && <h4 className="text-base font-medium mb-2">{title}</h4>}
            <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30 font-mono text-sm">
                <span className={`px-2 py-0.5 rounded textxs font-bold border ${colors[method as keyof typeof colors]}`}>
                    {method}
                </span>
                <span className="text-muted-foreground">{path}</span>
            </div>
        </div>
    );
};

// --- Page Content ---

const ApiDocs = () => {
    const [activeSection, setActiveSection] = useState('intro');

    const scrollTo = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar Navigation */}
            <div className="hidden border-r bg-muted/10 md:block w-64 fixed h-full top-0 left-0 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <Book className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-lg">GMX Docs</span>
                    </div>

                    <nav className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">Geral</p>
                        <NavButton isActive={activeSection === 'intro'} onClick={() => scrollTo('intro')}>Introdução</NavButton>
                        <NavButton isActive={activeSection === 'auth'} onClick={() => scrollTo('auth')}>Autenticação</NavButton>

                        <p className="text-xs font-semibold text-muted-foreground px-2 mt-6 mb-2 uppercase tracking-wider">Motoristas</p>
                        <NavButton isActive={activeSection === 'create-driver'} onClick={() => scrollTo('create-driver')}>Criar Motorista</NavButton>
                        <NavButton isActive={activeSection === 'search-driver'} onClick={() => scrollTo('search-driver')}>Buscar Motorista</NavButton>

                        <p className="text-xs font-semibold text-muted-foreground px-2 mt-6 mb-2 uppercase tracking-wider">Disponibilidade</p>
                        <NavButton isActive={activeSection === 'add-availability'} onClick={() => scrollTo('add-availability')}>Lançar Disponibilidade</NavButton>
                        <NavButton isActive={activeSection === 'update-availability'} onClick={() => scrollTo('update-availability')}>Atualizar Status</NavButton>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8 lg:p-12 max-w-5xl mx-auto">

                {/* Intro */}
                <section id="intro" className="mb-16">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Documentação da API</h1>
                        <p className="text-xl text-muted-foreground">
                            Guia completo para integração com o sistema GMX Frete Sync. Gerencie motoristas, frotas e disponibilidade logística.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <Badge variant="outline" className="text-sm py-1 px-3">v1.0.0</Badge>
                            <Badge variant="secondary" className="text-sm py-1 px-3">Base URL: http://91.99.137.101:8057</Badge>
                        </div>
                    </div>
                </section>

                <Separator className="my-8" />

                {/* Auth */}
                <section id="auth" className="mb-20 scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="h-8 w-8 text-blue-600" />
                        <h2 className="text-3xl font-bold">Autenticação</h2>
                    </div>
                    <p className="text-muted-foreground leading-7">
                        Todas as requisições de escrita (POST, PATCH, DELETE) exigem um token de acesso Bearer enviado no cabeçalho.
                    </p>

                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Header Obrigatório</h3>
                        <CodeBlock code="Authorization: Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah" language="http" />
                    </div>
                </section>

                {/* Create Driver */}
                <section id="create-driver" className="mb-20 scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <Truck className="h-8 w-8 text-indigo-600" />
                        <h2 className="text-3xl font-bold">Criar Motorista</h2>
                    </div>
                    <p className="text-muted-foreground leading-7 mb-6">
                        Cadastre um motorista completo, incluindo veículos (carretas), documentos (CNH, ANTT) e até a disponibilidade inicial em uma única requisição.
                    </p>

                    <Endpoint method="POST" path="/items/cadastro_motorista" title="Cadastro Unificado" />

                    <div className="grid lg:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-semibold mb-2">Highlights</h4>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Use o campo <code>dados_disponibilidade</code> para já criar o motorista como "Disponível".</li>
                                <li>Envie arrays para <code>carreta1</code>, <code>carreta2</code> etc.</li>
                                <li>Campos de data devem ser <code>YYYY-MM-DD</code>.</li>
                            </ul>
                        </div>
                        <div>
                            <CodeBlock code={`{
  "status": "published",
  "nome": "JOÃO SILVA",
  "sobrenome": "PEREIRA",
  "telefone": "5511999999999",
  "forma_pagamento": "pix",

  "carreta1": [
      {
          "placa": "ABC-1234",
          "modelo": "GRANELEIRA",
          "cap": "30 TON"
      }
  ],

  "dados_disponibilidade": [
      {
          "status": "disponivel",
          "localizacao_atual": "São Paulo - SP",
          "observacao": "Criado via API"
      }
  ]
}`} />
                        </div>
                    </div>
                </section>

                {/* Search Driver */}
                <section id="search-driver" className="mb-20 scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <Server className="h-8 w-8 text-emerald-600" />
                        <h2 className="text-3xl font-bold">Buscar Motorista</h2>
                    </div>
                    <p className="text-muted-foreground leading-7 mb-4">
                        Encontre o ID de um motorista usando filtros como telefone ou CPF.
                    </p>

                    <Endpoint method="GET" path="/items/cadastro_motorista" />

                    <h4 className="font-semibold mt-6 mb-2">Exemplo: Buscar por Telefone</h4>
                    <CodeBlock language="bash" code="GET /items/cadastro_motorista?filter[telefone][_eq]=5511999999999" />
                </section>

                {/* Add Availability */}
                <section id="add-availability" className="mb-20 scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <MapPin className="h-8 w-8 text-orange-600" />
                        <h2 className="text-3xl font-bold">Lançar Disponibilidade</h2>
                    </div>
                    <p className="text-muted-foreground leading-7 mb-4">
                        Quando o motorista muda de cidade, você deve criar um <strong>novo registro</strong> para manter o histórico de posições.
                    </p>

                    <Endpoint method="POST" path="/items/disponivel" />

                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Body</h4>
                        <CodeBlock code={`{
  "status": "disponivel",
  "motorista_id": 15,
  "localizacao_atual": "Rio de Janeiro - RJ",
  "observacao": "Chegou vazio, pronto para carga."
}`} />
                    </div>
                </section>

                {/* Update Availability */}
                <section id="update-availability" className="mb-20 scroll-mt-20">
                    <div className="flex items-center gap-3 mb-6">
                        <Check className="h-8 w-8 text-purple-600" />
                        <h2 className="text-3xl font-bold">Atualizar Status</h2>
                    </div>
                    <p className="text-muted-foreground leading-7 mb-4">
                        Use para baixar o motorista (torná-lo indisponível) quando ele aceitar uma carga ou sair de serviço.
                    </p>

                    <Endpoint method="PATCH" path="/items/disponivel/:id" />

                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Body</h4>
                        <CodeBlock code={`{
  "status": "indisponivel",
  "observacao": "Carregado para Bahia"
}`} />
                    </div>
                </section>

                <footer className="border-t pt-10 pb-20 text-center text-muted-foreground text-sm">
                    <p>GMX Frete Sync API Documentation &copy; {new Date().getFullYear()}</p>
                </footer>

            </main>
        </div>
    );
};

// Simple Nav Helper
const NavButton = ({ children, isActive, onClick }: { children: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
    >
        {children}
    </button>
);

export default ApiDocs;
