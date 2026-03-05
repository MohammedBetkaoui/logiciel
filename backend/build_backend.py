# ─────────────────────────────────────────────────────────────────
# Script de compilation du backend Python en .exe autonome
# Utilise PyInstaller pour créer un exécutable standalone
# ─────────────────────────────────────────────────────────────────

import subprocess
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def build():
    """Compile server.py en un exécutable standalone avec PyInstaller."""

    # S'assurer que PyInstaller est installé
    try:
        import PyInstaller
    except ImportError:
        print("Installation de PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    server_path = os.path.join(SCRIPT_DIR, "server.py")
    dist_path = os.path.join(SCRIPT_DIR, "dist")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onedir",                     # Dossier avec tous les fichiers
        "--name", "bba-backend",        # Nom de l'exécutable
        "--distpath", dist_path,        # Dossier de sortie
        "--workpath", os.path.join(SCRIPT_DIR, "build_temp"),
        "--specpath", SCRIPT_DIR,
        "--noconfirm",                  # Écraser sans demander
        "--clean",                      # Nettoyer avant de build
        "--console",                    # Mode console (pour voir les logs)
        # Modules cachés nécessaires
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "uvicorn.lifespan.off",
        "--hidden-import", "uvicorn",
        "--hidden-import", "fastapi",
        "--hidden-import", "pydantic",
        "--hidden-import", "starlette",
        "--hidden-import", "anyio",
        "--hidden-import", "anyio._backends",
        "--hidden-import", "anyio._backends._asyncio",
        "--hidden-import", "sqlite3",
        "--hidden-import", "email.mime.multipart",
        "--hidden-import", "email.mime.text",
        # Collecter tous les sous-modules de ces packages
        "--collect-submodules", "uvicorn",
        "--collect-submodules", "fastapi",
        "--collect-submodules", "starlette",
        "--collect-submodules", "pydantic",
        "--collect-submodules", "anyio",
        # Chemin de recherche pour les modules locaux (database, clinical_engine, etc.)
        "--paths", SCRIPT_DIR,
        # Modules locaux du backend
        "--hidden-import", "database",
        "--hidden-import", "clinical_engine",
        "--hidden-import", "analytics_engine",
        "--hidden-import", "rgpd",
        server_path,
    ]

    print("=" * 60)
    print("Compilation du backend BBA-Data en .exe")
    print("=" * 60)
    print(f"Source: {server_path}")
    print(f"Sortie: {dist_path}")
    print()

    result = subprocess.run(cmd, cwd=SCRIPT_DIR)

    if result.returncode == 0:
        exe_path = os.path.join(dist_path, "bba-backend", "bba-backend.exe")
        print()
        print("=" * 60)
        print("BUILD RÉUSSI!")
        print(f"Exécutable: {exe_path}")
        print("=" * 60)
    else:
        print()
        print("ERREUR: La compilation a échoué.")
        sys.exit(1)


if __name__ == "__main__":
    build()
