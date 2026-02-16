import React, { useState, useCallback } from 'react';
import {
  Play,
  Terminal,
  FileCode2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const scripts = [];

function StatusBadge({ status }) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: 'Succès',
      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    error: {
      icon: XCircle,
      label: 'Erreur',
      cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    },
    pending: {
      icon: Clock,
      label: 'En attente',
      cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
    },
  };

  const { icon: Icon, label, cls } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export default function Analysis() {
  const [runningScript, setRunningScript] = useState(null);
  const [output, setOutput] = useState('');

  const handleRunScript = useCallback(async (scriptId) => {
    setRunningScript(scriptId);
    setOutput(`> Exécution de ${scriptId}.py ...\n`);

    const api = window.electronAPI;
    if (api?.runScript) {
      const result = await api.runScript(scriptId);
      if (result.success) {
        setOutput((prev) => prev + `✔ Script terminé avec succès.\n${JSON.stringify(result.data, null, 2)}`);
      } else {
        setOutput((prev) => prev + `✘ Erreur: ${result.error}\n`);
      }
    } else {
      setOutput((prev) => prev + `✘ Backend non connecté. Lancez le serveur Python.\n`);
    }

    setRunningScript(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Analyse Python</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          Gérez et exécutez vos scripts d'analyse
        </p>
      </div>

      {/* ─── Scripts List ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 shrink-0">
                  <FileCode2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {script.name}
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {script.description}
                  </p>
                  {script.lastRun && (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2">
                      Dernière exécution : {script.lastRun}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={script.status} />
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                isLoading={runningScript === script.id}
                onClick={() => handleRunScript(script.id)}
              >
                {runningScript === script.id ? 'En cours...' : 'Lancer'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Console Output ────────────────────────────────── */}
      <Card title="Console de sortie" description="Résultat de l'exécution" icon={Terminal}>
        <div className="mt-2 bg-neutral-900 rounded-lg p-4 min-h-[160px] max-h-[300px] overflow-y-auto">
          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">
            {output || '$ En attente d\'exécution...'}
          </pre>
        </div>
      </Card>
    </div>
  );
}
