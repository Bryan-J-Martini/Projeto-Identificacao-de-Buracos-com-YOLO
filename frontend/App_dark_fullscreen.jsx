import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Video,
  Server,
  Download,
  Trash2,
  Wand2,
  Radar,
  CheckCircle2,
  AlertCircle,
  Gauge,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function FileMeta({ file }) {
  if (!file) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
        Nenhum arquivo selecionado.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-black/10">
      <div className="font-medium text-slate-100 truncate">{file.name}</div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
        <span>{formatBytes(file.size)}</span>
        <span>•</span>
        <span>{file.type || "tipo desconhecido"}</span>
      </div>
    </div>
  );
}

function useObjectUrl(fileOrBlob) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!fileOrBlob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(fileOrBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [fileOrBlob]);

  return url;
}

export default function App() {
  const [tab, setTab] = useState("image");
  const [conf, setConf] = useState(0.25);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [health, setHealth] = useState(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultKind, setResultKind] = useState(null); // image | video

  const abortRef = useRef(null);

  const previewUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(resultBlob);
  const accept = useMemo(() => (tab === "image" ? "image/*" : "video/*"), [tab]);

  useEffect(() => {
    setFile(null);
    setResultBlob(null);
    setResultKind(null);
    setError("");
    setInfo("");
  }, [tab]);

  async function pingHealth() {
    setHealthBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/health`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setHealth(json);
      setInfo("API online e respondendo.");
    } catch (e) {
      setHealth(null);
      setError(
        "Não consegui acessar a API. Verifique se o backend está rodando (uvicorn api:app --reload) e se o CORS está liberado."
      );
    } finally {
      setHealthBusy(false);
    }
  }

  async function runPredict() {
    if (!file) {
      setError("Selecione um arquivo primeiro.");
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");
    setResultBlob(null);
    setResultKind(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("conf", String(conf));

      const endpoint = tab === "image" ? "/predict/image" : "/predict/video";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `Falha no processamento (HTTP ${res.status}).`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      setResultBlob(blob);
      setResultKind(tab);
      setInfo("Processamento concluído! Veja o resultado abaixo.");
    } catch (e) {
      if (e?.name === "AbortError") {
        setInfo("Processamento cancelado.");
      } else {
        setError(e?.message || "Erro inesperado ao processar.");
      }
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    if (abortRef.current) abortRef.current.abort();
  }

  function clearAll() {
    setFile(null);
    setResultBlob(null);
    setResultKind(null);
    setError("");
    setInfo("");
  }

  function downloadResult() {
    if (!resultBlob || !resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultKind === "video" ? "resultado.mp4" : "resultado.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_bottom_center,_rgba(16,185,129,0.10),_transparent_24%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="mb-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-md lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-300 hover:bg-cyan-500/10">
                  Visão computacional
                </Badge>
                <Badge className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-violet-300 hover:bg-violet-500/10">
                  Segmentação YOLO
                </Badge>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                YOLO Segmentação — Buracos na Rua
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Interface renovada em modo escuro, com layout mais limpo, organizado e ocupando toda a tela do navegador para envio
                de imagens e vídeos ao backend FastAPI + Ultralytics.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 sm:text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <span>API: {API_BASE}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <span>Conf padrão: {conf.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <Button
                onClick={pingHealth}
                variant="outline"
                className="rounded-2xl border-slate-700 bg-slate-950/70 text-slate-100 hover:bg-slate-800"
                disabled={healthBusy}
              >
                {healthBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                Testar API
              </Button>

              <Badge
                className={`rounded-full px-4 py-1.5 text-sm ${
                  health
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                {health ? "API online" : "API desconhecida"}
              </Badge>
            </div>
          </div>

          {(error || info) && (
            <Alert
              className={`mt-5 rounded-2xl border ${
                error
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertTitle>{error ? "Atenção" : "Status"}</AlertTitle>
              <AlertDescription>
                <div>{error || info}</div>
                {health && !error && <div className="mt-2 text-xs text-slate-300">Modelo: {health.model}</div>}
              </AlertDescription>
            </Alert>
          )}
        </header>

        <main className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="col-span-1 flex min-h-[680px] flex-col rounded-3xl border border-slate-800/80 bg-slate-900/70 shadow-2xl shadow-black/20 backdrop-blur md:min-h-[760px] xl:col-span-5">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl text-white">Entrada</CardTitle>
                  <CardDescription className="mt-1 text-slate-400">
                    Selecione um arquivo, ajuste a confiança e envie para o modelo.
                  </CardDescription>
                </div>

                <Button
                  variant="ghost"
                  onClick={clearAll}
                  className="rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-5">
              <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
                  <TabsTrigger
                    value="image"
                    className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Imagem
                  </TabsTrigger>
                  <TabsTrigger
                    value="video"
                    className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Vídeo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="mt-5 flex flex-1 flex-col gap-5 data-[state=inactive]:hidden">
                  <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Upload className="h-4 w-4 text-cyan-400" />
                        Selecionar imagem
                      </div>

                      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Pré-visualização da imagem enviada"
                            className="max-h-[320px] w-full rounded-2xl object-contain"
                          />
                        ) : (
                          <>
                            <div className="mb-4 rounded-full border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-300">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                            <p className="text-base font-medium text-slate-200">Nenhuma imagem selecionada</p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                              Escolha um arquivo para ver a pré-visualização e enviar para a segmentação.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                      <div>
                        <Label htmlFor="image-input" className="mb-2 block text-sm font-medium text-slate-300">
                          Arquivo de imagem
                        </Label>
                        <Input
                          id="image-input"
                          type="file"
                          accept={accept}
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="rounded-2xl border-slate-700 bg-slate-900 text-slate-200 file:text-slate-200"
                          disabled={busy}
                        />
                      </div>

                      <FileMeta file={file} />

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                        Use imagens nítidas e com boa iluminação para melhorar a qualidade da segmentação.
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="video" className="mt-5 flex flex-1 flex-col gap-5 data-[state=inactive]:hidden">
                  <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Upload className="h-4 w-4 text-violet-400" />
                        Selecionar vídeo
                      </div>

                      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                        {previewUrl ? (
                          <video src={previewUrl} controls className="max-h-[320px] w-full rounded-2xl object-contain" />
                        ) : (
                          <>
                            <div className="mb-4 rounded-full border border-violet-500/20 bg-violet-500/10 p-4 text-violet-300">
                              <Video className="h-8 w-8" />
                            </div>
                            <p className="text-base font-medium text-slate-200">Nenhum vídeo selecionado</p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                              Faça upload do vídeo para pré-visualizar e enviar ao processamento.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                      <div>
                        <Label htmlFor="video-input" className="mb-2 block text-sm font-medium text-slate-300">
                          Arquivo de vídeo
                        </Label>
                        <Input
                          id="video-input"
                          type="file"
                          accept={accept}
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="rounded-2xl border-slate-700 bg-slate-900 text-slate-200 file:text-slate-200"
                          disabled={busy}
                        />
                      </div>

                      <FileMeta file={file} />

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                        Vídeos longos podem demorar mais no backend, especialmente usando CPU.
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Confiança (conf)</div>
                    <p className="mt-1 text-sm text-slate-400">
                      Ajuste a sensibilidade do modelo para reduzir falsos positivos ou recuperar mais detecções.
                    </p>
                  </div>
                  <Badge className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-300 hover:bg-cyan-500/10">
                    {conf.toFixed(2)}
                  </Badge>
                </div>

                <Slider
                  value={[conf]}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  onValueChange={(v) => setConf(v[0])}
                  className="mt-5"
                />
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-3">
                <Button
                  onClick={runPredict}
                  disabled={busy || !file}
                  className="rounded-2xl bg-cyan-500 px-6 text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {busy ? "Processando..." : "Processar"}
                </Button>

                <Button
                  variant="outline"
                  onClick={cancel}
                  disabled={!busy}
                  className="rounded-2xl border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
                Este front-end espera uma API com os endpoints <span className="font-mono text-slate-300">POST /predict/image</span> e
                <span className="font-mono text-slate-300"> POST /predict/video</span>.
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 flex min-h-[680px] flex-col rounded-3xl border border-slate-800/80 bg-slate-900/70 shadow-2xl shadow-black/20 backdrop-blur md:min-h-[760px] xl:col-span-7">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl text-white">Resultado</CardTitle>
                  <CardDescription className="mt-1 text-slate-400">
                    Visualize o arquivo processado com as máscaras de segmentação.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  onClick={downloadResult}
                  disabled={!resultBlob}
                  className="rounded-2xl border-slate-700 bg-slate-950/70 text-slate-100 hover:bg-slate-800 disabled:text-slate-500"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-5">
              <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-4 text-sm font-medium text-slate-300">Visualização</div>

                <div className="flex h-full min-h-[430px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  {!resultUrl ? (
                    <div className="max-w-md text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-300">
                        <Upload className="h-7 w-7" />
                      </div>
                      <p className="text-lg font-medium text-slate-200">Nenhum resultado ainda</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Envie um arquivo e clique em <span className="font-medium text-slate-300">Processar</span> para exibir a saída do modelo.
                      </p>
                    </div>
                  ) : resultKind === "video" ? (
                    <video src={resultUrl} controls className="max-h-[70vh] w-full rounded-2xl object-contain" />
                  ) : (
                    <img src={resultUrl} alt="Resultado da segmentação" className="max-h-[70vh] w-full rounded-2xl object-contain" />
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                  <h3 className="mb-3 text-base font-semibold text-white">Dicas rápidas</h3>
                  <ul className="space-y-3 text-sm leading-6 text-slate-400">
                    <li>• Se o modelo estiver “marcando demais”, aumente o conf para 0.35–0.50.</li>
                    <li>• Se estiver perdendo buracos pequenos, reduza o conf para 0.10–0.20.</li>
                    <li>• Para vídeo, o processamento pode ser mais demorado. Aguarde o retorno.</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                  <h3 className="mb-3 text-base font-semibold text-white">Publicação</h3>
                  <p className="text-sm leading-6 text-slate-400">
                    Quando for colocar em produção, ajuste o <span className="font-mono text-slate-300">allow_origins</span> no backend para o domínio do seu front.
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
                    Layout otimizado para desktop, mas responsivo para telas menores.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
