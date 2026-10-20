<div align="center">

# 🏠 House Clipper

### O estúdio moderno para clipar trechos do YouTube sem baixar o vídeo inteiro e baixar vídeos completos do YouTube & Twitter (X).

[![Acessar no Navegador](https://img.shields.io/badge/🌐_Acessar_Online-GitHub_Pages-f59e0b?style=for-the-badge)](https://ziaker.github.io/house-clipper/)
[![Baixar para Windows](https://img.shields.io/badge/💻_Baixar_App_Windows-HouseClipper.exe-2563eb?style=for-the-badge)](https://github.com/Ziaker/house-clipper/raw/main/HouseClipper.exe)
[![Versão](https://img.shields.io/badge/Versão-v1.1.0-emerald?style=for-the-badge)](#)
[![Licença Open Source](https://img.shields.io/badge/Código_Aberto-100%25_Auditável-green?style=for-the-badge)](#)

---

### 🔗 **Link de Acesso Direto (Web Pages):**
## 🌐 **[https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)**

*(Funciona em qualquer navegador, computador, celular ou tablet)*

---

</div>

## 🛡️ Segurança & Privacidade Garantida (100% Seguro)

O **House Clipper** foi desenvolvido seguindo as melhores práticas de transparência, privacidade e segurança. Qualquer pessoa pode usar com total tranquilidade:

- 🟢 **Código 100% Aberto e Auditável**: Todo o código-fonte (executável em C# `launcher.cs`, backend em Python e frontend em JS/HTML) está disponível abertamente neste repositório. Não há código oculto, binários ofuscados ou comportamento disfarçado.
- 🟢 **Zero Telemetria & Sem Coleta de Dados**: O aplicativo **não coleta, não rastreia e não envia** nenhum dado de uso, URLs pesquisadas, vídeos baixados ou informações pessoais para servidores de terceiros.
- 🟢 **Execução Segura em Localhost**: O servidor desktop local roda exclusivamente em `127.0.0.1` (localhost), garantindo que ninguém na sua rede Wi-Fi ou na internet possa acessar o seu aplicativo.
- 🟢 **Livre de Anúncios, Adware e Mineradores**: Interface 100% limpa, sem anúncios intrusivos, sem redirecionamentos suspeitos e sem scripts maliciosos.
- 🟢 **Privacidade dos seus Cookies**: O arquivo `cookies.json` é utilizado apenas localmente na sua máquina para comunicar com o YouTube/X. O repositório possui proteção no `.gitignore` para que nenhum dado ou histórico local de download seja compartilhado.
- 🟢 **Sandbox no Navegador**: Ao utilizar via GitHub Pages, o aplicativo roda sob a proteção e isolamento nativo de segurança (sandbox) do seu próprio navegador web via conexão criptografada HTTPS.

---

## ✨ Principais Funcionalidades

1. **✂️ Clipagem Visual com Régua de Minutos**:
   - Pule para qualquer minuto do vídeo com 1 clique na régua interativa (`00:00`, `01:00`, `02:00`...).
   - Seletores diretos de minutos e segundos com ajuste fino (`-1s`, `-0.2s`, `+0.2s`, `+1s`).
   - Botão **"Pegar Atual"** que captura o tempo em tempo real do player.
   - Pré-visualização do corte em loop para garantir que o corte ficou exato antes de salvar.

2. **⚡ Download Sob Demanda (Zero Desperdício de Disco)**:
   - Baixa exclusivamente os segundos selecionados via HTTP ranges com FFmpeg e yt-dlp, sem baixar o vídeo inteiro de centenas de megabytes.

3. **📥 Baixar Vídeos Completos (YouTube & Twitter / X)**:
   - Baixe qualquer vídeo do YouTube ou post com vídeo do Twitter (X) em resolução máxima ou extraia diretamente o áudio em MP3.

4. **🌙 Modo Noturno Amarelo Escuro (*Deep Night Amber*)**:
   - Alterne com 1 clique entre o tema **Âmbar Dourado** e o **Noturno Escuro** com amarelo atenuado e fundo preto profundo para descanso visual.

5. **🍪 Suporte a Cookies (`cookies.json`)**:
   - Cole seus cookies facilmente via interface ou no arquivo para acessar vídeos restritos por idade ou que exigem login.

---

## 🚀 Como Usar

### Opção 1: Direto pelo Navegador (Sem Instalação)
Basta abrir o link:
👉 **[https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)**

### Opção 2: Aplicativo Desktop no Windows
1. Baixe o executável: [**`HouseClipper.exe`**](https://github.com/Ziaker/house-clipper/raw/main/HouseClipper.exe)
2. Coloque na pasta do projeto e dê dois cliques.
3. O aplicativo abre instantaneamente em modo janela nativa moderna com aceleração por hardware e auto-atualização contínua.

*(Ou execute via terminal com `python main.py` ou clicando em `iniciar_house_clipper.bat`)*

---

## 🛠️ Tecnologias Utilizadas
- **Frontend**: HTML5, Tailwind CSS, Lucide Icons, YouTube IFrame Player API.
- **Backend**: Python 3, FastAPI, Uvicorn, yt-dlp, FFmpeg.
- **Desktop Launcher**: C# (.NET nativo do Windows), PyWebView / Edge WebView2.
- **Hospedagem Web**: GitHub Pages & GitHub Actions.
