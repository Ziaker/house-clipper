<div align="center">

# 🏠 House Clipper

### O estúdio moderno para clipar trechos do YouTube sem baixar o vídeo inteiro e baixar vídeos completos do YouTube & Twitter (X).

[![Acessar no Navegador](https://img.shields.io/badge/🌐_Acessar_Online-GitHub_Pages-f59e0b?style=for-the-badge)](https://ziaker.github.io/house-clipper/)
[![Baixar para Windows](https://img.shields.io/badge/💻_Baixar_App_Windows-HouseClipper.exe-2563eb?style=for-the-badge)](https://github.com/Ziaker/house-clipper/raw/main/HouseClipper.exe)
[![Versão](https://img.shields.io/badge/Versão-v1.2.0-emerald?style=for-the-badge)](#)
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

## ✨ Recursos de Clipagem & Novas QoLs (v1.2.0)

1. **✂️ Clipagem Visual com Régua de Minutos & Balão Flutuante (Hover Time Bubble)**:
   - Divisões clicáveis de minuto a minuto (`00:00`, `01:00`, `02:00`...).
   - **Balão flutuante animado** e linha guia que acompanham o mouse na timeline mostrando o minuto e segundo exatos antes de você clicar.
   - Seletores diretos de minutos e segundos com ajuste fino (`-1s`, `-0.2s`, `+0.2s`, `+1s`).
   - Pré-visualização do corte em loop para você ter certeza antes de baixar.

2. **📱 Exportação Vertical 9:16 com Fundo Desfocado (Shorts / TikTok / Reels)**:
   - Converte vídeos 16:9 diretamente para o formato vertical de celular (1080x1920) com barras superior e inferior preenchidas com **blur suave de fundo**, pronto para postar nas redes sociais.

3. **🎞️ Gerador de GIF Animado Otimizado**:
   - Exporte trechos curtos de 2 a 10 segundos diretamente como `.GIF` leve e nítido para enviar no Discord, Telegram ou WhatsApp.

4. **🔊 Normalização de Áudio Inteligente (Loudness Equalizer)**:
   - Filtro FFmpeg `loudnorm` opcional com 1 clique que equilibra trechos muito baixos ou estourados para o padrão de transmissão EBU R128.

5. **💬 Embutir Legendas Automáticas no Clipe**:
   - Grava legendas diretamente no vídeo cortado.

6. **🏎️ Controle de Velocidade no Player**:
   - Botões rápidos (`1x`, `1.25x`, `1.5x`, `2x`) para acelerar vídeos longos e achar o momento exato em segundos.

7. **📐 Máscaras de Enquadramento Visual (Overlay 9:16 e 1:1)**:
   - Guias semitransparentes sobre o player para conferir se o enquadramento do corte vertical ou quadrado ficará centralizado.

8. **📦 Arrastar e Soltar Direto para Outros Apps (Drag & Drop)**:
   - Arraste os cards de clipes salvos no histórico diretamente para o Discord, Telegram, WhatsApp Web, Premiere ou pastas do Windows.

9. **🌙 Modo Noturno Amarelo Escuro (*Deep Night Amber*)**:
   - Alterne com 1 clique entre o tema **Âmbar Dourado** e o **Noturno Escuro** com amarelo mostarda fechado e fundo preto profundo para descanso visual.

10. **🍪 Suporte a Cookies (`cookies.json`)**:
    - Suporte a cookies em formato JSON para acessar vídeos com restrição de idade ou que exigem login.

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
